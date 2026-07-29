/**
 * Workflow State Machine - Pure Reducer Function
 * Inspired by XState (formal state transitions) + Redux (pure reducer)
 *
 * State is always derived from event replay. No direct mutation.
 */
import type { WorkflowState, WorkflowEvent, WorkflowDefinition } from './types.js';
/** Create initial state for a new feature */
export declare function createInitialState(featureId: string): WorkflowState;
/**
 * Pure reducer function - the only way to transition state.
 * Throws on invalid transitions (fail-fast, no silent corruption).
 */
export declare function workflowReducer(state: WorkflowState, event: WorkflowEvent, workflow: WorkflowDefinition): WorkflowState;
/** Get the next legal stage for the current state */
export declare function getNextStage(state: WorkflowState, workflow: WorkflowDefinition): string | null;
/** Check if a stage transition is valid */
export declare function canExecuteStage(state: WorkflowState, stage: string, workflow: WorkflowDefinition): {
    valid: boolean;
    reason?: string;
};
//# sourceMappingURL=state-machine.d.ts.map