/**
 * Knowledge Store
 * Inspired by Redux: pure reducer + dispatch + selectors + subscriptions.
 *
 * The store is the single point of mutation for all project knowledge.
 * All changes go through typed actions. State is persisted as typed JSON.
 */
import type { KnowledgeEntry, KnowledgeType, Lifecycle } from './schemas.js';
import type { StorageBackend } from '../storage/types.js';
/** Typed actions (Redux-inspired) */
export type KnowledgeAction = {
    type: 'ADD';
    entry: KnowledgeEntry;
} | {
    type: 'UPDATE';
    id: string;
    patch: Partial<KnowledgeEntry>;
} | {
    type: 'PROMOTE';
    id: string;
    to: Lifecycle;
    evidence?: {
        feature: string;
        description: string;
    };
} | {
    type: 'DEPRECATE';
    id: string;
    reason: string;
} | {
    type: 'DELETE';
    id: string;
};
export declare class KnowledgeStore {
    private entries;
    private listeners;
    private loadedSources;
    private storage;
    private knowledgeDir;
    constructor(storage: StorageBackend, knowledgeDir?: string);
    dispatch(action: KnowledgeAction): void;
    selectAll(): KnowledgeEntry[];
    selectById(id: string): KnowledgeEntry | undefined;
    selectByType(type: KnowledgeType): KnowledgeEntry[];
    selectByLifecycle(lifecycle: Lifecycle): KnowledgeEntry[];
    selectStableRules(): KnowledgeEntry[];
    selectCandidates(): KnowledgeEntry[];
    selectByTags(tags: string[]): KnowledgeEntry[];
    /** Load knowledge by task type - replaces knowledge-loader keyword matching */
    loadByTaskType(taskType: string): void;
    getLoadedSources(): string[];
    persist(): Promise<void>;
    load(): Promise<void>;
    private groupByType;
    subscribe(fn: () => void): () => void;
    private notify;
}
//# sourceMappingURL=store.d.ts.map