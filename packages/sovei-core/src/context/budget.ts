/**
 * 上下文字符预算截断模块
 *
 * 按优先级对 ContextItem 列表施加字符预算限制。
 * 超预算的项降级为 ContextIndexItem（仅保留 240 字符摘要），移入 unloaded 列表。
 * 全局不变量红线（untouchableIds）不被截断。
 */

import type { ContextItem } from './builder.js';
import type { ContextIndexItem } from './policy.js';

/** 预算截断结果 */
export interface BudgetResult {
  /** 保留在 required 的项 */
  retained: ContextItem[];
  /** 被截断降级为索引摘要的项 */
  unloaded: ContextIndexItem[];
  /** 保留项的总字符数 */
  totalCharacters: number;
  /** 预算上限 */
  budget: number;
  /** 是否超预算（即是否有项被截断） */
  exceeded: boolean;
}

/** 优先级权重——数字越大越优先保留 */
const PRIORITY_WEIGHTS: Record<string, number> = {
  'redline:active': 100,           // 红线——不可截断（但仍参与计数）
  'project-rule:required': 80,     // required 规范
  'feature-artifact:current': 70,  // Feature 产物
  'rule:stable': 60,               // stable 知识
  'cross-feature:cross-feature': 40, // cross-feature 决策日志
  'rule:candidate': 30,            // candidate 知识
  'rule:pending': 25,              // pending 知识
  'project-rule:advisory': 10,     // advisory 规范
};

/** 获取 ContextItem 的优先级权重 */
function getPriority(item: ContextItem): number {
  const key = `${item.type}:${item.lifecycle}`;
  return PRIORITY_WEIGHTS[key] ?? 20; // 未知类型给中等偏低权重
}

/** 将 ContextItem 转为 ContextIndexItem（240 字符摘要） */
function toIndexItem(item: ContextItem): ContextIndexItem {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    source: item.source,
    summary: item.content.replace(/\s+/g, ' ').slice(0, 240),
    expandable: item.content.length > 240,
  };
}

/**
 * 按字符预算截断 ContextItem 列表。
 *
 * 算法：
 * 1. 将项按优先级降序排列
 * 2. 逐项累加字符数
 * 3. 当累计超过预算时，剩余项降级为索引摘要
 * 4. untouchableIds 中的项始终保留（即使超预算）
 *
 * @param items 待截断的 ContextItem 列表
 * @param budget 字符预算上限
 * @param options.untouchableIds 不可截断的项 ID 列表（如全局不变量红线）
 */
export function applyBudget(
  items: ContextItem[],
  budget: number,
  options?: { untouchableIds?: string[] },
): BudgetResult {
  const untouchable = new Set(options?.untouchableIds ?? []);

  // 按优先级降序排列，同优先级保持原序
  const indexed = items.map((item, originalIndex) => ({ item, originalIndex }));
  indexed.sort((a, b) => {
    const pa = getPriority(a.item);
    const pb = getPriority(b.item);
    if (pa !== pb) return pb - pa;
    return a.originalIndex - b.originalIndex;
  });

  const retained: ContextItem[] = [];
  const unloaded: ContextIndexItem[] = [];
  let totalCharacters = 0;
  let budgetExceeded = false;

  for (const { item } of indexed) {
    const itemChars = item.content.length;
    const isUntouchable = untouchable.has(item.id);

    if (isUntouchable) {
      // 不可截断——始终保留，即使超预算
      retained.push(item);
      totalCharacters += itemChars;
    } else if (totalCharacters + itemChars <= budget) {
      // 加入后仍未超预算——保留
      retained.push(item);
      totalCharacters += itemChars;
    } else {
      // 加入后会超预算——降级为索引摘要
      unloaded.push(toIndexItem(item));
      budgetExceeded = true;
    }
  }

  return {
    retained,
    unloaded,
    totalCharacters,
    budget,
    exceeded: unloaded.length > 0,
  };
}

/** 默认预算优先级配置（供外部参考） */
export const DEFAULT_BUDGET_PRIORITIES = PRIORITY_WEIGHTS;
