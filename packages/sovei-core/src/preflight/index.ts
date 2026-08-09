/**
 * Merge Preflight 模块导出
 *
 * 用法：
 * ```ts
 * const checker = new MergePreflightChecker();
 * const report = await checker.run(sourceStorage, targetStorage, { sourceId, targetId });
 * if (report.canMerge) { /* 安全合并 *\/ }
 * ```
 */

export { MergePreflightChecker, renderPreflightReport } from './checker.js';
export * from './types.js';
