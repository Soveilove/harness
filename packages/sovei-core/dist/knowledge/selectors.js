/**
 * Knowledge Selectors
 * Reusable query functions (Redux selector pattern).
 * These replace the keyword-trigger table in the old knowledge-loader.
 */
/** Search knowledge by text query */
export function searchEntries(entries, query) {
    const lower = query.toLowerCase();
    return entries.filter((e) => e.lifecycle !== 'deprecated' &&
        (e.title.toLowerCase().includes(lower) ||
            e.content.toLowerCase().includes(lower) ||
            e.tags.some((t) => t.toLowerCase().includes(lower))));
}
/** Get knowledge entries relevant to a file path */
export function selectByFilePath(entries, filePath) {
    return entries.filter((e) => e.lifecycle !== 'deprecated' &&
        e.tags.some((t) => filePath.toLowerCase().includes(t.toLowerCase())));
}
/** Group entries by type for display */
export function groupByType(entries) {
    const result = {};
    for (const entry of entries) {
        if (!result[entry.type])
            result[entry.type] = [];
        result[entry.type].push(entry);
    }
    return result;
}
/** Statistics summary */
export function getStats(entries) {
    const byType = {};
    const byLifecycle = {};
    for (const entry of entries) {
        byType[entry.type] = (byType[entry.type] ?? 0) + 1;
        byLifecycle[entry.lifecycle] = (byLifecycle[entry.lifecycle] ?? 0) + 1;
    }
    return { total: entries.length, byType, byLifecycle };
}
//# sourceMappingURL=selectors.js.map