/**
 * Workflow State Machine Types
 * Inspired by XState: formal states + transitions + serializable context
 */
/** Risk level determined by deterministic rules */
export type RiskLevel = 'S0' | 'S1' | 'S2' | 'S3';
/** Workflow status */
export type WorkflowStatus = 'in_progress' | 'completed' | 'blocked';
/** Immutable workflow state - the single source of truth */
export interface WorkflowState {
    featureId: string;
    status: WorkflowStatus;
    currentStage: string | null;
    nextStage: string | null;
    completedStages: string[];
    reopenedStages: string[];
    revision: number;
    riskLevel: RiskLevel;
    blockers: string[];
    updatedAt: string;
}
/** Discriminated union of all workflow events (Redux-inspired typed actions) */
export type WorkflowEvent = {
    type: 'BOOTSTRAP';
    featureId: string;
} | {
    type: 'STAGE_COMPLETE';
    stage: string;
    artifacts: string[];
} | {
    type: 'REOPEN';
    target: string;
    reason: string;
} | {
    type: 'BLOCK';
    reason: string;
} | {
    type: 'RESUME';
};
/** Event store entry - append-only log */
export interface WorkflowEventEntry {
    timestamp: string;
    revision: number;
    event: WorkflowEvent;
    actor: 'cli' | 'agent' | 'user';
    sourceStage: string | null;
}
/** Stage definition in the workflow */
export interface StageConfig {
    name: string;
    status: 'active' | 'deprecated';
    requiredArtifacts: string[];
    producesArtifacts: string[];
    next: string[];
}
/** Complete workflow definition */
export interface WorkflowDefinition {
    version: string;
    stageOrder: string[];
    stages: Record<string, StageConfig>;
    maxStagesPerInvocation: number;
    allowChaining: boolean;
}
//# sourceMappingURL=types.d.ts.map