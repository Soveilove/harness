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

/**
 * Sub-change state — a single independently-developable unit within a Feature.
 *
 * Sub-changes share the parent Feature's explore→scope stages (shared context)
 * but fork from plan→verify with independent cursors. After all sub-changes
 * are merged, the parent Feature advances learn→sync (aggregation).
 *
 * One level of nesting only — sub-changes cannot themselves be split.
 */
export interface SubChangeState {
  /** Stable identifier, e.g. SC-030-01 */
  id: string;
  /** kebab-case human-readable name */
  name: string;
  /** One-sentence goal */
  goal: string;
  /** IDs of sub-changes that must be merged before this one can enter plan */
  dependsOn: string[];
  /** Current stage cursor (plan|tasks|implement|converge|verify) or null before first prepare */
  currentStage: string | null;
  /** Stages completed for this sub-change */
  completedStages: string[];
  /** TASK-xxx IDs completed within this sub-change's implement stage */
  completedTaskIds: string[];
  /** Lifecycle status */
  status: 'pending' | 'planning' | 'implementing' | 'verifying' | 'merged';
  /** ISO timestamp of creation */
  createdAt: string;
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
  /**
   * Sub-changes of this Feature. Empty for Features that were never split
   * (the common case — full backward compatibility with the single-pipeline model).
   */
  subChanges: SubChangeState[];
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
  | { type: 'OVERRIDE_CONFIRM'; stage: string; role: 'product' | 'tech'; overriddenBy: string; reason: string }
  // ── Sub-change events (Feature splitting) ──
  // Each carries subChangeId so the reducer routes to state.subChanges[i].
  | { type: 'SUBCHANGE_CREATED'; subChangeId: string; name: string; goal: string; dependsOn: string[]; createdAt: string }
  | { type: 'SUBCHANGE_STAGE_PREPARE'; subChangeId: string; stage: string }
  | { type: 'SUBCHANGE_STAGE_COMPLETE'; subChangeId: string; stage: string; artifacts: string[] }
  | { type: 'SUBCHANGE_MERGED'; subChangeId: string; mergedAt: string };

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
