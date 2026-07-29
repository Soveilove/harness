/**
 * Knowledge Selectors
 * Reusable query functions (Redux selector pattern).
 * These replace the keyword-trigger table in the old knowledge-loader.
 */
import type { KnowledgeEntry, KnowledgeType } from './schemas.js';
/** Search knowledge by text query */
export declare function searchEntries(entries: KnowledgeEntry[], query: string): KnowledgeEntry[];
/** Get knowledge entries relevant to a file path */
export declare function selectByFilePath(entries: KnowledgeEntry[], filePath: string): KnowledgeEntry[];
/** Group entries by type for display */
export declare function groupByType(entries: KnowledgeEntry[]): Record<KnowledgeType, KnowledgeEntry[]>;
/** Statistics summary */
export declare function getStats(entries: KnowledgeEntry[]): {
    total: number;
    byType: Record<string, number>;
    byLifecycle: Record<string, number>;
};
//# sourceMappingURL=selectors.d.ts.map