/**
 * Workflow State Machine Types
 * Inspired by XState: formal states + transitions + serializable context
 */

/** Risk level determined by deterministic rules */
export type RiskLevel = 'S0' | 'S1' | 'S2' | 'S3';

/** Workflow status */
export type WorkflowStatus = 'in_progress' | 'completed' | 'blocked';

/** A pending confirmation gate on a completed stage. */
export interface PendingConfirmation {
  stage: string;
  gate: 'spec-confirmation' | 'verify-confirmation';
  role: 'product' | 'tech';
  required: boolean;
  confirmedBy: string | null;
  confirmedAt: string | null;
  reference: string | null;
  overridden: boolean;
  overrideReason: string | null;
}

/** Immutable workflow state - the single source of truth */
export interface WorkflowState {
  featureId: string;
  status: WorkflowStatus;
  currentStage: string | null;
  nextStage: string | null;
  completedStages: string[];
  reopenedStages: string[];
  completedTaskIds: string[];
  activeChangeId: string | null;
  revision: number;
  riskLevel: RiskLevel;
  blockers: string[];
  pendingConfirmations: PendingConfirmation[];
  /** Stages that have been prepared (via prepareStage) but not yet completed. */
  preparedStages: string[];
  updatedAt: string;
}

/** Discriminated union of all workflow events (Redux-inspired typed actions) */
export type WorkflowEvent =
  | { type: 'BOOTSTRAP'; featureId: string }
  | { type: 'STAGE_PREPARED'; stage: string }
  | { type: 'STAGE_COMPLETE'; stage: string; artifacts: string[] }
  | { type: 'TASK_COMPLETE'; taskId: string; artifact: string }
  | { type: 'CHANGE_DECLARED'; changeId: string; target: string; summary: string }
  | { type: 'REOPEN'; target: string; reason: string }
  | { type: 'BLOCK'; reason: string }
  | { type: 'RESUME' }
  | { type: 'CONFIRM'; stage: string; role: 'product' | 'tech'; confirmedBy: string; reference: string }
  | { type: 'OVERRIDE_CONFIRM'; stage: string; role: 'product' | 'tech'; overriddenBy: string; reason: string };

/** Event store entry - append-only log */
export interface WorkflowEventEntry {
  timestamp: string;
  revision: number;
  event: WorkflowEvent;
  actor: 'cli' | 'agent' | 'user';
  sourceStage: string | null;
}

/**
 * Complete workflow definition — pure orchestration concerns.
 *
 * Per-stage artifact contracts (requiredArtifacts / producesArtifacts) are NOT
 * held here. They are cohesive to the stage entity and live solely in the stage
 * registry (`StageDefinition.contract`, see `stages/define-stage.ts`), which is
 * the single source of truth. The legal stage set is carried by `stageOrder`,
 * which always equals the full stage list.
 *
 * `version` tracks structural changes to this definition only:
 * - **minor bump**: add/remove a stage, change stageOrder
 * - **major bump**: breaking refactor of the workflow model
 *
 * `version` does NOT track:
 * - Confirmation gate logic (hardcoded in state-machine.ts)
 * - Skills / Wayfinder / Change Control subsystems (injected via constructor)
 * - CLI commands (tracked by npm package version)
 * - Stage prompt content (tracked by stage contracts and external skills)
 *
 * Unlike `schemaVersion` (which guards persisted data), `workflow.version`
 * is not persisted in Feature event logs — event replay always uses the
 * current WorkflowDefinition, so version changes require no migration.
 */
export interface WorkflowDefinition {
  version: string;
  stageOrder: string[];
  maxStagesPerInvocation: number;
  allowChaining: boolean;
}
