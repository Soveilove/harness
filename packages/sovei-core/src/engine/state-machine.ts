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
} from './types.js';

/** Create initial state for a new feature */
export function createInitialState(featureId: string): WorkflowState {
  return {
    featureId,
    status: 'in_progress',
    currentStage: 'load',
    nextStage: 'grill',
    completedStages: [],
    reopenedStages: [],
    completedTaskIds: [],
    activeChangeId: null,
    revision: 0,
    riskLevel: 'S1',
    blockers: [],
    pendingConfirmations: [],
    preparedStages: [],
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
      // Guard: stage must be current
      if (state.currentStage !== event.stage) {
        throw new Error(
          `Stage mismatch: expected '${state.currentStage}', got '${event.stage}'`,
        );
      }
      // Guard: stage must be a known stage (stageOrder is always the full stage list)
      if (!workflow.stageOrder.includes(event.stage)) {
        throw new Error(`Unknown stage: ${event.stage}`);
      }

      const completed = [...state.completedStages, event.stage];
      const currentIndex = workflow.stageOrder.indexOf(event.stage);
      const next = workflow.stageOrder[currentIndex + 1] ?? null;
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

/** Check if a stage transition is valid */
export function canExecuteStage(
  state: WorkflowState,
  stage: string,
  workflow: WorkflowDefinition,
): { valid: boolean; reason?: string } {
  if (state.status === 'blocked') {
    return { valid: false, reason: `Workflow is blocked: ${state.blockers.join(', ')}` };
  }
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
