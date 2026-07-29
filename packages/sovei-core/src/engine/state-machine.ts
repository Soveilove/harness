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
    revision: 0,
    riskLevel: 'S1',
    blockers: [],
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
      return createInitialState(event.featureId);
    }

    case 'STAGE_COMPLETE': {
      // Guard: stage must be current
      if (state.currentStage !== event.stage) {
        throw new Error(
          `Stage mismatch: expected '${state.currentStage}', got '${event.stage}'`,
        );
      }
      // Guard: stage must exist in workflow
      if (!workflow.stages[event.stage]) {
        throw new Error(`Unknown stage: ${event.stage}`);
      }

      const completed = [...state.completedStages, event.stage];
      const currentIndex = workflow.stageOrder.indexOf(event.stage);
      const next = workflow.stageOrder[currentIndex + 1] ?? null;
      const nextAfter = next ? workflow.stageOrder[workflow.stageOrder.indexOf(next) + 1] ?? null : null;

      return {
        ...state,
        completedStages: completed,
        currentStage: next,
        nextStage: nextAfter,
        status: next ? 'in_progress' : 'completed',
        blockers: [],
        updatedAt: new Date().toISOString(),
      };
    }

    case 'REOPEN': {
      // Guard: target must be a known stage
      if (!workflow.stages[event.target]) {
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
        status: 'in_progress',
        revision: state.revision + 1,
        blockers: [],
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
  if (!workflow.stages[stage]) {
    return { valid: false, reason: `Unknown stage: ${stage}` };
  }
  return { valid: true };
}
