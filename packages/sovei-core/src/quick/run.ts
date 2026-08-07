import { createHash } from 'node:crypto';
import type { ContextPack } from '../context/builder.js';
import { buildContextPolicy, CONTEXT_POLICY_VERSION } from '../context/policy.js';
import type { Redline } from '../change-control/schemas.js';
import type { LoadedProjectRule } from '../rules/schemas.js';
import {
  createQuickRun,
  finishQuickRun,
  transitionQuickRun,
  type QuickRunInput,
  type QuickRunState,
} from './types.js';
import { UsageRecorder, unknownTokenUsage, type UsageRunEnd, type UsageRunStart, type UsageContextSelected } from './usage.js';
import { verifyGitChanges, type GitVerifyResult } from './git-verifier.js';
import type { StorageBackend } from '../storage/types.js';

export interface QuickEvaluationInput {
  workspaceRoot: string;
  storage: StorageBackend;
  request: QuickRunInput;
  contextPack: ContextPack;
  redlines: Redline[];
  projectRules: LoadedProjectRule[];
  baselineRevision?: string | null;
  runId?: string;
}

export interface QuickEvaluationResult {
  run: QuickRunState;
  policy: ReturnType<typeof buildContextPolicy>;
  git: GitVerifyResult | null;
  confirmation: string;
  report: string[];
}

function digestTarget(target: string): string {
  return createHash('sha256').update(target).digest('hex').slice(0, 16);
}

function runId(): string {
  return `quick-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function startEvent(run: QuickRunState): UsageRunStart {
  return {
    schemaVersion: 1,
    event: 'run-start',
    runId: run.runId,
    channel: 'quick',
    stage: 'capture',
    occurredAt: run.startedAt,
    policyVersion: CONTEXT_POLICY_VERSION,
    baselineRevision: run.baselineRevision,
    tokenUsage: unknownTokenUsage(),
    targetDigest: digestTarget(run.target),
  };
}

export async function evaluateQuickRun(input: QuickEvaluationInput): Promise<QuickEvaluationResult> {
  const recorder = new UsageRecorder(input.storage);
  const initial = createQuickRun(input.request, input.runId ?? runId(), {
    revision: input.baselineRevision ?? null,
    summary: 'baseline captured by QuickRun; source content is not stored in usage',
  });
  await recorder.append(startEvent(initial));

  const policy = buildContextPolicy(input.contextPack, input.redlines, input.projectRules, {
    paths: input.request.declaredPaths,
    symbols: input.request.declaredSymbols,
    baselineRevision: initial.baselineRevision,
  });
  await recorder.append({
    schemaVersion: 1,
    event: 'context-selected',
    runId: initial.runId,
    channel: 'quick',
    stage: 'check',
    occurredAt: new Date().toISOString(),
    policyVersion: policy.controlPlane.policyVersion,
    baselineRevision: initial.baselineRevision,
    tokenUsage: unknownTokenUsage(),
    counts: {
      required: policy.shadow.full.required.length,
      indexed: policy.shadow.indexOnDemand.indexed.length,
      expanded: policy.shadow.scoped.expanded.length,
      unloaded: policy.shadow.scoped.unloaded.length,
    },
    sizes: {
      requiredCharacters: policy.shadow.full.characters,
      indexedCharacters: policy.shadow.indexOnDemand.characters,
      expandedCharacters: policy.shadow.scoped.characters,
    },
    matchedRedlineIds: policy.controlPlane.matchedRedlineIds,
    candidateIds: policy.controlPlane.unloadedCandidateIds,
    decision: policy.controlPlane.selectionDecision,
    overBudget: policy.controlPlane.status === 'over-budget',
  } satisfies UsageContextSelected);

  let run = transitionQuickRun(initial, 'check', {
    riskLevel: policy.controlPlane.status === 'expanded' ? 'uncertain' : 'low',
    riskSignals: policy.controlPlane.status === 'expanded' ? ['context relevance requires expansion'] : [],
  }).state;
  const needsEscalation = !input.request.target.trim()
    || policy.controlPlane.status === 'escalated'
    || policy.controlPlane.status === 'expanded'
    || input.request.declaredPaths.length !== 1;

  if (needsEscalation) {
    run = finishQuickRun(run, 'escalated', {
      riskLevel: 'uncertain',
      riskSignals: [...run.riskSignals, 'manual confirmation required before implementation'],
    }).state;
    const report = ['Quick stopped before implementation.', '人工介入：目标范围或上下文相关性仍不确定。'];
    await appendEnd(recorder, run);
    return { run, policy, git: null, confirmation: '不会修改源码；请先确认范围或升级完整 Sovei。', report };
  }

  run = transitionQuickRun(run, 'confirm', {
    riskLevel: 'low',
    scopeDeclaration: `只修改：${input.request.declaredPaths.join(', ')}；不修改：${input.request.exclusions.join(', ') || '声明范围之外的任何文件'}`,
  }).state;
  const confirmation = `将修改：${input.request.target}。${run.scopeDeclaration}`;
  run = transitionQuickRun(run, 'implement').state;

  const git = await verifyGitChanges({
    workspaceRoot: input.workspaceRoot,
    baselineRevision: input.baselineRevision,
    declaredPaths: input.request.declaredPaths,
    exclusions: input.request.exclusions,
  });
  const verifyRisk = git.status !== 'verified'
    || git.outOfScopeFiles.length > 0
    || git.changedFiles.length === 0;
  const verifySignals = [
    ...(git.status !== 'verified' ? [git.status] : []),
    ...git.outOfScopeFiles.map((file) => `out-of-scope: ${file}`),
    ...(git.changedFiles.length === 0 ? ['no target diff found; implementation is not verified'] : []),
  ];
  run = transitionQuickRun(run, 'verify', {
    actualDiff: git.changedFiles,
    testsPassed: null,
    riskLevel: verifyRisk ? 'uncertain' : 'low',
    riskSignals: verifySignals,
    unverifiedItems: [
      ...(input.request.declaredTests.length ? [`declared tests not run by CLI: ${input.request.declaredTests.join(', ')}`] : []),
      ...(git.changedFiles.length === 0 ? ['no implementation diff was observed'] : []),
    ],
  }).state;
  const finalStatus = verifyRisk
    ? git.changedFiles.length === 0 && git.status === 'verified' && git.outOfScopeFiles.length === 0
      ? 'stopped'
      : 'escalated'
    : 'completed';
  run = finishQuickRun(run, finalStatus, {
    actualDiff: git.changedFiles,
    riskLevel: verifyRisk ? 'uncertain' : 'low',
    riskSignals: run.riskSignals,
    unverifiedItems: run.unverifiedItems,
  }).state;
  const report = verifyRisk
    ? [
      'Quick 未完成交付。',
      git.changedFiles.length === 0
        ? '尚未观察到目标文件的真实修改，停止交付；请先由 Agent 实施后再验证。'
        : '真实 Git diff 无法证明完全在声明范围内，需人工审查；未自动回退。',
    ]
    : ['Quick 检查完成，可交付候选。', '真实 Git diff 与声明范围一致；声明测试仍需由宿主执行并回报。'];
  await appendEnd(recorder, run, git);
  return { run, policy, git, confirmation, report };
}

async function appendEnd(recorder: UsageRecorder, run: QuickRunState, _git?: GitVerifyResult): Promise<void> {
  const event: UsageRunEnd = {
    schemaVersion: 1,
    event: 'run-end',
    runId: run.runId,
    channel: 'quick',
    stage: 'report',
    occurredAt: run.updatedAt,
    policyVersion: CONTEXT_POLICY_VERSION,
    baselineRevision: run.baselineRevision,
    tokenUsage: unknownTokenUsage(),
    status: run.status === 'pending' ? 'failed' : run.status,
    escalated: run.status === 'escalated',
    testsPassed: run.testsPassed,
    calls: 1,
    latencyMs: null,
  };
  await recorder.append(event);
}
