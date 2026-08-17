import {
  parseWorkflowStateV3,
  WorkflowStateV3Schema,
  type WorkflowHistoryEntry,
  type WorkflowStateV3,
} from './state-v3.js';

export type WorkflowTransition =
  | { type: 'prepare'; actor: string }
  | { type: 'complete'; actor: string; reason?: string }
  | { type: 'reopen'; actor: string; stage: string; reason?: string };

function validateStageOrder(stageOrder: string[]): void {
  if (!Array.isArray(stageOrder) || stageOrder.length === 0) {
    throw new Error('Workflow stage order cannot be empty');
  }
  if (stageOrder.some((stage) => !stage.trim())) {
    throw new Error('Workflow stage names cannot be empty');
  }
  if (new Set(stageOrder).size !== stageOrder.length) {
    throw new Error('Workflow stage order cannot contain duplicates');
  }
}

function appendHistory(
  state: WorkflowStateV3,
  actor: string,
  action: string,
  sourceStage: string | null,
  reason: string | undefined,
): WorkflowHistoryEntry[] {
  if (!actor.trim()) throw new Error('Workflow transition actor is required');
  return [
    ...state.history,
    {
      revision: state.revision + 1,
      timestamp: new Date().toISOString(),
      actor,
      action,
      sourceStage,
      reason: reason ?? null,
    },
  ];
}

function validateResult(state: WorkflowStateV3, stageOrder: string[]): WorkflowStateV3 {
  validateStageOrder(stageOrder);
  const result = WorkflowStateV3Schema.parse(state);
  const completedPrefix = stageOrder.slice(0, result.completedStages.length);
  if (result.completedStages.some((stage, index) => stage !== completedPrefix[index])) {
    throw new Error('Invalid workflow state: completed stages must be an ordered prefix');
  }
  const current = stageOrder[result.completedStages.length] ?? null;
  const next = stageOrder[result.completedStages.length + 1] ?? null;
  if (result.currentStage !== current || result.nextStage !== next) {
    throw new Error('Invalid workflow state: cursor does not match completed stages');
  }
  return result;
}

export function transitionWorkflowStateV3(
  state: WorkflowStateV3,
  transition: WorkflowTransition,
  stageOrder: string[],
): WorkflowStateV3 {
  validateStageOrder(stageOrder);
  const current = parseWorkflowStateV3(JSON.stringify(state), stageOrder);

  if (transition.type === 'prepare') {
    if (current.preparedStages.includes(current.currentStage ?? '')) return current;
    if (!current.currentStage) throw new Error('Cannot prepare a completed workflow');
    return validateResult({
      ...current,
      preparedStages: [...current.preparedStages, current.currentStage],
      revision: current.revision + 1,
      history: appendHistory(current, transition.actor, 'prepare', current.currentStage, undefined),
      updatedAt: new Date().toISOString(),
    }, stageOrder);
  }

  if (transition.type === 'complete') {
    if (!current.currentStage) throw new Error('Cannot complete a completed workflow');
    if (current.preparedStages.length > 0 && !current.preparedStages.includes(current.currentStage)) {
      throw new Error(`Prepared stage does not match current stage '${current.currentStage}'`);
    }
    if (!current.preparedStages.includes(current.currentStage)) {
      throw new Error(`Stage '${current.currentStage}' must be prepared before completion`);
    }
    const stageIndex = stageOrder.indexOf(current.currentStage);
    if (stageIndex < 0) throw new Error(`Unknown current stage: ${current.currentStage}`);
    const completedStages = [...current.completedStages, current.currentStage];
    const nextStage = stageOrder[stageIndex + 1] ?? null;
    return validateResult({
      ...current,
      status: nextStage ? 'in_progress' : 'completed',
      currentStage: nextStage,
      nextStage: stageOrder[stageIndex + 2] ?? null,
      completedStages,
      preparedStages: [],
      blockers: [],
      revision: current.revision + 1,
      history: appendHistory(current, transition.actor, 'complete', current.currentStage, transition.reason),
      updatedAt: new Date().toISOString(),
    }, stageOrder);
  }

  const targetIndex = stageOrder.indexOf(transition.stage);
  if (targetIndex < 0) throw new Error(`Unknown reopen stage: ${transition.stage}`);
  if (!current.completedStages.includes(transition.stage)) {
    throw new Error(`Reopen target not completed: ${transition.stage}`);
  }
  const completedStages = current.completedStages.slice(0, targetIndex);
  return validateResult({
    ...current,
    status: 'in_progress',
    currentStage: transition.stage,
    nextStage: stageOrder[targetIndex + 1] ?? null,
    completedStages,
    reopenedStages: current.reopenedStages.includes(transition.stage)
      ? current.reopenedStages
      : [...current.reopenedStages, transition.stage],
    preparedStages: [],
    blockers: [],
    pendingConfirmations: [],
    revision: current.revision + 1,
    history: appendHistory(current, transition.actor, 'reopen', transition.stage, transition.reason),
    updatedAt: new Date().toISOString(),
  }, stageOrder);
}
