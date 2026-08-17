import { z } from 'zod';

export const WORKFLOW_STATE_SCHEMA_VERSION = 3;

export const WorkflowHistoryEntrySchema = z.object({
  revision: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  actor: z.string().min(1),
  action: z.string().min(1),
  sourceStage: z.string().min(1).nullable(),
  reason: z.string().nullable(),
}).strict();

export const WorkflowStateV3Schema = z.object({
  schemaVersion: z.literal(WORKFLOW_STATE_SCHEMA_VERSION),
  featureId: z.string().min(1),
  status: z.enum(['in_progress', 'completed', 'blocked']),
  currentStage: z.string().min(1).nullable(),
  nextStage: z.string().min(1).nullable(),
  completedStages: z.array(z.string().min(1)),
  reopenedStages: z.array(z.string().min(1)),
  completedTaskIds: z.array(z.string().min(1)),
  activeChangeId: z.string().min(1).nullable(),
  revision: z.number().int().nonnegative(),
  riskLevel: z.enum(['S0', 'S1', 'S2', 'S3']),
  blockers: z.array(z.string()),
  pendingConfirmations: z.array(z.object({
    stage: z.string().min(1),
    gate: z.string().min(1),
    role: z.enum(['product', 'tech']),
    required: z.boolean(),
    confirmedBy: z.string().min(1).nullable(),
    confirmedAt: z.string().datetime().nullable(),
    reference: z.string().min(1).nullable(),
    overridden: z.boolean(),
    overrideReason: z.string().min(1).nullable(),
  }).strict()),
  preparedStages: z.array(z.string().min(1)),
  history: z.array(WorkflowHistoryEntrySchema),
  updatedAt: z.string().datetime(),
}).strict().superRefine((state, ctx) => {
  const stageLists = [state.completedStages, state.reopenedStages, state.preparedStages];
  for (const stages of stageLists) {
    if (new Set(stages).size !== stages.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'duplicate stage entry' });
    }
  }
  if (new Set(state.completedTaskIds).size !== state.completedTaskIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'duplicate completed task' });
  }
  if (state.history.some((entry) => entry.revision > state.revision)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'history revision exceeds state revision' });
  }
  if (state.history.length !== state.revision) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'history length must equal state revision' });
  }
  for (let index = 0; index < state.history.length; index += 1) {
    if (state.history[index].revision !== index + 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'history revisions must start at one and be consecutive' });
      break;
    }
  }
  if (state.status === 'in_progress' && !state.currentStage) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'in-progress state requires current stage' });
  }
  if (state.status === 'completed' && state.currentStage !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'completed state cannot have current stage' });
  }
  if (state.status === 'blocked' && state.blockers.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'blocked state requires blockers' });
  }
});

export type WorkflowStateV3 = z.infer<typeof WorkflowStateV3Schema>;
export type WorkflowHistoryEntry = z.infer<typeof WorkflowHistoryEntrySchema>;

function validateStageOrder(stageOrder: string[]): void {
  if (!stageOrder.length) throw new Error('Workflow stage order cannot be empty');
  if (stageOrder.some((stage) => !stage.trim())) throw new Error('Workflow stage names cannot be empty');
  if (new Set(stageOrder).size !== stageOrder.length) throw new Error('Workflow stage order cannot contain duplicates');
}

export function createWorkflowStateV3(featureId: string, stageOrder: string[]): WorkflowStateV3 {
  validateStageOrder(stageOrder);
  const now = new Date().toISOString();
  return WorkflowStateV3Schema.parse({
    schemaVersion: WORKFLOW_STATE_SCHEMA_VERSION,
    featureId,
    status: 'in_progress',
    currentStage: stageOrder[0],
    nextStage: stageOrder[1] ?? null,
    completedStages: [],
    reopenedStages: [],
    completedTaskIds: [],
    activeChangeId: null,
    revision: 0,
    riskLevel: 'S1',
    blockers: [],
    pendingConfirmations: [],
    preparedStages: [],
    history: [],
    updatedAt: now,
  });
}

export function parseWorkflowStateV3(content: string, stageOrder: string[]): WorkflowStateV3 {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch (error) {
    throw new Error(`Workflow state file is invalid JSON: ${(error as Error).message}`);
  }
  if (!value || typeof value !== 'object' || (value as { schemaVersion?: unknown }).schemaVersion !== WORKFLOW_STATE_SCHEMA_VERSION) {
    throw new Error(`Unsupported workflow state schema: expected ${WORKFLOW_STATE_SCHEMA_VERSION}`);
  }

  let state: WorkflowStateV3;
  try {
    state = WorkflowStateV3Schema.parse(value);
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues.map((issue) => issue.message).join('; ')
      : (error as Error).message;
    throw new Error(`Invalid workflow state: ${message}`);
  }

  if (!Array.isArray(stageOrder)) throw new Error('Workflow stage order is required');
  validateStageOrder(stageOrder);
  const currentIndex = state.currentStage === null ? -1 : stageOrder.indexOf(state.currentStage);
  const nextIndex = state.nextStage === null ? -1 : stageOrder.indexOf(state.nextStage);
  if (currentIndex < 0 && state.currentStage !== null) {
    throw new Error(`Invalid workflow state: unknown current stage '${state.currentStage}'`);
  }
  if (nextIndex < 0 && state.nextStage !== null) {
    throw new Error(`Invalid workflow state: unknown next stage '${state.nextStage}'`);
  }
  if (state.currentStage === null && state.nextStage !== null) {
    throw new Error('Invalid workflow state: completed cursor must have no next stage');
  }
  if (currentIndex >= 0 && nextIndex !== currentIndex + 1 && !(nextIndex === -1 && currentIndex === stageOrder.length - 1)) {
    throw new Error('Invalid workflow state: next stage is not the immediate successor');
  }
  for (const field of ['completedStages', 'reopenedStages', 'preparedStages'] as const) {
    if (state[field].some((stage) => !stageOrder.includes(stage))) {
      throw new Error(`Invalid workflow state: ${field} contains an unknown stage`);
    }
  }
  const completedPrefix = stageOrder.slice(0, state.completedStages.length);
  if (state.completedStages.some((stage, index) => stage !== completedPrefix[index])) {
    throw new Error('Invalid workflow state: completed stages must be an ordered prefix');
  }
  const expectedCurrent = stageOrder[state.completedStages.length] ?? null;
  const expectedNext = stageOrder[state.completedStages.length + 1] ?? null;
  if (state.currentStage !== expectedCurrent || state.nextStage !== expectedNext) {
    throw new Error('Invalid workflow state: cursor does not match completed stages');
  }
  if (state.preparedStages.some((stage) => stage !== state.currentStage)) {
    throw new Error('Invalid workflow state: prepared stage must be current stage');
  }
  return state;
}
