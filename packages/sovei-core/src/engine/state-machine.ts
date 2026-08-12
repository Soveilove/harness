/**
 * Workflow State Machine - Pure Reducer Function
 * Inspired by XState (formal state transitions) + Redux (pure reducer)
 *
 * State is always derived from event replay. No direct mutation.
 */

import type {
  WorkflowState,
  WorkflowEvent,
  WorkflowDefinition,
  PendingConfirmation,
  SubChangeState,
} from './types.js';

/** Create initial state for a new feature.
 *  `firstStage` defaults to 'explore' (workflow.stageOrder[0]).
 *  Callers pass `workflow.stageOrder[0]` to stay in sync with the workflow definition.
 */
export function createInitialState(
  featureId: string,
  firstStage: string = 'explore',
  secondStage: string | null = 'load',
): WorkflowState {
  return {
    featureId,
    status: 'in_progress',
    currentStage: firstStage,
    nextStage: secondStage,
    completedStages: [],
    reopenedStages: [],
    completedTaskIds: [],
    activeChangeId: null,
    revision: 0,
    riskLevel: 'S1',
    blockers: [],
    pendingConfirmations: [],
    preparedStages: [],
    subChanges: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Sub-change stage range (plan → verify). load→scope and learn→sync are shared/parent-only. */
const SUB_CHANGE_STAGE_RANGE = ['plan', 'tasks', 'implement', 'converge', 'verify'];

/** Locate a sub-change by id; throws if missing (fail-fast, no silent corruption). */
function findSubChange(state: WorkflowState, subChangeId: string): SubChangeState {
  const sc = state.subChanges.find((s) => s.id === subChangeId);
  if (!sc) {
    throw new Error(`Unknown sub-change: ${subChangeId}`);
  }
  return sc;
}

/** Update a single sub-change immutably; leaves siblings untouched. */
function updateSubChange(
  state: WorkflowState,
  subChangeId: string,
  updater: (sc: SubChangeState) => SubChangeState,
): WorkflowState {
  return {
    ...state,
    subChanges: state.subChanges.map((sc) =>
      sc.id === subChangeId ? updater(sc) : sc,
    ),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Pure reducer function - the only way to transition state.
 * Throws on invalid transitions (fail-fast, no silent corruption).
 */
export function workflowReducer(
  state: WorkflowState,
  event: WorkflowEvent,
  workflow: WorkflowDefinition,
): WorkflowState {
  switch (event.type) {
    case 'BOOTSTRAP': {
      throw new Error(`Duplicate BOOTSTRAP event for feature '${event.featureId}'`);
    }

    case 'STAGE_PREPARED': {
      if (state.preparedStages.includes(event.stage)) {
        return state;
      }
      return {
        ...state,
        preparedStages: [...state.preparedStages, event.stage],
        updatedAt: new Date().toISOString(),
      };
    }

    case 'STAGE_COMPLETE': {
      // Guard: stage must be a known stage (stageOrder is always the full stage list)
      if (!workflow.stageOrder.includes(event.stage)) {
        throw new Error(`Unknown stage: ${event.stage}`);
      }

      const eventIndex = workflow.stageOrder.indexOf(event.stage);
      const currentIndex = state.currentStage
        ? workflow.stageOrder.indexOf(state.currentStage)
        : -1;

      // Backward-compat:老 Feature 在 explore 加入 stageOrder 前创建，事件流无 explore。
      // replay 时 currentStage='explore'，但第一个 STAGE_COMPLETE 是 'load'——允许前向跳过。
      // 语义：完成从 currentStage 到 event.stage 之间的所有阶段（含 event.stage），
      // 被跳过的阶段（如 explore）静默标记为 completed。
      if (eventIndex < currentIndex) {
        throw new Error(
          `Stage mismatch: current is '${state.currentStage}', cannot complete past stage '${event.stage}'`,
        );
      }

      // 被跳过的阶段（currentStage 到 event.stage 之间，不含 event.stage）
      const skippedStages = currentIndex >= 0
        ? workflow.stageOrder.slice(currentIndex, eventIndex)
        : [];
      // 本次完成的阶段 = 被跳过的 + event.stage
      const completed = [...state.completedStages, ...skippedStages, event.stage];
      const next = workflow.stageOrder[eventIndex + 1] ?? null;
      const nextAfter = next ? workflow.stageOrder[workflow.stageOrder.indexOf(next) + 1] ?? null : null;

      const baseState: WorkflowState = {
        ...state,
        completedStages: completed,
        currentStage: next,
        nextStage: nextAfter,
        status: next ? 'in_progress' : 'completed',
        blockers: [],
        pendingConfirmations: [],
        preparedStages: state.preparedStages.filter((s) => s !== event.stage),
        updatedAt: new Date().toISOString(),
      };

      // Confirmation gates: spec (S2/S3 only) and verify (always)
      const needsSpecGate = event.stage === 'spec' && (state.riskLevel === 'S2' || state.riskLevel === 'S3');
      const needsVerifyGate = event.stage === 'verify';

      if (needsSpecGate || needsVerifyGate) {
        const gate = needsSpecGate ? 'spec-confirmation' : 'verify-confirmation';
        const confirmations: PendingConfirmation[] = [
          { stage: event.stage, gate, role: 'product', required: true, confirmedBy: null, confirmedAt: null, reference: null, overridden: false, overrideReason: null },
          { stage: event.stage, gate, role: 'tech', required: true, confirmedBy: null, confirmedAt: null, reference: null, overridden: false, overrideReason: null },
        ];
        return {
          ...baseState,
          status: 'blocked',
          blockers: [`${gate}: waiting for product and tech confirmation`],
          pendingConfirmations: confirmations,
        };
      }

      return baseState;
    }

    case 'TASK_COMPLETE': {
      if (state.currentStage !== 'implement') {
        throw new Error(`Tasks can only complete during implement, current stage is '${state.currentStage}'`);
      }
      if (state.completedTaskIds.includes(event.taskId)) {
        return state;
      }
      return {
        ...state,
        completedTaskIds: [...state.completedTaskIds, event.taskId],
        updatedAt: new Date().toISOString(),
      };
    }

    case 'CHANGE_DECLARED': {
      if (!workflow.stageOrder.includes(event.target)) throw new Error(`Unknown change target: ${event.target}`);
      const targetIndex = workflow.stageOrder.indexOf(event.target);
      const remaining = state.completedStages.filter(
        (stage) => workflow.stageOrder.indexOf(stage) < targetIndex,
      );
      return {
        ...state,
        status: 'in_progress',
        currentStage: event.target,
        nextStage: workflow.stageOrder[targetIndex + 1] ?? null,
        completedStages: remaining,
        reopenedStages: state.reopenedStages.includes(event.target)
          ? state.reopenedStages
          : [...state.reopenedStages, event.target],
        completedTaskIds: targetIndex <= workflow.stageOrder.indexOf('implement')
          ? []
          : state.completedTaskIds,
        activeChangeId: event.changeId,
        revision: state.revision + 1,
        blockers: [],
        preparedStages: state.preparedStages.filter(
          (s) => workflow.stageOrder.indexOf(s) < targetIndex,
        ),
        updatedAt: new Date().toISOString(),
      };
    }

    case 'REOPEN': {
      // Guard: target must be a known stage (stageOrder is always the full stage list)
      if (!workflow.stageOrder.includes(event.target)) {
        throw new Error(`Unknown reopen target: ${event.target}`);
      }
      // Guard: target must be completed
      if (!state.completedStages.includes(event.target)) {
        throw new Error(`Reopen target not completed: ${event.target}`);
      }

      const targetIndex = workflow.stageOrder.indexOf(event.target);
      const remaining = state.completedStages.filter(
        (s) => workflow.stageOrder.indexOf(s) < targetIndex,
      );
      const nextAfter = workflow.stageOrder[targetIndex + 1] ?? null;

      return {
        ...state,
        completedStages: remaining,
        currentStage: event.target,
        nextStage: nextAfter,
        reopenedStages: state.reopenedStages.includes(event.target)
          ? state.reopenedStages
          : [...state.reopenedStages, event.target],
        completedTaskIds: targetIndex <= workflow.stageOrder.indexOf('implement')
          ? []
          : state.completedTaskIds,
        status: 'in_progress',
        revision: state.revision + 1,
        blockers: [],
        preparedStages: state.preparedStages.filter(
          (s) => workflow.stageOrder.indexOf(s) < targetIndex,
        ),
        updatedAt: new Date().toISOString(),
      };
    }

    case 'BLOCK': {
      return {
        ...state,
        status: 'blocked',
        blockers: [...state.blockers, event.reason],
        updatedAt: new Date().toISOString(),
      };
    }

    case 'RESUME': {
      return {
        ...state,
        status: 'in_progress',
        blockers: [],
        updatedAt: new Date().toISOString(),
      };
    }

    case 'CONFIRM': {
      const updated = state.pendingConfirmations.map((pc) =>
        pc.stage === event.stage && pc.role === event.role
          ? { ...pc, confirmedBy: event.confirmedBy, confirmedAt: new Date().toISOString(), reference: event.reference }
          : pc
      );
      const allDone = updated.filter((pc) => pc.required)
        .every((pc) => pc.confirmedBy !== null || pc.overridden);
      return {
        ...state,
        pendingConfirmations: allDone ? [] : updated,
        status: allDone ? ('in_progress' as const) : ('blocked' as const),
        blockers: allDone ? [] : state.blockers,
        updatedAt: new Date().toISOString(),
      };
    }

    case 'OVERRIDE_CONFIRM': {
      const updated = state.pendingConfirmations.map((pc) =>
        pc.stage === event.stage && pc.role === event.role
          ? { ...pc, overridden: true, overrideReason: event.reason }
          : pc
      );
      const allDone = updated.filter((pc) => pc.required)
        .every((pc) => pc.confirmedBy !== null || pc.overridden);
      return {
        ...state,
        pendingConfirmations: allDone ? [] : updated,
        status: allDone ? ('in_progress' as const) : ('blocked' as const),
        blockers: allDone ? [] : state.blockers,
        updatedAt: new Date().toISOString(),
      };
    }

    // ── Sub-change events ──
    // These route to state.subChanges[i] via subChangeId. Top-level state
    // (currentStage, completedStages, …) is untouched — sub-changes have
    // independent cursors.

    case 'SUBCHANGE_CREATED': {
      // Guard: id must be unique within the Feature.
      if (state.subChanges.some((sc) => sc.id === event.subChangeId)) {
        throw new Error(`Duplicate sub-change id: ${event.subChangeId}`);
      }
      // Guard: dependsOn must reference existing siblings or be empty.
      // (Forward references are rejected — declaration order matters.)
      for (const dep of event.dependsOn) {
        if (!state.subChanges.some((sc) => sc.id === dep)) {
          throw new Error(
            `Sub-change '${event.subChangeId}' depends on unknown sibling '${dep}'. `
            + 'Declare dependencies before dependents, or remove the dependency.',
          );
        }
      }
      const newSc: SubChangeState = {
        id: event.subChangeId,
        name: event.name,
        goal: event.goal,
        dependsOn: event.dependsOn,
        currentStage: null,
        completedStages: [],
        completedTaskIds: [],
        status: 'pending',
        createdAt: event.createdAt,
      };
      return {
        ...state,
        subChanges: [...state.subChanges, newSc],
        updatedAt: new Date().toISOString(),
      };
    }

    case 'SUBCHANGE_STAGE_PREPARE': {
      const sc = findSubChange(state, event.subChangeId);
      // Guard: stage must be in the sub-change range (plan → verify).
      if (!SUB_CHANGE_STAGE_RANGE.includes(event.stage)) {
        throw new Error(
          `Sub-change stage '${event.stage}' is out of range. `
          + `Allowed: ${SUB_CHANGE_STAGE_RANGE.join(', ')}.`,
        );
      }
      // Guard: if entering plan for the first time, all dependencies must be merged.
      if (event.stage === 'plan' && sc.currentStage === null) {
        const unmerged = sc.dependsOn.filter((depId) => {
          const dep = state.subChanges.find((s) => s.id === depId);
          return !dep || dep.status !== 'merged';
        });
        if (unmerged.length) {
          throw new Error(
            `Sub-change '${event.subChangeId}' blocked by unmerged dependencies: ${unmerged.join(', ')}`,
          );
        }
      }
      // Guard: subsequent prepare must follow the prior stage (no skips).
      if (sc.currentStage !== null && sc.currentStage !== event.stage) {
        const prevIdx = SUB_CHANGE_STAGE_RANGE.indexOf(sc.currentStage);
        const currIdx = SUB_CHANGE_STAGE_RANGE.indexOf(event.stage);
        if (currIdx !== prevIdx) {
          throw new Error(
            `Sub-change '${event.subChangeId}' stage mismatch: expected '${sc.currentStage}', got '${event.stage}'`,
          );
        }
      }
      // Status transition: pending → planning (on first prepare) → implementing → verifying
      let status = sc.status;
      if (status === 'pending') status = 'planning';
      else if (event.stage === 'implement') status = 'implementing';
      else if (event.stage === 'verify') status = 'verifying';
      return updateSubChange(state, event.subChangeId, (s) => ({
        ...s,
        currentStage: event.stage,
        status,
      }));
    }

    case 'SUBCHANGE_STAGE_COMPLETE': {
      const sc = findSubChange(state, event.subChangeId);
      // Guard: stage must match the sub-change's current cursor.
      if (sc.currentStage !== event.stage) {
        throw new Error(
          `Sub-change stage mismatch: expected '${sc.currentStage}', got '${event.stage}'`,
        );
      }
      if (!SUB_CHANGE_STAGE_RANGE.includes(event.stage)) {
        throw new Error(`Unknown sub-change stage: ${event.stage}`);
      }
      const completed = [...sc.completedStages, event.stage];
      const idx = SUB_CHANGE_STAGE_RANGE.indexOf(event.stage);
      const next = SUB_CHANGE_STAGE_RANGE[idx + 1] ?? null;
      // verify completion auto-merges the sub-change.
      const merged = event.stage === 'verify';
      return updateSubChange(state, event.subChangeId, (s) => ({
        ...s,
        completedStages: completed,
        currentStage: merged ? null : next,
        status: merged ? 'merged' as const : s.status,
      }));
    }

    case 'SUBCHANGE_MERGED': {
      const sc = findSubChange(state, event.subChangeId);
      if (sc.status === 'merged') {
        // Idempotent: re-merging an already-merged sub-change is a no-op.
        return state;
      }
      return updateSubChange(state, event.subChangeId, (s) => ({
        ...s,
        status: 'merged' as const,
        currentStage: null,
      }));
    }

    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

/** Get the next legal stage for the current state */
export function getNextStage(state: WorkflowState, workflow: WorkflowDefinition): string | null {
  if (state.status === 'completed') return null;
  if (state.status === 'blocked') return null;
  return state.currentStage;
}

/** Options for canExecuteStage when operating on a sub-change context. */
export interface CanExecuteStageOptions {
  /** When set, validate against the sub-change's cursor instead of the top-level cursor. */
  subChangeId?: string;
}

/** Check if a stage transition is valid */
export function canExecuteStage(
  state: WorkflowState,
  stage: string,
  workflow: WorkflowDefinition,
  options?: CanExecuteStageOptions,
): { valid: boolean; reason?: string } {
  if (state.status === 'blocked') {
    return { valid: false, reason: `Workflow is blocked: ${state.blockers.join(', ')}` };
  }
  // ── Sub-change context ──
  if (options?.subChangeId) {
    const sc = state.subChanges.find((s) => s.id === options.subChangeId);
    if (!sc) {
      return { valid: false, reason: `Unknown sub-change: ${options.subChangeId}` };
    }
    if (sc.status === 'merged') {
      return { valid: false, reason: `Sub-change '${options.subChangeId}' is already merged` };
    }
    if (!SUB_CHANGE_STAGE_RANGE.includes(stage)) {
      return {
        valid: false,
        reason: `Sub-change stage '${stage}' is out of range. Allowed: ${SUB_CHANGE_STAGE_RANGE.join(', ')}.`,
      };
    }
    // First prepare (currentStage === null) is allowed only for 'plan' (after dependency check).
    // Subsequent prepares must match the cursor or be the next stage in range.
    if (sc.currentStage === null) {
      if (stage !== 'plan') {
        return {
          valid: false,
          reason: `Sub-change '${options.subChangeId}' has not started; first stage must be 'plan'`,
        };
      }
      // Dependency gate: entering plan requires all deps merged.
      const unmerged = sc.dependsOn.filter((depId) => {
        const dep = state.subChanges.find((s) => s.id === depId);
        return !dep || dep.status !== 'merged';
      });
      if (unmerged.length) {
        return {
          valid: false,
          reason: `Sub-change '${options.subChangeId}' blocked by unmerged dependencies: ${unmerged.join(', ')}`,
        };
      }
      return { valid: true };
    }
    // Subsequent prepare: allow re-preparing current stage or advancing to the next.
    const cursorIdx = SUB_CHANGE_STAGE_RANGE.indexOf(sc.currentStage);
    const targetIdx = SUB_CHANGE_STAGE_RANGE.indexOf(stage);
    if (targetIdx < cursorIdx) {
      return {
        valid: false,
        reason: `Sub-change '${options.subChangeId}' cannot go back to '${stage}' (cursor at '${sc.currentStage}')`,
      };
    }
    if (targetIdx > cursorIdx + 1) {
      return {
        valid: false,
        reason: `Sub-change '${options.subChangeId}' cannot skip from '${sc.currentStage}' to '${stage}'`,
      };
    }
    return { valid: true };
  }

  // ── Top-level context ──
  if (state.currentStage !== stage) {
    return {
      valid: false,
      reason: `Expected stage '${state.currentStage}', got '${stage}'`,
    };
  }
  if (!workflow.stageOrder.includes(stage)) {
    return { valid: false, reason: `Unknown stage: ${stage}` };
  }
  return { valid: true };
}

/**
 * Aggregation gate: parent Feature may enter 'learn' only when every sub-change
 * is merged. Returns the list of unfinished sub-change ids (empty = pass).
 */
export function aggregationGate(state: WorkflowState): { passed: boolean; unfinished: string[] } {
  const unfinished = state.subChanges
    .filter((sc) => sc.status !== 'merged')
    .map((sc) => sc.id);
  return { passed: unfinished.length === 0, unfinished };
}
