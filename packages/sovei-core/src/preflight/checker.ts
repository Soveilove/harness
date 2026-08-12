/**
 * Merge Preflight Checker — 语义冲突预检核心逻辑
 *
 * 合并分支 X → 主干 Y 前，在 git 文本冲突检查之上做业务语义冲突预检：
 * 1. 红线冲突：同一 redline ID 在两分支有不同规则/执行级别/状态
 * 2. 知识冲突：同一 knowledge ID 在两分支有不同内容/生命周期
 * 3. coverage 冲突：同一代码表面在两分支 coverage-matrix 有不同改法
 *
 * 检查器读取两个 StorageBackend（代表两个工作区）的数据进行比对。
 */

import type { StorageBackend } from '../storage/types.js';
import { parseJson } from '../storage/json.js';
import { Redline as RedlineSchema, type Redline } from '../change-control/schemas.js';
import { KnowledgeEntry as KnowledgeEntrySchema, type KnowledgeEntry } from '../knowledge/schemas.js';
import type {
  PreflightConflict,
  PreflightReport,
  PreflightOptions,
  ConflictResolution,
} from './types.js';

const REDLINES_PATH = 'sovei-flow/project/governance/redlines.json';
const REDLINE_EVENTS_PATH = 'sovei-flow/project/governance/redline-events.jsonl';
const PREFLIGHT_EVENTS_PATH = 'sovei-flow/project/governance/preflight-events.jsonl';
const KNOWLEDGE_DIR = 'sovei-flow/project/knowledge';
const KNOWLEDGE_TYPES = ['pitfall', 'rule', 'decision', 'code-map', 'architecture', 'preference', 'constitution'];

/**
 * 语义冲突预检检查器
 *
 * 接收两个工作区的存储后端，比对红线、知识、coverage-matrix，
 * 输出结构化的冲突报告。blocking 冲突会阻止合并。
 */
export class MergePreflightChecker {
  /**
   * 执行预检
   * @param sourceStorage 源工作区（即将被合并的分支）存储
   * @param targetStorage 目标工作区（合并目标）存储
   * @param options 预检选项
   * @returns 预检报告
   */
  async run(
    sourceStorage: StorageBackend,
    targetStorage: StorageBackend,
    options: PreflightOptions,
  ): Promise<PreflightReport> {
    const conflicts: PreflightConflict[] = [];

    // 并行加载两侧数据
    const [sourceRedlines, targetRedlines, sourceKnowledge, targetKnowledge] = await Promise.all([
      this.loadRedlines(sourceStorage),
      this.loadRedlines(targetStorage),
      this.loadAllKnowledge(sourceStorage),
      this.loadAllKnowledge(targetStorage),
    ]);

    // ① 红线冲突检测
    conflicts.push(...this.checkRedlineConflicts(sourceRedlines, targetRedlines));

    // ② 知识冲突检测
    conflicts.push(...this.checkKnowledgeConflicts(sourceKnowledge, targetKnowledge));

    // ③ coverage-matrix 冲突检测（可选，依赖 Feature 路径）
    if (options.featurePaths?.length) {
      conflicts.push(...await this.checkCoverageConflicts(
        sourceStorage, targetStorage, options.featurePaths,
      ));
    }

    const blockingCount = conflicts.filter((c) => c.severity === 'blocking').length;
    const warningCount = conflicts.filter((c) => c.severity === 'warning').length;

    const report: PreflightReport = {
      sourceWorkspace: options.sourceId,
      targetWorkspace: options.targetId,
      sourceBranch: options.sourceBranch,
      targetBranch: options.targetBranch,
      timestamp: new Date().toISOString(),
      conflicts,
      canMerge: blockingCount === 0,
      summary: {
        redlineConflicts: conflicts.filter((c) => c.category === 'redline').length,
        knowledgeConflicts: conflicts.filter((c) => c.category === 'knowledge').length,
        coverageConflicts: conflicts.filter((c) => c.category === 'coverage').length,
        blockingCount,
        warningCount,
      },
    };

    return report;
  }

  /**
   * 将预检报告写入事件流（追加式，不覆盖历史）
   * 同时写入两侧工作区，确保审计轨迹完整。
   */
  async persistReport(
    report: PreflightReport,
    sourceStorage: StorageBackend,
    targetStorage: StorageBackend,
  ): Promise<void> {
    const event = {
      type: 'PREFLIGHT_RUN' as const,
      timestamp: report.timestamp,
      sourceWorkspace: report.sourceWorkspace,
      targetWorkspace: report.targetWorkspace,
      canMerge: report.canMerge,
      conflictCount: report.conflicts.length,
      blockingCount: report.summary.blockingCount,
      conflicts: report.conflicts,
    };
    const line = JSON.stringify(event) + '\n';
    // 两侧都写，保证审计一致
    await Promise.all([
      sourceStorage.append(PREFLIGHT_EVENTS_PATH, line),
      targetStorage.append(PREFLIGHT_EVENTS_PATH, line),
    ]);
  }

  /**
   * 为冲突附上裁决（人工决定后调用），并将裁决写回事件流。
   * 已有裁决的冲突会被覆盖。
   */
  resolveConflict(
    report: PreflightReport,
    conflictId: string,
    resolution: ConflictResolution,
  ): PreflightReport {
    const conflict = report.conflicts.find((c) => c.id === conflictId);
    if (!conflict) throw new Error(`冲突未找到: ${conflictId}`);
    conflict.resolution = {
      ...resolution,
      resolvedAt: resolution.resolvedAt ?? new Date().toISOString(),
    };
    // 如果所有 blocking 冲突都已裁决（非 manual），重新评估 canMerge
    const unresolvedBlocking = report.conflicts.filter(
      (c) => c.severity === 'blocking' && (!c.resolution || c.resolution.action === 'manual'),
    );
    report.canMerge = unresolvedBlocking.length === 0;
    return report;
  }

  // ── 红线冲突检测 ──

  private checkRedlineConflicts(source: Redline[], target: Redline[]): PreflightConflict[] {
    const conflicts: PreflightConflict[] = [];
    const targetMap = new Map(target.map((r) => [r.id, r]));

    for (const srcRedline of source) {
      const tgtRedline = targetMap.get(srcRedline.id);
      if (!tgtRedline) continue; // 目标分支没有此红线，不算冲突

      // 规则内容不同 → blocking
      if (srcRedline.rule !== tgtRedline.rule) {
        conflicts.push({
          id: `redline:${srcRedline.id}`,
          category: 'redline',
          severity: 'blocking',
          description: `红线 ${srcRedline.id} 的规则在两分支中不一致`,
          sourceValue: srcRedline.rule,
          targetValue: tgtRedline.rule,
          sourceId: srcRedline.id,
          targetId: tgtRedline.id,
        });
        continue;
      }

      // 执行级别不同 → blocking
      if (srcRedline.enforcement !== tgtRedline.enforcement) {
        conflicts.push({
          id: `redline:${srcRedline.id}:enforcement`,
          category: 'redline',
          severity: 'blocking',
          description: `红线 ${srcRedline.id} 的执行级别在两分支中不一致`,
          sourceValue: srcRedline.enforcement,
          targetValue: tgtRedline.enforcement,
          sourceId: srcRedline.id,
          targetId: tgtRedline.id,
        });
        continue;
      }

      // 一方 active 一方 inactive → warning
      if (srcRedline.active !== tgtRedline.active) {
        conflicts.push({
          id: `redline:${srcRedline.id}:active`,
          category: 'redline',
          severity: 'warning',
          description: `红线 ${srcRedline.id} 在一分支中启用，另一分支中停用`,
          sourceValue: srcRedline.active ? 'active' : 'inactive',
          targetValue: tgtRedline.active ? 'active' : 'inactive',
          sourceId: srcRedline.id,
          targetId: tgtRedline.id,
        });
      }
    }

    return conflicts;
  }

  // ── 知识冲突检测 ──

  private checkKnowledgeConflicts(
    source: KnowledgeEntry[],
    target: KnowledgeEntry[],
  ): PreflightConflict[] {
    const conflicts: PreflightConflict[] = [];
    const targetMap = new Map(target.map((e) => [e.id, e]));

    for (const srcEntry of source) {
      const tgtEntry = targetMap.get(srcEntry.id);
      if (!tgtEntry) continue;

      // 内容不同 → blocking
      if (srcEntry.content !== tgtEntry.content) {
        conflicts.push({
          id: `knowledge:${srcEntry.id}`,
          category: 'knowledge',
          severity: 'blocking',
          description: `知识条目 ${srcEntry.id}（${srcEntry.type}/${srcEntry.title}）的内容在两分支中不一致`,
          sourceValue: srcEntry.content.slice(0, 200),
          targetValue: tgtEntry.content.slice(0, 200),
          sourceId: srcEntry.id,
          targetId: tgtEntry.id,
        });
        continue;
      }

      // 生命周期不同（如一分支 stable 另一分支 deprecated）→ warning
      if (srcEntry.lifecycle !== tgtEntry.lifecycle) {
        conflicts.push({
          id: `knowledge:${srcEntry.id}:lifecycle`,
          category: 'knowledge',
          severity: 'warning',
          description: `知识条目 ${srcEntry.id} 的生命周期在两分支中不一致`,
          sourceValue: srcEntry.lifecycle,
          targetValue: tgtEntry.lifecycle,
          sourceId: srcEntry.id,
          targetId: tgtEntry.id,
        });
      }
    }

    // 语义冲突检测：同类型同标题但不同 ID 且不同内容 → warning
    const srcByTitleType = new Map(source.map((e) => [`${e.type}::${e.title}`, e]));
    for (const tgtEntry of target) {
      const key = `${tgtEntry.type}::${tgtEntry.title}`;
      const srcEntry = srcByTitleType.get(key);
      if (!srcEntry || srcEntry.id === tgtEntry.id) continue;
      if (srcEntry.content === tgtEntry.content) continue;

      conflicts.push({
        id: `knowledge:semantic:${srcEntry.id}~${tgtEntry.id}`,
        category: 'knowledge',
        severity: 'warning',
        description: `可能的语义冲突：两分支在 ${tgtEntry.type}/${tgtEntry.title} 下有不同内容但 ID 不同`,
        sourceValue: `id=${srcEntry.id}, content=${srcEntry.content.slice(0, 100)}`,
        targetValue: `id=${tgtEntry.id}, content=${tgtEntry.content.slice(0, 100)}`,
        sourceId: srcEntry.id,
        targetId: tgtEntry.id,
      });
    }

    return conflicts;
  }

  // ── Coverage-matrix 冲突检测 ──

  /**
   * 比较两分支的 coverage-matrix.md。
   * coverage-matrix 是 scope 阶段产物，记录每个代码表面的变更意图。
   * 如果同一代码表面在两分支有不同的变更意图，标记为 warning。
   */
  private async checkCoverageConflicts(
    sourceStorage: StorageBackend,
    targetStorage: StorageBackend,
    featurePaths: string[],
  ): Promise<PreflightConflict[]> {
    const conflicts: PreflightConflict[] = [];

    for (const featurePath of featurePaths) {
      const sourceMatrix = await sourceStorage.read(`${featurePath}/coverage-matrix.md`);
      const targetMatrix = await targetStorage.read(`${featurePath}/coverage-matrix.md`);
      if (!sourceMatrix || !targetMatrix) continue;

      // 解析 coverage-matrix 中的代码表面条目
      const sourceSurfaces = this.parseCoverageSurfaces(sourceMatrix);
      const targetSurfaces = this.parseCoverageSurfaces(targetMatrix);

      // 找出两分支都命中的代码表面
      for (const [surface, srcAction] of sourceSurfaces) {
        const tgtAction = targetSurfaces.get(surface);
        if (!tgtAction) continue;
        if (srcAction !== tgtAction) {
          conflicts.push({
            id: `coverage:${featurePath}:${surface}`,
            category: 'coverage',
            severity: 'warning',
            description: `代码表面 "${surface}" 在两分支的 coverage-matrix 中有不同变更意图`,
            sourceValue: srcAction,
            targetValue: tgtAction,
            sourceId: `${featurePath}/coverage-matrix.md`,
            targetId: `${featurePath}/coverage-matrix.md`,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * 从 coverage-matrix.md 中解析代码表面 → 变更意图映射。
   * 支持简单的 `| surface | action |` 表格行和 `- surface: action` 列表行。
   */
  private parseCoverageSurfaces(content: string): Map<string, string> {
    const surfaces = new Map<string, string>();

    // 表格行：| surface | action | ...
    const tableRegex = /\|\s*([^\|]+?)\s*\|\s*([^\|]+?)\s*\|/g;
    // 列表行：- surface: action
    const listRegex = /^[-*]\s*(.+?):\s*(.+)$/gm;

    let match: RegExpExecArray | null;
    while ((match = tableRegex.exec(content)) !== null) {
      const surface = match[1].trim();
      const action = match[2].trim();
      // 跳过表头和分隔行
      if (surface === 'surface' || surface === 'Surface' || surface.startsWith('---') || surface.startsWith(':')) continue;
      if (action.startsWith('---') || action.startsWith(':')) continue;
      surfaces.set(surface, action);
    }

    while ((match = listRegex.exec(content)) !== null) {
      const surface = match[1].trim();
      const action = match[2].trim();
      surfaces.set(surface, action);
    }

    return surfaces;
  }

  // ── 数据加载 ──

  private async loadRedlines(storage: StorageBackend): Promise<Redline[]> {
    const content = await storage.read(REDLINES_PATH);
    if (!content) return [];
    try {
      return RedlineSchema.array().parse(parseJson(content, REDLINES_PATH));
    } catch {
      return [];
    }
  }

  private async loadAllKnowledge(storage: StorageBackend): Promise<KnowledgeEntry[]> {
    const allEntries: KnowledgeEntry[] = [];
    for (const type of KNOWLEDGE_TYPES) {
      const content = await storage.read(`${KNOWLEDGE_DIR}/${type}.json`);
      if (!content) continue;
      try {
        const entries = KnowledgeEntrySchema.array().parse(JSON.parse(content));
        allEntries.push(...entries);
      } catch {
        // 跳过损坏的知识文件
      }
    }
    return allEntries;
  }
}

/** 渲染预检报告为人类可读的 Markdown */
export function renderPreflightReport(report: PreflightReport): string {
  const lines: string[] = [];
  const branchInfo = [
    report.sourceBranch ? `分支: ${report.sourceBranch}` : '',
    report.targetBranch ? `→ ${report.targetBranch}` : '',
  ].filter(Boolean).join(' ');

  lines.push('# Merge Preflight 报告');
  lines.push('');
  lines.push(`- 源工作区: ${report.sourceWorkspace}${branchInfo ? ' (' + branchInfo + ')' : ''}`);
  lines.push(`- 目标工作区: ${report.targetWorkspace}`);
  lines.push(`- 时间: ${report.timestamp}`);
  lines.push(`- **合并状态: ${report.canMerge ? '✅ 可以合并' : '⛔ 有阻塞性冲突，不可合并'}**`);
  lines.push('');
  lines.push('## 统计');
  lines.push('');
  lines.push(`| 类别 | 数量 |`);
  lines.push(`|---|---|`);
  lines.push(`| 红线冲突 | ${report.summary.redlineConflicts} |`);
  lines.push(`| 知识冲突 | ${report.summary.knowledgeConflicts} |`);
  lines.push(`| Coverage 冲突 | ${report.summary.coverageConflicts} |`);
  lines.push(`| **Blocking** | **${report.summary.blockingCount}** |`);
  lines.push(`| Warning | ${report.summary.warningCount} |`);
  lines.push('');

  if (report.conflicts.length === 0) {
    lines.push('未检测到语义冲突。');
    lines.push('');
    return lines.join('\n');
  }

  lines.push('## 冲突详情');
  lines.push('');

  for (const conflict of report.conflicts) {
    const icon = conflict.severity === 'blocking' ? '⛔' : '⚠️';
    lines.push(`### ${icon} [${conflict.category}] ${conflict.id}`);
    lines.push('');
    lines.push(`- **描述**: ${conflict.description}`);
    lines.push(`- **严重度**: ${conflict.severity}`);
    lines.push(`- **源分支值**: ${conflict.sourceValue}`);
    lines.push(`- **目标分支值**: ${conflict.targetValue}`);
    if (conflict.resolution) {
      lines.push(`- **裁决**: ${conflict.resolution.action} — ${conflict.resolution.reason}`);
      if (conflict.resolution.resolvedBy) {
        lines.push(`  - 裁决人: ${conflict.resolution.resolvedBy}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
