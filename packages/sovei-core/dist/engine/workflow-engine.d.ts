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
import type { WorkflowState, WorkflowDefinition } from './types.js';
import type { StageResult } from '../stages/define-stage.js';
import type { KnowledgeStore } from '../knowledge/store.js';
import type { StorageBackend } from '../storage/types.js';
import type { Logger } from '../providers/tokens.js';
import type { SoveiConfig } from '../config/types.js';
/** Default workflow definition for Sovei 2.0 */
export declare const DEFAULT_WORKFLOW: WorkflowDefinition;
export declare class WorkflowEngine {
    private storage;
    private knowledgeStore;
    private logger;
    private config;
    private eventStore;
    private workflow;
    constructor(storage: StorageBackend, knowledgeStore: KnowledgeStore, logger: Logger, config: SoveiConfig);
    /** Bootstrap a new feature */
    bootstrap(featureId: string): Promise<WorkflowState>;
    /** Get current state (from event replay) */
    getState(featureId: string): Promise<WorkflowState>;
    /** Execute a stage */
    executeStage(featureId: string, stageName: string): Promise<StageResult>;
    /** Reopen a completed stage */
    reopen(featureId: string, targetStage: string, reason: string): Promise<WorkflowState>;
    /** Get the workflow definition */
    getWorkflow(): WorkflowDefinition;
    /** List all registered stages */
    listStages(): string[];
    /** Generate a template for an artifact */
    private getArtifactTemplate;
}
//# sourceMappingURL=workflow-engine.d.ts.map