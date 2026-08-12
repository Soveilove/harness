/**
 * Workflow Engine
 * High-level orchestrator that ties together:
 * - State machine (pure transitions)
 * - Event store (append-only log)
 * - Stage registry (plugin system)
 * - Knowledge store (typed knowledge)
 * - Artifact repository (feature files)
 *
 * The engine is the single entry point for all workflow operations.
 */

import type { WorkflowState, WorkflowEvent, WorkflowDefinition, SubChangeState } from './types.js';
import { workflowReducer, createInitialState, canExecuteStage, aggregationGate } from './state-machine.js';
import { EventStore } from './event-store.js';
import type { StageDefinition } from '../stages/define-stage.js';
import type { StageContext } from '../stages/define-stage.js';
import type { StageResult } from '../stages/define-stage.js';
import { stageRegistry } from '../stages/registry.js';
import '../stages/index.js';
import type { KnowledgeStore } from '../knowledge/store.js';
import { ArtifactRepository, getSubChangePath } from '../artifacts/repository.js';
import type { StorageBackend } from '../storage/types.js';
import type { Logger } from '../providers/tokens.js';
import type { SoveiConfig } from '../config/types.js';
import { getFeaturePath } from '../config/loader.js';
import { ChangeControlRepository } from '../change-control/repository.js';
import type { ChangeRequest } from '../change-control/schemas.js';
import type { ChangeDimension } from '../change-control/schemas.js';
import { WayfinderRepository } from '../wayfinder/repository.js';
import type { SkillResolver, SkillExecutionReport } from '../skills/types.js';
import { MarkdownSkillAdapter } from '../skills/adapter.js';
import { randomUUID } from 'node:crypto';
import { buildContextPack } from '../context/builder.js';
import { buildContextPolicy, summarizeContextShadow, CONTEXT_POLICY_VERSION } from '../context/policy.js';
import { loadSnapshot } from '../context/snapshot.js';
import { ProjectRulesRepository, resolveProjectRules } from '../rules/repository.js';
import { UsageRecorder, unknownTokenUsage } from '../quick/usage.js';
import { getGitBaseline, getGitBranch } from '../quick/git-verifier.js';
import { serializeSyncBaseline, SYNC_BASELINE_PATH, SYNC_BASELINE_SCHEMA_VERSION } from '../stale/stale-detector.js';

/**
 * Default workflow definition.
 *
 * version: '3.0.0' — tracks WorkflowDefinition structure (stageOrder,
 * maxStagesPerInvocation, allowChaining). See WorkflowDefinition JSDoc for
 * bump rules. 3.0.0 is a breaking refactor: the duplicated per-stage artifact
 * contracts (`stages`) were removed — they are cohesive to the stage entity and
 * now live solely in the stage registry (`StageDefinition.contract`), the single
 * source of truth. The legal stage set is carried by `stageOrder` (always the
 * full stage list).
 */
export const DEFAULT_WORKFLOW: WorkflowDefinition = {
  version: '3.0.0',
  maxStagesPerInvocation: 1,
  allowChaining: false,
  stageOrder: [
    'explore', 'load', 'grill', 'wayfind', 'spec', 'scope', 'plan',
    'tasks', 'implement', 'converge', 'verify', 'learn', 'sync',
  ],
};

export class WorkflowEngine {
  private eventStore: EventStore;
  private workflow: WorkflowDefinition;
  private changeControl: ChangeControlRepository;
  private wayfinder: WayfinderRepository;

  constructor(
    private storage: StorageBackend,
    private knowledgeStore: KnowledgeStore,
    private logger: Logger,
    private config: SoveiConfig,
    private skillResolver?: SkillResolver,
  ) {
    this.eventStore = new EventStore(storage);
    this.changeControl = new ChangeControlRepository(storage);
    this.wayfinder = new WayfinderRepository(storage);
    this.workflow = {
      ...DEFAULT_WORKFLOW,
      version: config.workflow.version,
      stageOrder: [...config.workflow.stageOrder],
    };
  }

  // ── Sub-change support ──
  // When options.subChangeId is set, prepare/complete operate on the sub-change
  // context (artifacts under sub-changes/<id>/, cursor from SubChangeState).
  // The top-level Feature cursor is untouched — sub-changes fork from plan→verify.

  /** Bootstrap a new feature */
  async bootstrap(featureId: string): Promise<WorkflowState> {
    const featurePath = getFeaturePath(this.config, featureId);
    const existingEvents = await this.eventStore.readAll(featurePath);
    if (existingEvents.length > 0) {
      const state = await this.eventStore.replay(featurePath, this.workflow);
      this.logger.info(`Feature already bootstrapped: ${featureId}`);
      return state;
    }
    const event: WorkflowEvent = { type: 'BOOTSTRAP', featureId };
    await this.eventStore.append(featurePath, event);
    const state = await this.eventStore.replay(featurePath, this.workflow);
    await this.eventStore.persistState(featurePath, state);
    this.logger.info(`Bootstrapped feature: ${featureId}`);
    return state;
  }

  /** Get current state (from event replay) */
  async getState(featureId: string): Promise<WorkflowState> {
    const featurePath = getFeaturePath(this.config, featureId);
    return this.eventStore.replay(featurePath, this.workflow);
  }

  /** Prepare a stage by returning its contract and creating missing templates. */
  async prepareStage(
    featureId: string,
    stageName: string,
    options?: { subChangeId?: string },
  ): Promise<StageResult> {
    const featurePath = getFeaturePath(this.config, featureId);
    const state = await this.getState(featureId);
    await this.assertNoPendingChanges(featurePath);

    // Determine artifact path: sub-change namespace vs top-level.
    const subChangeId = options?.subChangeId;
    const artifactRoot = subChangeId
      ? getSubChangePath(featurePath, subChangeId)
      : featurePath;

    // Guard: can we execute this stage?
    // For top-level 'learn', enforce the aggregation gate (all sub-changes merged).
    if (!subChangeId && stageName === 'learn') {
      const gate = aggregationGate(state);
      if (!gate.passed) {
        throw new Error(
          `Cannot enter 'learn': sub-changes not merged: ${gate.unfinished.join(', ')}. `
          + 'Complete and merge all sub-changes first.',
        );
      }
    }
    const check = canExecuteStage(state, stageName, this.workflow, subChangeId ? { subChangeId } : undefined);
    if (!check.valid) {
      throw new Error(check.reason);
    }

    // Get stage definition from registry
    const stageDef = stageRegistry.get(stageName);

    // Create context
    const artifacts = new ArtifactRepository(this.storage, artifactRoot);
    const ctx: StageContext = {
      featureId,
      featurePath,
      workflowState: state,
      knowledge: this.knowledgeStore,
      artifacts,
      logger: this.logger,
    };

    // preExecute hook
    if (stageDef.preExecute) {
      const pre = await stageDef.preExecute(ctx);
      if (pre?.block) {
        throw new Error(`Stage ${stageName} blocked: ${pre.reason}`);
      }
    }

    // Check required artifacts
    const { missing } = await artifacts.checkRequired(stageDef.contract.requiredArtifacts);
    if (missing.length > 0) {
      throw new Error(`Missing required artifacts for ${stageName}: ${missing.join(', ')}`);
    }

    // Execute the preparation hook and return its prompt contract.
    const result = await stageDef.execute(ctx);
    // Record shadow context observation without changing the stage prompt or workflow state.
    await this.recordContextObservation(featureId, stageName, state, artifacts);

    const authorityNotice = state.activeChangeId
      ? `## 权威规则\n\n当前 revision：${state.revision}。当前变更：${state.activeChangeId}。`
        + `执行前先阅读 ${featurePath}/change-requests/${state.activeChangeId}.json。`
        + '仅当前顶层 Feature 产物具有权威性；history/ 下的文件是已失效证据，只能用于明确的差异比较。\n\n'
      : `## 权威规则\n\n当前 revision：${state.revision}。仅当前顶层 Feature 产物具有权威性；`
        + 'history/ 下的文件是已失效证据，不得视为当前需求。\n\n';

    // ── Skill injection: prepend external skill body to the native prompt ──
    const nativePrompt = result.prompt ?? '';
    let skillSection = '';
    const skillStartTime = Date.now();
    let skillReport: SkillExecutionReport;

    if (this.skillResolver) {
      try {
        const binding = this.skillResolver.resolve(stageName);
        if (binding) {
          const adapter = this.skillResolver.getAdapter(binding.skillId);
          if (adapter) {
            let skillBody = '';
            if (adapter instanceof MarkdownSkillAdapter) {
              skillBody = adapter.getSkillBody();
            } else {
              const skillResult = await adapter.execute({
                requestId: randomUUID(),
                manifest: adapter.manifest,
                binding,
                context: {
                  featureId,
                  stage: stageName,
                  revision: state.revision,
                  artifacts: {},
                  knowledgeSources: result.knowledgeSourcesUsed,
                  allowedPaths: [featurePath],
                  readOnly: true,
                },
                requestedAt: new Date().toISOString(),
              });
              skillBody = skillResult.proposals.find((p) => p.name === 'prompt-injection')?.content ?? '';
            }
            if (skillBody) {
              skillSection = `## 外部 Skill 指令\n\n${skillBody}\n来源：${adapter.manifest.id} v${adapter.manifest.version}\n\n`;
            }
            skillReport = {
              requestId: randomUUID(),
              stage: stageName,
              mode: 'third-party',
              skillId: adapter.manifest.id,
              version: adapter.manifest.version,
              durationMs: Date.now() - skillStartTime,
              fallbackReason: null,
              artifactNames: result.artifactsWritten,
              validated: true,
            };
          } else {
            skillReport = {
              requestId: randomUUID(),
              stage: stageName,
              mode: 'fallback',
              skillId: binding.skillId,
              version: null,
              durationMs: Date.now() - skillStartTime,
              fallbackReason: `Adapter not registered for skill '${binding.skillId}'`,
              artifactNames: result.artifactsWritten,
              validated: false,
            };
          }
        } else {
          skillReport = {
            requestId: randomUUID(),
            stage: stageName,
            mode: 'native',
            skillId: null,
            version: null,
            durationMs: Date.now() - skillStartTime,
            fallbackReason: null,
            artifactNames: result.artifactsWritten,
            validated: true,
          };
        }
      } catch (err) {
        skillReport = {
          requestId: randomUUID(),
          stage: stageName,
          mode: 'fallback',
          skillId: null,
          version: null,
          durationMs: Date.now() - skillStartTime,
          fallbackReason: (err as Error).message,
          artifactNames: result.artifactsWritten,
          validated: false,
        };
      }
    } else {
      skillReport = {
        requestId: randomUUID(),
        stage: stageName,
        mode: 'native',
        skillId: null,
        version: null,
        durationMs: 0,
        fallbackReason: null,
        artifactNames: result.artifactsWritten,
        validated: true,
      };
    }

    result.prompt = authorityNotice + skillSection + nativePrompt;
    result.skillExecutionReport = skillReport;

    // Templates are preparation aids and never count as completed artifacts.
    for (const artifactName of stageDef.contract.producesArtifacts) {
      const exists = await artifacts.exists(artifactName);
      if (!exists) {
        const template = this.getArtifactTemplate(artifactName, stageName, result.prompt);
        await artifacts.write(artifactName, template);
        this.logger.debug('已创建模板：' + artifactName);
      }
    }

    this.logger.info(`阶段 ${stageName} 已准备；完成其产物契约后才能推进。`);

    // Record preparation in the event log so completeStage can enforce it.
    if (subChangeId) {
      await this.eventStore.append(
        featurePath,
        { type: 'SUBCHANGE_STAGE_PREPARE', subChangeId, stage: stageName },
        stageName,
      );
    } else {
      await this.eventStore.append(featurePath, { type: 'STAGE_PREPARED', stage: stageName }, stageName);
    }

    return result;
  }

  /** Validate real artifacts and append the stage completion event. */
  async completeStage(
    featureId: string,
    stageName: string,
    options?: { subChangeId?: string },
  ): Promise<WorkflowState> {
    const subChangeId = options?.subChangeId;
    const { featurePath, state, stageDef, artifacts, ctx } = await this.createStageContext(featureId, stageName, subChangeId);

    // Enforce that prepareStage was called before completion.
    if (subChangeId) {
      // Sub-change prepare tracking: check the sub-change's currentStage matches.
      const sc = state.subChanges.find((s) => s.id === subChangeId);
      if (!sc) throw new Error(`Unknown sub-change: ${subChangeId}`);
      if (sc.currentStage !== stageName) {
        throw new Error(
          `Cannot complete '${stageName}' for sub-change '${subChangeId}': `
          + `stage was not prepared. Run \`sovei workflow ${stageName} ${featureId} --sub-change ${subChangeId}\` first.`,
        );
      }
    } else if (!state.preparedStages.includes(stageName)) {
      throw new Error(
        `Cannot complete '${stageName}': stage was not prepared. ` +
        `Run \`sovei workflow ${stageName} ${featureId}\` first to trigger skill injection and template creation.`,
      );
    }

    const validation = await artifacts.validateProduced(stageDef.contract.producesArtifacts);
    if (validation.missing.length || validation.placeholders.length) {
      const details = [
        validation.missing.length ? `missing: ${validation.missing.join(', ')}` : '',
        validation.placeholders.length ? `still templates: ${validation.placeholders.join(', ')}` : '',
      ].filter(Boolean).join('; ');
      throw new Error(`Cannot complete ${stageName}: ${details}`);
    }
    if (stageName === 'implement') {
      const requiredTasks = await this.readTaskIds(artifacts);
      const remaining = requiredTasks.filter((taskId) => !state.completedTaskIds.includes(taskId));
      if (remaining.length) {
        throw new Error(`Cannot complete implement; unfinished tasks: ${remaining.join(', ')}`);
      }
    }
    if (stageName === 'wayfind') {
      const decisionMap = await this.wayfinder.validateCompletion(featurePath);
      if (!decisionMap.valid) {
        throw new Error(`Cannot complete wayfind:\n- ${decisionMap.blockers.join('\n- ')}`);
      }
    }
    const result: StageResult = {
      stage: stageName,
      artifactsWritten: [...stageDef.contract.producesArtifacts],
      nextStage: this.workflow.stageOrder[this.workflow.stageOrder.indexOf(stageName) + 1] ?? null,
      blockers: [],
      knowledgeSourcesUsed: [],
    };
    if (stageDef.postExecute) await stageDef.postExecute(ctx, result);

    // ── stale-aware L1：sync 阶段完成时记录仓库级基线（当前分支 + HEAD + 时间）──
    // 治理资产（红线/知识/地图）是仓库级概念，sync 作为校准点，把当时 HEAD 记为基线。
    // 之后 context build / quick 对比当前 HEAD 与此基线，提示治理资产是否可能过期。
    if (stageName === 'sync') {
      const head = await getGitBaseline(this.config.rootPath);
      if (head) {
        const branch = await getGitBranch(this.config.rootPath);
        const baseline = {
          schemaVersion: SYNC_BASELINE_SCHEMA_VERSION,
          branch,
          head,
          recordedAt: new Date().toISOString(),
        };
        await this.storage.write(SYNC_BASELINE_PATH, serializeSyncBaseline(baseline));
        this.logger.info('已记录 sync 基线（stale-aware L1）: ' + branch + ' @ ' + head.slice(0, 7));
      }
      // HEAD 读取失败（非 git 仓库）时静默跳过，不写基线、不报错
    }

    const event: WorkflowEvent = subChangeId
      ? { type: 'SUBCHANGE_STAGE_COMPLETE', subChangeId, stage: stageName, artifacts: result.artifactsWritten }
      : { type: 'STAGE_COMPLETE', stage: stageName, artifacts: result.artifactsWritten };
    await this.eventStore.append(featurePath, event, stageName);

    // verify completion auto-merges the sub-change (reducer handles this, but we
    // also append an explicit SUBCHANGE_MERGED for audit clarity when not already merged).
    if (subChangeId && stageName === 'verify') {
      await this.eventStore.append(
        featurePath,
        { type: 'SUBCHANGE_MERGED', subChangeId, mergedAt: new Date().toISOString() },
        stageName,
      );
    }

    const newState = await this.eventStore.replay(featurePath, this.workflow);
    await this.eventStore.persistState(featurePath, newState);

    if (stageDef.cleanup) await stageDef.cleanup(ctx);

    const progressLabel = subChangeId ? `子变更 ${subChangeId} 阶段 ${stageName}` : `阶段 ${stageName}`;
    this.logger.info(`${progressLabel} 已完成。`);
    return newState;
  }

  /** Record one implementation task without advancing the implement stage. */
  async completeTask(featureId: string, taskId: string): Promise<WorkflowState> {
    const { featurePath, state, artifacts } = await this.createStageContext(featureId, 'implement');
    const requiredTasks = await this.readTaskIds(artifacts);
    if (!requiredTasks.includes(taskId)) throw new Error(`Unknown task '${taskId}' in tasks.md`);
    if (state.completedTaskIds.includes(taskId)) return state;
    const manifest = await artifacts.read('change-manifest.md');
    if (!manifest || manifest.includes('SOVEI_TEMPLATE_PLACEHOLDER')) {
      throw new Error('无法完成任务：change-manifest.md 缺失或仍是模板');
    }
    if (!manifest.includes(taskId)) {
      throw new Error(`Cannot complete task: change-manifest.md does not reference '${taskId}'`);
    }
    await this.eventStore.append(featurePath, { type: 'TASK_COMPLETE', taskId, artifact: 'change-manifest.md' }, 'implement');
    const newState = await this.eventStore.replay(featurePath, this.workflow);
    await this.eventStore.persistState(featurePath, newState);
    return newState;
  }

  /** Create a draft material-change request without invalidating current state. */
  async prepareChange(
    featureId: string,
    targetStage: string,
    summary: string,
    reason: string,
    changeDimensions: ChangeDimension[],
  ): Promise<ChangeRequest> {
    const state = await this.getState(featureId);
    this.assertChangeTarget(state, targetStage);
    const featurePath = getFeaturePath(this.config, featureId);
    await this.assertNoPendingChanges(featurePath);
    const events = await this.eventStore.readAll(featurePath);
    return this.changeControl.createRequest(
      featurePath,
      featureId,
      targetStage,
      summary,
      reason,
      changeDimensions,
      events[events.length - 1]?.revision ?? 0,
      state.currentStage,
    );
  }

  /** Apply a reviewed change request, archive stale artifacts, and reopen from its target. */
  async applyChange(featureId: string, changeId: string): Promise<WorkflowState> {
    const featurePath = getFeaturePath(this.config, featureId);
    const state = await this.getState(featureId);
    if (state.activeChangeId === changeId) throw new Error(`Change request already applied: ${changeId}`);
    const request = await this.changeControl.loadRequest(featurePath, changeId);
    if (request.featureId !== featureId) throw new Error(`Change request belongs to feature '${request.featureId}'`);
    this.assertChangeTarget(state, request.targetStage);
    const events = await this.eventStore.readAll(featurePath);
    const currentEventRevision = events[events.length - 1]?.revision ?? 0;
    if (request.baseEventRevision !== currentEventRevision || request.baseCurrentStage !== state.currentStage) {
      throw new Error(
        `Change request is stale: prepared at event ${request.baseEventRevision}/${request.baseCurrentStage}, `
        + `current state is ${currentEventRevision}/${state.currentStage}`,
      );
    }
    const validation = await this.changeControl.validateForApply(request, this.workflow.stageOrder);
    if (!validation.valid) {
      throw new Error(`Change request blocked:\n- ${validation.blockers.join('\n- ')}`);
    }

    await this.archiveInvalidatedArtifacts(
      featurePath,
      request.targetStage,
      state.revision + 1,
      `change-${request.id}`,
      request.supersedes,
    );
    const event: WorkflowEvent = {
      type: 'CHANGE_DECLARED',
      changeId: request.id,
      target: request.targetStage,
      summary: request.summary,
    };
    await this.eventStore.append(featurePath, event, state.currentStage);
    const newState = await this.eventStore.replay(featurePath, this.workflow);
    await this.eventStore.persistState(featurePath, newState);
    await this.changeControl.saveRequest(featurePath, {
      ...request,
      status: 'applied',
      appliedAt: new Date().toISOString(),
    });
    this.logger.info(`Applied change ${request.id}; reopened from ${request.targetStage}`);
    return newState;
  }

  async cancelChange(featureId: string, changeId: string, reason: string): Promise<ChangeRequest> {
    const featurePath = getFeaturePath(this.config, featureId);
    return this.changeControl.cancelRequest(featurePath, changeId, reason);
  }

  /** Reopen a completed stage */
  async reopen(featureId: string, targetStage: string, reason: string): Promise<WorkflowState> {
    const featurePath = getFeaturePath(this.config, featureId);
    const state = await this.getState(featureId);
    await this.assertNoPendingChanges(featurePath);

    await this.archiveInvalidatedArtifacts(
      featurePath,
      targetStage,
      state.revision + 1,
      `reopen-${targetStage}`,
    );
    const event: WorkflowEvent = { type: 'REOPEN', target: targetStage, reason };
    await this.eventStore.append(featurePath, event, state.currentStage);

    const newState = await this.eventStore.replay(featurePath, this.workflow);
    await this.eventStore.persistState(featurePath, newState);

    this.logger.info(`Reopened ${targetStage}. Revision: ${newState.revision}`);
    return newState;
  }

  /** Confirm a pending confirmation gate. */
  async confirmGate(
    featureId: string,
    stage: string,
    role: 'product' | 'tech',
    confirmedBy: string,
    reference: string,
  ): Promise<WorkflowState> {
    const featurePath = getFeaturePath(this.config, featureId);
    const state = await this.getState(featureId);
    const pending = state.pendingConfirmations.find(
      (pc) => pc.stage === stage && pc.role === role,
    );
    if (!pending) {
      throw new Error(`No pending confirmation for stage '${stage}' role '${role}'`);
    }
    if (pending.confirmedBy || pending.overridden) {
      throw new Error(`Confirmation already recorded for stage '${stage}' role '${role}'`);
    }
    const event: WorkflowEvent = { type: 'CONFIRM', stage, role, confirmedBy, reference };
    await this.eventStore.append(featurePath, event, stage);
    const newState = await this.eventStore.replay(featurePath, this.workflow);
    await this.eventStore.persistState(featurePath, newState);
    this.logger.info(`Confirmation recorded: ${stage}/${role} by ${confirmedBy}`);
    return newState;
  }

  /** Override a pending confirmation gate with a reason (audit-trail preserved). */
  async overrideConfirmation(
    featureId: string,
    stage: string,
    role: 'product' | 'tech',
    overriddenBy: string,
    reason: string,
  ): Promise<WorkflowState> {
    const featurePath = getFeaturePath(this.config, featureId);
    const state = await this.getState(featureId);
    const pending = state.pendingConfirmations.find(
      (pc) => pc.stage === stage && pc.role === role,
    );
    if (!pending) {
      throw new Error(`No pending confirmation for stage '${stage}' role '${role}'`);
    }
    if (pending.confirmedBy || pending.overridden) {
      throw new Error(`Confirmation already recorded for stage '${stage}' role '${role}'`);
    }
    const event: WorkflowEvent = { type: 'OVERRIDE_CONFIRM', stage, role, overriddenBy, reason };
    await this.eventStore.append(featurePath, event, stage);
    const newState = await this.eventStore.replay(featurePath, this.workflow);
    await this.eventStore.persistState(featurePath, newState);
    this.logger.info(`Confirmation overridden: ${stage}/${role} by ${overriddenBy}: ${reason}`);
    return newState;
  }

  /** Get the workflow definition */
  getWorkflow(): WorkflowDefinition {
    return this.workflow;
  }

  /** List all registered stages */
  listStages(): string[] {
    return stageRegistry.list();
  }

  /**
   * Record a shadow Context Policy observation for a standard workflow stage.
   * Builds the current context pack, runs the shadow policy (full/scoped/
   * index+on-demand variants), and persists a usage observation. This never
   * changes the actual stage prompt or workflow state; failures are swallowed
   * so observation cannot block ordinary stage preparation.
   */
  private async recordContextObservation(
    featureId: string,
    stageName: string,
    state: WorkflowState,
    artifacts: ArtifactRepository,
  ): Promise<void> {
    try {
      const redlines = await this.changeControl.loadRedlines();
      const rulesRepository = new ProjectRulesRepository(this.storage, this.config.rulesDir);
      const projectRules = resolveProjectRules(await rulesRepository.load(), { stage: stageName });
      const snapshot = await loadSnapshot(this.storage);
      const knowledge = this.knowledgeStore.selectAll();
      const artifactEntries: Array<{ name: string; content: string }> = [];
      for (const name of await artifacts.list()) {
        if (!name.endsWith('.md')) continue;
        const content = await artifacts.read(name);
        if (content) artifactEntries.push({ name, content });
      }
      const pack = buildContextPack({
        feature: featureId,
        stage: stageName,
        redlines,
        projectRules,
        knowledge,
        artifacts: artifactEntries,
        snapshot,
      });
      const policy = buildContextPolicy(pack, redlines, projectRules, {
        baselineRevision: null,
      });
      const recorder = new UsageRecorder(this.storage);
      await recorder.append({
        schemaVersion: 1,
        event: 'context-selected',
        runId: `workflow-${featureId}-${stageName}-${Date.now().toString(36)}`,
        channel: 'workflow',
        stage: stageName,
        occurredAt: new Date().toISOString(),
        policyVersion: policy.controlPlane.policyVersion,
        baselineRevision: null,
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
        shadow: {
          actual: 'full',
          compatibility: 'preserved',
          variants: {
            full: summarizeContextShadow(policy.shadow.full),
            scoped: summarizeContextShadow(policy.shadow.scoped),
            indexOnDemand: summarizeContextShadow(policy.shadow.indexOnDemand),
          },
        },
      });
    } catch {
      // Shadow observation is best-effort; it must never block stage preparation.
      this.logger.debug(`context observation skipped for ${featureId}/${stageName}`);
    }
  }

  private async createStageContext(featureId: string, stageName: string, subChangeId?: string): Promise<{
    featurePath: string;
    state: WorkflowState;
    stageDef: StageDefinition;
    artifacts: ArtifactRepository;
    ctx: StageContext;
  }> {
    const featurePath = getFeaturePath(this.config, featureId);
    const state = await this.getState(featureId);
    await this.assertNoPendingChanges(featurePath);
    const artifactRoot = subChangeId ? getSubChangePath(featurePath, subChangeId) : featurePath;
    const check = canExecuteStage(state, stageName, this.workflow, subChangeId ? { subChangeId } : undefined);
    if (!check.valid) throw new Error(check.reason);
    const stageDef = stageRegistry.get(stageName);
    const artifacts = new ArtifactRepository(this.storage, artifactRoot);
    const ctx: StageContext = { featureId, featurePath, workflowState: state, knowledge: this.knowledgeStore, artifacts, logger: this.logger };
    const { missing } = await artifacts.checkRequired(stageDef.contract.requiredArtifacts);
    if (missing.length) throw new Error(`Missing required artifacts for ${stageName}: ${missing.join(', ')}`);
    return { featurePath, state, stageDef, artifacts, ctx };
  }

  private async readTaskIds(artifacts: ArtifactRepository): Promise<string[]> {
    const content = await artifacts.read('tasks.md');
    if (!content) throw new Error('tasks.md not generated');
    // Only recognize the project's stable task ID prefix (TASK-xxx) so that
    // skill-injected templates in the "提示契约" section are never treated as tasks.
    const ids = [...content.matchAll(/^\s*[-*]\s+\[[ xX]\]\s+(TASK-[\w.-]+)\b/gm)].map((match) => match[1]);
    if (!ids.length) throw new Error('tasks.md must contain checklist tasks such as "- [ ] TASK-001: description"');
    return [...new Set(ids)];
  }

  private async assertNoPendingChanges(featurePath: string): Promise<void> {
    const drafts = (await this.changeControl.listRequests(featurePath))
      .filter((request) => request.status === 'draft');
    if (drafts.length) {
      throw new Error(
        `Workflow frozen by pending material change(s): ${drafts.map((request) => request.id).join(', ')}. `
        + 'Apply or cancel the draft before running ordinary stages.',
      );
    }
  }

  private assertChangeTarget(state: WorkflowState, targetStage: string): void {
    const targetIndex = this.workflow.stageOrder.indexOf(targetStage);
    if (targetIndex < 0) throw new Error(`Unknown change target: ${targetStage}`);
    const currentIndex = state.currentStage
      ? this.workflow.stageOrder.indexOf(state.currentStage)
      : this.workflow.stageOrder.length;
    if (targetIndex > currentIndex) {
      throw new Error(`Change target '${targetStage}' is after current stage '${state.currentStage}'`);
    }
  }

  private async archiveInvalidatedArtifacts(
    featurePath: string,
    targetStage: string,
    revision: number,
    reasonDirectory: string,
    extraArtifacts: string[] = [],
  ): Promise<void> {
    const targetIndex = this.workflow.stageOrder.indexOf(targetStage);
    // Artifact contracts are owned by the stage registry (single source of truth),
    // not the workflow definition. stageOrder always equals the full stage list.
    const produced = this.workflow.stageOrder
      .slice(targetIndex)
      .flatMap((stage) => stageRegistry.get(stage).contract.producesArtifacts);
    const wayfinderArtifacts = targetIndex <= this.workflow.stageOrder.indexOf('wayfind')
      ? [
          'wayfinder.json',
          'wayfinder-events.jsonl',
          ...(await this.storage.listRecursive(`${featurePath}/decision-tickets`))
            .map((path) => path.slice(featurePath.length + 1)),
        ]
      : [];
    const artifacts = [...new Set([...produced, ...wayfinderArtifacts, ...extraArtifacts])];
    for (const artifact of artifacts) {
      if (artifact.includes('..') || /^[\\/]/.test(artifact)) {
        throw new Error(`Unsafe superseded artifact path: ${artifact}`);
      }
    }
    const existing: Array<{ name: string; content: string }> = [];
    for (const name of artifacts) {
      const content = await this.storage.read(`${featurePath}/${name}`);
      if (content !== null) existing.push({ name, content });
    }
    const archiveRoot = `${featurePath}/history/revision-${revision}/${reasonDirectory}`;
    for (const artifact of existing) {
      await this.storage.write(`${archiveRoot}/${artifact.name}`, artifact.content);
    }
    for (const artifact of existing) {
      await this.storage.delete(`${featurePath}/${artifact.name}`);
    }
  }

  /** Generate a template for an artifact */
  private getArtifactTemplate(artifactName: string, stageName: string, prompt?: string): string {
    const titles: Record<string, string> = {
      'load-summary.md': '加载摘要',
      'decision-log.md': '决策日志',
      'wayfinder.md': '决策地图',
      'spec.md': '功能规格',
      'reconciliation.md': '需求对齐',
      'scope.md': '影响范围',
      'coverage-matrix.md': '覆盖矩阵',
      'plan.md': '实施计划',
      'tasks.md': '任务清单',
      'change-manifest.md': '变更清单',
      'convergence-report.md': '收敛报告',
      'evidence.md': '验证证据',
      'learning-report.md': '学习报告',
      'sync-report.md': '同步报告',
      'exploration.md': '需求探索',
    };
    const title = titles[artifactName] ?? artifactName.replace(/\.md$/, '');
    const header = '# ' + title + '\n\n';
    const note = '> 由 Sovei 阶段生成：' + stageName + '\n';
    const note2 = '> AI 代理：请依据下方提示契约，将本模板替换为真实内容。\n\n<!-- SOVEI_TEMPLATE_PLACEHOLDER -->\n\n';
    const separator = '---\n\n';
    const promptSection = prompt ? '## 提示契约\n\n' + prompt + '\n' : '';
    return header + note + note2 + separator + promptSection;
  }

  // ──────────────────────────────────────────────
  // Sub-change lifecycle
  // ──────────────────────────────────────────────

  /**
   * Split a Feature into sub-changes. Appends SUBCHANGE_CREATED events for each
   * sub-change (in declaration order so dependsOn resolves), creates scaffold
   * directories, and writes sub-change-map.md.
   *
   * @param featureId  Feature to split
   * @param subChanges Sub-change definitions (id/name/goal/dependsOn)
   */
  async splitFeature(
    featureId: string,
    subChanges: Array<{ id: string; name: string; goal: string; dependsOn: string[] }>,
  ): Promise<WorkflowState> {
    if (subChanges.length === 0) {
      throw new Error('Cannot split: sub-changes list is empty');
    }
    const featurePath = getFeaturePath(this.config, featureId);
    const state = await this.getState(featureId);
    if (state.subChanges.length > 0) {
      throw new Error(
        `Feature '${featureId}' is already split with ${state.subChanges.length} sub-changes. `
        + 'Re-splitting is not supported (use change-control to reopen scope if needed).',
      );
    }

    // Validate IDs: unique, SC-<feature>-<NN> pattern, dependsOn references.
    const ids = new Set<string>();
    for (const sc of subChanges) {
      if (ids.has(sc.id)) {
        throw new Error(`Duplicate sub-change id: ${sc.id}`);
      }
      ids.add(sc.id);
      for (const dep of sc.dependsOn) {
        if (!subChanges.some((s) => s.id === dep)) {
          throw new Error(
            `Sub-change '${sc.id}' depends on unknown sibling '${dep}'. `
            + 'Declare dependencies before dependents.',
          );
        }
      }
    }

    const now = new Date().toISOString();
    // Append events in declaration order (dependsOn must exist before dependents).
    for (const sc of subChanges) {
      await this.eventStore.append(
        featurePath,
        {
          type: 'SUBCHANGE_CREATED',
          subChangeId: sc.id,
          name: sc.name,
          goal: sc.goal,
          dependsOn: sc.dependsOn,
          createdAt: now,
        },
        'scope',
      );
    }

    // Create scaffold directories for each sub-change.
    for (const sc of subChanges) {
      const scPath = getSubChangePath(featurePath, sc.id);
      // Write a placeholder so the directory exists (storage backends are file-based).
      await this.storage.write(`${scPath}/.gitkeep`, '');
    }

    // Write sub-change-map.md (human-readable manifest, persistent file).
    const mapContent = this.renderSubChangeMap(featureId, subChanges, now);
    await this.storage.write(`${featurePath}/sub-change-map.md`, mapContent);

    const newState = await this.eventStore.replay(featurePath, this.workflow);
    await this.eventStore.persistState(featurePath, newState);
    this.logger.info(`Feature '${featureId}' split into ${subChanges.length} sub-changes.`);
    return newState;
  }

  /** List all sub-changes with their current status and blocked state. */
  async listSubChanges(featureId: string): Promise<Array<SubChangeState & { blocked: boolean; blockedBy: string[] }>> {
    const state = await this.getState(featureId);
    return state.subChanges.map((sc) => {
      const blockedBy = sc.dependsOn.filter((depId) => {
        const dep = state.subChanges.find((s) => s.id === depId);
        return !dep || dep.status !== 'merged';
      });
      return {
        ...sc,
        blocked: blockedBy.length > 0 && sc.status !== 'merged',
        blockedBy,
      };
    });
  }

  /** Render sub-change-map.md content. */
  private renderSubChangeMap(
    featureId: string,
    subChanges: Array<{ id: string; name: string; goal: string; dependsOn: string[] }>,
    createdAt: string,
  ): string {
    const lines: string[] = [];
    lines.push('# Sub-Change Map');
    lines.push('');
    lines.push(`> Feature：${featureId}`);
    lines.push(`> Created：${createdAt}`);
    lines.push('> 由 `sovei feature split` 生成。子变更共享 load→scope 上下文，从 plan→verify 独立推进。');
    lines.push('');
    lines.push('| ID | Name | Goal | Depends On | Status |');
    lines.push('|---|---|---|---|---|');
    for (const sc of subChanges) {
      lines.push(
        `| ${sc.id} | ${sc.name} | ${sc.goal} | ${sc.dependsOn.join(', ') || '—'} | pending |`,
      );
    }
    lines.push('');
    lines.push('## 推进规则');
    lines.push('');
    lines.push('- 无依赖的子变更可立即开始：`sovei workflow plan <feature> --sub-change <id>`');
    lines.push('- 有依赖的子变更需等依赖全部 merged 后才能进入 plan');
    lines.push('- 每个子变更独立走 plan→tasks→implement→converge→verify')
    lines.push('- verify 完成后自动 merged');
    lines.push('- 全部 merged 后父 Feature 推进 learn→sync');
    lines.push('');
    return lines.join('\n');
  }
}
