/**
 * Stale-Aware L1 — 过期感知（个人级粗粒度）
 *
 * 核心思路：个人绕过 Sovei 工作流直接修改代码后，治理资产（红线/知识/代码地图）可能不再可信。
 * 本模块对比「当前 git HEAD」与「上次通过 Sovei sync 校准治理资产时的 HEAD」，
 * 若自上次 sync 以来 HEAD 已前进（有新提交），则提示治理资产可能过期。
 *
 * 只做仓库级粗粒度检测（HEAD 是否变化），不解析提交内容——那是语义级 drift（L3），本期不做。
 */

import type { StorageBackend } from '../storage/types.js';
import { getGitBaseline, getGitBranch } from '../quick/git-verifier.js';

/** 仓库级 sync 基线文件路径（与红线/知识等治理资产同目录）。 */
export const SYNC_BASELINE_PATH = 'harness/project/governance/sync-baseline.json';

/** sync 基线文件 schema 版本（持久化结构，遵循 PERSISTED_SCHEMA_COMPAT）。 */
export const SYNC_BASELINE_SCHEMA_VERSION = 1 as const;

export interface SyncBaseline {
  schemaVersion: number;
  branch: string | null;
  head: string | null;
  recordedAt: string | null;
}

export interface StaleStatus {
  /** 是否过期：存在基线、同分支、且当前 HEAD 与基线 HEAD 不同。 */
  isStale: boolean;
  /** sync 基线记录的 HEAD。 */
  baselineRevision: string | null;
  /** 当前 HEAD。 */
  currentHead: string | null;
  /** sync 基线记录时间（ISO）。 */
  recordedAt: string | null;
  /** sync 基线记录的分支。 */
  branch: string | null;
}

/** 将 SyncBaseline 序列化为存储用 JSON 字符串。 */
export function serializeSyncBaseline(baseline: SyncBaseline): string {
  return JSON.stringify(baseline, null, 2);
}

/** 解析存储中的基线 JSON；缺失或格式非法返回 null（视为无基线，不误报）。 */
export function parseSyncBaseline(content: string | null): SyncBaseline | null {
  if (!content) return null;
  try {
    const raw = JSON.parse(content) as Partial<SyncBaseline>;
    if (typeof raw !== 'object' || raw === null) return null;
    return {
      schemaVersion: raw.schemaVersion ?? SYNC_BASELINE_SCHEMA_VERSION,
      branch: typeof raw.branch === 'string' ? raw.branch : null,
      head: typeof raw.head === 'string' ? raw.head : null,
      recordedAt: typeof raw.recordedAt === 'string' ? raw.recordedAt : null,
    };
  } catch {
    return null;
  }
}

/**
 * 检测治理资产是否过期。
 *
 * 判定规则：
 * - 无基线文件 → isStale=false（从未 sync，把「未知」当「不过期」，避免误报）。
 * - HEAD 读取失败 / 非 git 仓库 → isStale=false。
 * - 基线分支与当前分支不同 → isStale=false（跨分支由红线 branch 隔离处理，L1 不覆盖）。
 * - 同分支且 HEAD !== 基线 head → isStale=true。
 * - 同分支且 HEAD === 基线 head → isStale=false。
 */
export async function checkStale(storage: StorageBackend, rootPath: string): Promise<StaleStatus> {
  const baseline = parseSyncBaseline(await storage.read(SYNC_BASELINE_PATH));
  const currentHead = await getGitBaseline(rootPath);
  const currentBranch = await getGitBranch(rootPath);

  // 无基线 或 HEAD 不可读 → 不提示（AC-4 / AC-5）
  if (!baseline || !currentHead) {
    return {
      isStale: false,
      baselineRevision: baseline?.head ?? null,
      currentHead,
      recordedAt: baseline?.recordedAt ?? null,
      branch: baseline?.branch ?? null,
    };
  }

  // 分支不同 或 HEAD 相同 → 不提示
  const sameBranch = baseline.branch != null && currentBranch != null && baseline.branch === currentBranch;
  if (!sameBranch || baseline.head === currentHead) {
    return {
      isStale: false,
      baselineRevision: baseline.head,
      currentHead,
      recordedAt: baseline.recordedAt,
      branch: baseline.branch,
    };
  }

  // 同分支且 HEAD 前进 → 过期
  return {
    isStale: true,
    baselineRevision: baseline.head,
    currentHead,
    recordedAt: baseline.recordedAt,
    branch: baseline.branch,
  };
}

/** 将过期状态格式化为人类可读的中文警告块（context build Markdown / quick 行通用）。 */
export function formatStaleWarning(status: StaleStatus): string {
  if (!status.isStale) return '';
  const lines = [
    '⚠ 治理资产可能已过期（stale-aware L1）',
    `  基线：${status.baselineRevision ?? '未知'}`,
    `  当前：${status.currentHead ?? '未知'}`,
    `  分支：${status.branch ?? '未知'}`,
    `  记录于：${status.recordedAt ?? '未知'}`,
    '  提示：代码可能已在 Sovei 工作流之外被修改，红线/知识/地图可能不可信。',
    '  校准：运行 `sovei workflow sync <feature> --complete` 以当前分支为基线重新校准。',
  ];
  return lines.join('\n');
}
