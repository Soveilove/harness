import { createHash } from 'node:crypto';
import type { ContextPack } from '../context/builder.js';
import {
  buildContextPolicy,
  CONTEXT_POLICY_VERSION,
  summarizeContextShadow,
  type ContextPolicyControlPlane,
  type ContextPolicyResult,
  type ContextIndexItem,
  type ContextShadowSummary,
} from '../context/policy.js';
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

/**
 * 精简版策略摘要——仅保留元数据，不含完整 ContextItem 正文。
 *
 * `controlPlane` 提供策略决策元信息（匹配的红线 ID、候选列表、状态等），
 * `shadowSummaries` 提供三个影子变体的统计度量（ID 列表 + 计数 + 字符数），
 * `index` 提供每条上下文项的 240 字符摘要索引。
 *
 * 完整的 `ContextPolicyResult`（含 `shadow.*.required: ContextItem[]` 全文 content）
 * 仅在 `evaluateQuickRun` 内部用于策略决策，不序列化到 `--json` 输出。
 */
export interface QuickPolicySummary {
  controlPlane: ContextPolicyControlPlane;
  shadowSummaries: {
    full: ContextShadowSummary;
    scoped: ContextShadowSummary;
    indexOnDemand: ContextShadowSummary;
  };
  index: ContextIndexItem[];
}

/** 从完整 ContextPolicyResult 提取精简摘要，剥离所有 ContextItem.content */
function summarizePolicy(policy: ContextPolicyResult): QuickPolicySummary {
  return {
    controlPlane: policy.controlPlane,
    shadowSummaries: {
      full: summarizeContextShadow(policy.shadow.full),
      scoped: summarizeContextShadow(policy.shadow.scoped),
      indexOnDemand: summarizeContextShadow(policy.shadow.indexOnDemand),
    },
    index: policy.index,
  };
}

export interface QuickEvaluationResult {
  run: QuickRunState;
  policy: QuickPolicySummary;
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
  // 按 actual 模式过滤 required——scoped 时只交付命中项 + 全局不变量
  if (policy.actualRequired && policy.actualRequired.length < input.contextPack.required.length) {
    input.contextPack.required = policy.actualRequired;
  }
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
      required: policy.actualRequired.length,
      indexed: policy.shadow.indexOnDemand.indexed.length,
      expanded: policy.shadow.scoped.expanded.length,
      unloaded: policy.shadow.scoped.unloaded.length,
    },
    sizes: {
      requiredCharacters: policy.shadow.actual === 'scoped' ? policy.shadow.scoped.characters : policy.shadow.full.characters,
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

  // ── 硬性 escalation：只有真正无法继续的情况才阻塞 ──
  // status='expanded'（相关性不确定）降级为警告，不再阻塞流程
  const hardEscalation = !input.request.target.trim()
    || policy.controlPlane.status === 'escalated'
    || input.request.declaredPaths.length === 0;

  if (hardEscalation) {
    run = finishQuickRun(run, 'escalated', {
      riskLevel: 'uncertain',
      riskSignals: [...run.riskSignals, 'manual confirmation required before implementation'],
    }).state;
    const report = ['Quick stopped before implementation.', '人工介入：目标范围或上下文相关性仍不确定。'];
    if (!input.baselineRevision) {
      report.push('冷启动提示：当前仓库无基线 commit，建议先创建初始 commit（git add && git commit）以启用 diff 范围验证。');
    }
    await appendEnd(recorder, run);
    return { run, policy: summarizePolicy(policy), git: null, confirmation: '不会修改源码；请先确认范围或升级完整 Sovei。', report };
  }

  // ── expanded 降级为警告，不影响流程 ──
  const contextWarning = policy.controlPlane.status === 'expanded'
    ? '⚠️ 上下文相关性不确定：部分红线和规则未命中声明路径，请人工确认上下文完整性。'
    : null;

  run = transitionQuickRun(run, 'confirm', {
    riskLevel: contextWarning ? 'uncertain' : 'low',
    riskSignals: contextWarning ? [...run.riskSignals, 'context relevance uncertain; some redlines/rules may not match'] : run.riskSignals,
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
  const report = [
    ...(verifyRisk
      ? [
        'Quick 未完成交付。',
        git.changedFiles.length === 0
          ? '尚未观察到目标文件的真实修改，停止交付；请先由 Agent 实施后再验证。'
          : '真实 Git diff 无法证明完全在声明范围内，需人工审查；未自动回退。',
      ]
      : ['Quick 检查完成，可交付候选。', '真实 Git diff 与声明范围一致；声明测试仍需由宿主执行并回报。']),
    ...(contextWarning ? [contextWarning] : []),
  ];
  await appendEnd(recorder, run, git);
  return { run, policy: summarizePolicy(policy), git, confirmation, report };
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
