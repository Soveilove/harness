/**
 * Event Store - Append-only log with replay
 * Inspired by Event Sourcing: state = fold(events, reducer)
 *
 * All state changes are immutable events. The current state is always
 * derived by replaying events through the reducer.
 */
import type { WorkflowState, WorkflowEvent, WorkflowEventEntry } from './types.js';
import type { WorkflowDefinition } from './types.js';
import type { StorageBackend } from '../storage/types.js';
export declare class EventStore {
    private storage;
    constructor(storage: StorageBackend);
    /** Append an event to the feature's event log */
    append(featurePath: string, event: WorkflowEvent, sourceStage?: string | null): Promise<WorkflowEventEntry>;
    /** Read all events for a feature */
    readAll(featurePath: string): Promise<WorkflowEventEntry[]>;
    /**
     * Replay events to derive current state.
     * This is the single source of truth - state file is a cache.
     */
    replay(featurePath: string, workflow: WorkflowDefinition): Promise<WorkflowState>;
    /** Persist derived state as a YAML cache file */
    persistState(featurePath: string, state: WorkflowState): Promise<void>;
    /** Read the cached state file (for quick reads without replay) */
    readStateCache(featurePath: string): Promise<WorkflowState | null>;
    private nextRevision;
    private stateToYaml;
    private parseStateYaml;
}
//# sourceMappingURL=event-store.d.ts.map