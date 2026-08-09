/**
 * Merge Preflight — 语义冲突预检类型定义
 *
 * 在 git 文本冲突检查之上做业务语义冲突预检：
 * ① 红线冲突——同一业务域被两分支定义了相反/矛盾的红线
 * ② 知识/决策冲突——两分支的知识/决策条目互相矛盾
 * ③ coverage 冲突——同一代码表面被两分支 coverage-matrix 命中且改法矛盾
 * ④ 冲突裁决——合并/隔离/覆盖/人工介入，每次裁决写理由进事件流
 * ⑤ 输出 preflight 报告——无 blocking 冲突才允许 merge
 */

/** 冲突类别 */
export type ConflictCategory = 'redline' | 'knowledge' | 'coverage';

/**
 * 冲突严重度：
 * - blocking：阻止合并，必须人工介入或解决后才能合并
 * - warning：警告，不阻止合并但需人工知晓
 */
export type ConflictSeverity = 'blocking' | 'warning';

/**
 * 冲突裁决动作（对应设计文档 §3.4 ③）
 * - merge：两分支定义可安全合并（内容一致或互补）
 * - isolate：保持隔离，工程专属不合并
 * - override：一方覆盖另一方（需附理由）
 * - manual：必须人工介入
 */
export type ResolutionAction = 'merge' | 'isolate' | 'override' | 'manual';

/** 冲突裁决——记录决定和理由，写入事件流 */
export interface ConflictResolution {
  action: ResolutionAction;
  reason: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

/** 单条冲突记录 */
export interface PreflightConflict {
  /** 冲突唯一标识，格式：{category}:{sourceId}→{targetId} */
  id: string;
  /** 冲突类别 */
  category: ConflictCategory;
  /** 严重度 */
  severity: ConflictSeverity;
  /** 人类可读的冲突描述 */
  description: string;
  /** 源分支（即将被合并的分支）的值摘要 */
  sourceValue: string;
  /** 目标分支（合并目标）的值摘要 */
  targetValue: string;
  /** 冲突来源的条目 ID */
  sourceId: string;
  /** 冲突目标条目 ID */
  targetId: string;
  /** 裁决结果（未裁决时为 undefined） */
  resolution?: ConflictResolution;
}

/** Preflight 报告 */
export interface PreflightReport {
  /** 源工作区 ID */
  sourceWorkspace: string;
  /** 目标工作区 ID */
  targetWorkspace: string;
  /** 源分支名 */
  sourceBranch?: string;
  /** 目标分支名 */
  targetBranch?: string;
  /** 报告生成时间 */
  timestamp: string;
  /** 检测到的所有冲突 */
  conflicts: PreflightConflict[];
  /** 是否可以安全合并（无 blocking 冲突） */
  canMerge: boolean;
  /** 分类统计 */
  summary: {
    redlineConflicts: number;
    knowledgeConflicts: number;
    coverageConflicts: number;
    blockingCount: number;
    warningCount: number;
  };
}

/** Preflight 检查器选项 */
export interface PreflightOptions {
  /** 源工作区 ID */
  sourceId: string;
  /** 目标工作区 ID */
  targetId: string;
  /** 源分支名（可选，用于报告标注） */
  sourceBranch?: string;
  /** 目标分支名（可选，用于报告标注） */
  targetBranch?: string;
  /** 要检查的 Feature 路径列表（用于 coverage-matrix 检查，可选） */
  featurePaths?: string[];
}

/** Preflight 事件——写入事件流用于审计 */
export interface PreflightEvent {
  type: 'PREFLIGHT_RUN';
  timestamp: string;
  sourceWorkspace: string;
  targetWorkspace: string;
  canMerge: boolean;
  conflictCount: number;
  blockingCount: number;
  conflicts: PreflightConflict[];
}
