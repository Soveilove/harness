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

import type { WorkflowState, WorkflowEvent, WorkflowDefinition } from './types.js';
import { workflowReducer, createInitialState, canExecuteStage } from './state-machine.js';
import { EventStore } from './event-store.js';
import type { StageDefinition } from '../stages/define-stage.js';
import type { StageContext } from '../stages/define-stage.js';
import type { StageResult } from '../stages/define-stage.js';
import { stageRegistry } from '../stages/registry.js';
import '../stages/index.js';
import type { KnowledgeStore } from '../knowledge/store.js';
import { ArtifactRepository } from '../artifacts/repository.js';
import type { StorageBackend } from '../storage/types.js';
import type { Logger } from '../providers/tokens.js';
import type { SoveiConfig } from '../config/types.js';
import { getFeaturePath } from '../config/loader.js';
import { ChangeControlRepository } from '../change-control/repository.js';
import type { ChangeRequest } from '../change-control/schemas.js';
import type { ChangeDimension } from '../change-control/schemas.js';
import { WayfinderRepository } from '../wayfinder/repository.js';

/** Default workflow definition for Sovei 2.0 */
export const DEFAULT_WORKFLOW: WorkflowDefinition = {
  version: '2.0.0',
  maxStagesPerInvocation: 1,
  allowChaining: false,
  stageOrder: [
    'load', 'grill', 'wayfind', 'spec', 'scope', 'plan',
    'tasks', 'implement', 'converge', 'verify', 'learn', 'sync',
  ],
  stages: {
    load:       { name: 'load',       status: 'active', requiredArtifacts: [],                                                    producesArtifacts: [],                     next: ['grill'] },
    grill:      { name: 'grill',      status: 'active', requiredArtifacts: [],                                                    producesArtifacts: ['decision-log.md'],    next: ['wayfind', 'spec'] },
    wayfind:    { name: 'wayfind',    status: 'active', requiredArtifacts: ['decision-log.md'],                                    producesArtifacts: ['wayfinder.md'],      next: ['spec'] },
    spec:       { name: 'spec',       status: 'active', requiredArtifacts: ['decision-log.md'],                                    producesArtifacts: ['spec.md'],           next: ['scope'] },
    scope:      { name: 'scope',      status: 'active', requiredArtifacts: ['spec.md'],                                            producesArtifacts: ['scope.md', 'coverage-matrix.md'], next: ['plan'] },
    plan:       { name: 'plan',       status: 'active', requiredArtifacts: ['spec.md', 'scope.md', 'coverage-matrix.md'],          producesArtifacts: ['plan.md'],           next: ['tasks'] },
    tasks:      { name: 'tasks',      status: 'active', requiredArtifacts: ['plan.md'],                                            producesArtifacts: ['tasks.md'],          next: ['implement'] },
    implement:  { name: 'implement',  status: 'active', requiredArtifacts: ['tasks.md'],                                           producesArtifacts: ['change-manifest.md'], next: ['converge'] },
    converge:   { name: 'converge',   status: 'active', requiredArtifacts: ['change-manifest.md'],                                 producesArtifacts: ['convergence-report.md'], next: ['verify'] },
    verify:     { name: 'verify',     status: 'active', requiredArtifacts: ['convergence-report.md'],                              producesArtifacts: ['evidence.md'],       next: ['learn'] },
    learn:      { name: 'learn',      status: 'active', requiredArtifacts: ['evidence.md'],                                        producesArtifacts: ['learning-report.md'], next: ['sync'] },
    sync:       { name: 'sync',       status: 'active', requiredArtifacts: ['learning-report.md'],                                 producesArtifacts: ['sync-report.md'],    next: [] },
  },
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
  async prepareStage(featureId: string, stageName: string): Promise<StageResult> {
    const featurePath = getFeaturePath(this.config, featureId);
    const state = await this.getState(featureId);
    await this.assertNoPendingChanges(featurePath);

    // Guard: can we execute this stage?
    const check = canExecuteStage(state, stageName, this.workflow);
    if (!check.valid) {
      throw new Error(check.reason);
    }

    // Get stage definition from registry
    const stageDef = stageRegistry.get(stageName);

    // Create context
    const artifacts = new ArtifactRepository(this.storage, featurePath);
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
    const authorityNotice = state.activeChangeId
      ? `## Authority Rules\n\nCurrent revision: ${state.revision}. Active change: ${state.activeChangeId}. `
        + `Read ${featurePath}/change-requests/${state.activeChangeId}.json before acting. `
        + 'Only current top-level Feature artifacts are authoritative. Files under history/ are superseded evidence and may only be used for an explicit diff.\n\n'
      : `## Authority Rules\n\nCurrent revision: ${state.revision}. Only current top-level Feature artifacts are authoritative. `
        + 'Files under history/ are superseded evidence and must not be treated as current requirements.\n\n';
    result.prompt = authorityNotice + (result.prompt ?? '');

    // Templates are preparation aids and never count as completed artifacts.
    for (const artifactName of stageDef.contract.producesArtifacts) {
      const exists = await artifacts.exists(artifactName);
      if (!exists) {
        const template = this.getArtifactTemplate(artifactName, stageName, result.prompt);
        await artifacts.write(artifactName, template);
        this.logger.debug('Created template: ' + artifactName);
      }
    }

    this.logger.info(`Stage ${stageName} prepared. Complete its artifact contract before advancing.`);
    return result;
  }

  /** Validate real artifacts and append the stage completion event. */
  async completeStage(featureId: string, stageName: string): Promise<WorkflowState> {
    const { featurePath, state, stageDef, artifacts, ctx } = await this.createStageContext(featureId, stageName);
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
    const event: WorkflowEvent = {
      type: 'STAGE_COMPLETE',
      stage: stageName,
      artifacts: result.artifactsWritten,
    };
    await this.eventStore.append(featurePath, event, stageName);

    const newState = await this.eventStore.replay(featurePath, this.workflow);
    await this.eventStore.persistState(featurePath, newState);

    if (stageDef.cleanup) await stageDef.cleanup(ctx);

    this.logger.info(`Stage ${stageName} completed. Next: ${newState.nextStage ?? 'done'}`);
    return newState;
  }

  /** Record one implementation task without advancing the implement stage. */
  async completeTask(featureId: string, taskId: string): Promise<WorkflowState> {
    const { featurePath, state, artifacts } = await this.createStageContext(featureId, 'implement');
    const requiredTasks = await this.readTaskIds(artifacts);
    if (!requiredTasks.includes(taskId)) throw new Error(`Unknown task '${taskId}' in tasks.md`);
    if (state.completedTaskIds.includes(taskId)) return state;
    const manifest = await artifacts.read('change-manifest.md');
    if (!manifest || manifest.includes('AI agent: replace this template with actual content')) {
      throw new Error('Cannot complete task: change-manifest.md is missing or still a template');
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
      events.at(-1)?.revision ?? 0,
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
    const currentEventRevision = events.at(-1)?.revision ?? 0;
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

  /** Get the workflow definition */
  getWorkflow(): WorkflowDefinition {
    return this.workflow;
  }

  /** List all registered stages */
  listStages(): string[] {
    return stageRegistry.list();
  }

  private async createStageContext(featureId: string, stageName: string): Promise<{
    featurePath: string;
    state: WorkflowState;
    stageDef: StageDefinition;
    artifacts: ArtifactRepository;
    ctx: StageContext;
  }> {
    const featurePath = getFeaturePath(this.config, featureId);
    const state = await this.getState(featureId);
    await this.assertNoPendingChanges(featurePath);
    const check = canExecuteStage(state, stageName, this.workflow);
    if (!check.valid) throw new Error(check.reason);
    const stageDef = stageRegistry.get(stageName);
    const artifacts = new ArtifactRepository(this.storage, featurePath);
    const ctx: StageContext = { featureId, featurePath, workflowState: state, knowledge: this.knowledgeStore, artifacts, logger: this.logger };
    const { missing } = await artifacts.checkRequired(stageDef.contract.requiredArtifacts);
    if (missing.length) throw new Error(`Missing required artifacts for ${stageName}: ${missing.join(', ')}`);
    return { featurePath, state, stageDef, artifacts, ctx };
  }

  private async readTaskIds(artifacts: ArtifactRepository): Promise<string[]> {
    const content = await artifacts.read('tasks.md');
    if (!content) throw new Error('tasks.md not generated');
    const ids = [...content.matchAll(/^\s*[-*]\s+\[[ xX]\]\s+([A-Za-z0-9][\w.-]*)\b/gm)].map((match) => match[1]);
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
    const produced = this.workflow.stageOrder
      .slice(targetIndex)
      .flatMap((stage) => this.workflow.stages[stage].producesArtifacts);
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
    const title = artifactName.replace(/\.md$/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const header = '# ' + title + '\n\n';
    const note = '> Generated by Sovei stage: ' + stageName + '\n';
    const note2 = '> AI agent: replace this template with actual content based on the prompt contract below.\n\n';
    const separator = '---\n\n';
    const promptSection = prompt ? '## Prompt Contract\n\n' + prompt + '\n' : '';
    return header + note + note2 + separator + promptSection;
  }
}
