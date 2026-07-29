/**
 * Knowledge Selectors
 * Reusable query functions (Redux selector pattern).
 * These replace the keyword-trigger table in the old knowledge-loader.
 */

import type { KnowledgeEntry, KnowledgeType } from './schemas.js';

/** Search knowledge by text query */
export function searchEntries(
  entries: KnowledgeEntry[],
  query: string,
): KnowledgeEntry[] {
  const lower = query.toLowerCase();
  return entries.filter(
    (e) =>
      e.lifecycle !== 'deprecated' &&
      (e.title.toLowerCase().includes(lower) ||
        e.content.toLowerCase().includes(lower) ||
        e.tags.some((t) => t.toLowerCase().includes(lower))),
  );
}

/** Get knowledge entries relevant to a file path */
export function selectByFilePath(
  entries: KnowledgeEntry[],
  filePath: string,
): KnowledgeEntry[] {
  return entries.filter(
    (e) =>
      e.lifecycle !== 'deprecated' &&
      e.tags.some((t) => filePath.toLowerCase().includes(t.toLowerCase())),
  );
}

/** Group entries by type for display */
export function groupByType(
  entries: KnowledgeEntry[],
): Record<KnowledgeType, KnowledgeEntry[]> {
  const result = {} as Record<KnowledgeType, KnowledgeEntry[]>;
  for (const entry of entries) {
    if (!result[entry.type]) result[entry.type] = [];
    result[entry.type].push(entry);
  }
  return result;
}

/** Statistics summary */
export function getStats(entries: KnowledgeEntry[]): {
  total: number;
  byType: Record<string, number>;
  byLifecycle: Record<string, number>;
} {
  const byType: Record<string, number> = {};
  const byLifecycle: Record<string, number> = {};
  for (const entry of entries) {
    byType[entry.type] = (byType[entry.type] ?? 0) + 1;
    byLifecycle[entry.lifecycle] = (byLifecycle[entry.lifecycle] ?? 0) + 1;
  }
  return { total: entries.length, byType, byLifecycle };
}
