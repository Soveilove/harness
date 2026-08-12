/**
 * Redline human-review view renderer.
 *
 * Single source of truth stays machine-readable (redlines.json +
 * redline-events.jsonl + redlines-seed.json); this module derives a
 * read-only Markdown view for humans. Never parse this file back.
 */

import type { Redline } from './schemas.js';

export interface RedlineEvent {
  type: string;
  timestamp: string;
  redline?: Redline;
  redlineId?: string;
  reason?: string;
  patch?: Record<string, unknown>;
}

export interface SeedRedline {
  id: string;
  title: string;
  rule: string;
  enforcement: 'absolute' | 'approval-required';
  source?: string;
  category?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface RedlineSeed {
  schemaVersion?: number;
  generatedAt?: string;
  scannerVersion?: string;
  redlines: SeedRedline[];
}

export interface RedlineViewInput {
  redlines: Redline[];
  events: RedlineEvent[];
  seed: RedlineSeed | null;
  generatedAt: string;
}

export const REDLINES_VIEW_FILE = 'sovei-flow/project/governance/redlines.md';

const ENFORCEMENT_LABEL: Record<Redline['enforcement'], string> = {
  absolute: '绝对红线',
  'approval-required': '审批红线',
};

const ORIGIN_LABEL: Record<string, string> = {
  manual: '人工声明',
  'scanner-seed': '扫描器候选转正',
};

function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function date(text: string): string {
  return text.slice(0, 10);
}

function describeEvent(event: RedlineEvent): string {
  switch (event.type) {
    case 'REDLINE_ADDED':
      return `新增红线 ${event.redline?.id ?? '?'}`;
    case 'REDLINE_UPDATED':
      return `更新红线 ${event.redlineId ?? event.redline?.id ?? '?'}（字段：${Object.keys(event.patch ?? {}).join(', ') || '无'}）`;
    case 'REDLINE_DEACTIVATED':
      return `停用红线 ${event.redlineId ?? '?'}${event.reason ? `：${event.reason}` : ''}`;
    default:
      return event.type;
  }
}

function renderDetail(redline: Redline): string {
  const lines: string[] = [];
  lines.push(`### ${redline.id} — ${redline.title}`);
  lines.push('');
  lines.push(`- **级别**：${ENFORCEMENT_LABEL[redline.enforcement]}（${redline.enforcement}）`);
  lines.push(`- **规则**：${redline.rule}`);
  if (redline.rationale) {
    lines.push(`- **为什么有这条红线**：${redline.rationale}`);
  } else {
    lines.push(`- **为什么有这条红线**：未填写。请补充：\`sovei governance redline update ${redline.id} --rationale "..."\``);
  }
  if (redline.scope) lines.push(`- **适用范围**：${redline.scope}`);
  if (redline.branches?.length) lines.push(`- **分支作用域**：${redline.branches.join(', ')}`);
  if (redline.examples?.length) {
    lines.push('- **典型违规示例**：');
    for (const example of redline.examples) {
      lines.push(`  - ${example}`);
    }
  }
  if (redline.owner) lines.push(`- **负责人**：${redline.owner}`);
  if (redline.reviewedBy) {
    lines.push(`- **人工审查**：${redline.reviewedBy}${redline.reviewedAt ? `（${date(redline.reviewedAt)}）` : ''}`);
  } else {
    lines.push(`- **人工审查**：未审查。确认后执行：\`sovei governance redline update ${redline.id} --reviewer "..."\``);
  }
  if (redline.origin) lines.push(`- **来源**：${ORIGIN_LABEL[redline.origin] ?? redline.origin}`);
  lines.push(`- **创建**：${date(redline.createdAt)} **最后更新**：${date(redline.updatedAt)}`);
  lines.push('');
  return lines.join('\n');
}

export function renderRedlinesMarkdown(input: RedlineViewInput): string {
  const { redlines, events, seed, generatedAt } = input;
  const active = redlines.filter((redline) => redline.active);
  const inactive = redlines.filter((redline) => !redline.active);
  const absoluteCount = active.filter((redline) => redline.enforcement === 'absolute').length;
  const approvalCount = active.length - absoluteCount;
  const candidates = seed?.redlines ?? [];
  const activeIds = new Set(active.map((redline) => redline.id));

  const parts: string[] = [];
  parts.push('# 业务红线（人工审查视图）');
  parts.push('');
  parts.push('> 本文件由 `sovei governance redline render` 自动生成，仅供人工阅读与审查。');
  parts.push('> 事实源是 `redlines.json`（当前状态）与 `redline-events.jsonl`（审计事件），AI 上下文从事实源读取。');
  parts.push('> 请勿手改本文件；修改红线请使用 `sovei governance redline add/update/deactivate`，操作后会自动重新生成。');
  parts.push('');
  parts.push(`- 生成时间：${generatedAt}`);
  parts.push(`- 生效红线：${active.length} 条（绝对 ${absoluteCount} / 审批 ${approvalCount}）`);
  parts.push(`- 已停用：${inactive.length} 条`);
  parts.push(`- 待审候选：${candidates.length} 条${candidates.length ? '（扫描器生成，未激活）' : ''}`);
  parts.push('');

  parts.push('## 级别说明');
  parts.push('');
  parts.push('- **绝对红线（absolute）**：不允许例外。重大变更评审（Change Request）中只能标记 unaffected 或 compliant，标记 approved-exception 会被拒绝应用。');
  parts.push('- **审批红线（approval-required）**：允许授权例外，但必须提供审批人、审批时间和审批依据（approvedBy / approvedAt / approvalReference）。');
  parts.push('');

  parts.push('## 生效红线一览');
  parts.push('');
  if (!active.length) {
    parts.push('暂无生效红线。使用 `sovei governance redline add <ID> --title ... --rule ...` 声明。');
    parts.push('');
  } else {
    parts.push('| ID | 标题 | 级别 | 规则 | 为什么 | 最后更新 |');
    parts.push('|---|---|---|---|---|---|');
    for (const redline of active) {
      parts.push(`| ${redline.id} | ${cell(redline.title)} | ${ENFORCEMENT_LABEL[redline.enforcement]} | ${cell(redline.rule)} | ${redline.rationale ? cell(redline.rationale) : '未填写'} | ${date(redline.updatedAt)} |`);
    }
    parts.push('');
  }

  if (active.length) {
    parts.push('## 红线详情');
    parts.push('');
    for (const redline of active) {
      parts.push(renderDetail(redline));
    }
  }

  if (inactive.length) {
    parts.push('## 已停用红线');
    parts.push('');
    for (const redline of inactive) {
      const deactivation = [...events].reverse()
        .find((event) => event.type === 'REDLINE_DEACTIVATED' && event.redlineId === redline.id);
      parts.push(`- **${redline.id}** — ${redline.title}（${date(redline.updatedAt)} 停用${deactivation?.reason ? `：${deactivation.reason}` : ''}）`);
    }
    parts.push('');
  }

  if (candidates.length) {
    parts.push('## 待审候选（扫描器生成，未激活）');
    parts.push('');
    parts.push('> 候选来自 `redlines-seed.json`，不会自动生效。人工确认后逐条激活：');
    parts.push('> `sovei governance redline add <ID> --title "..." --rule "..." --enforcement absolute --rationale "..."`');
    parts.push('> 已确认不需要的候选可忽略；重复运行扫描会覆盖 seed 文件，但不会影响已激活红线。');
    parts.push('');
    parts.push('| ID | 置信度 | 类别 | 标题 | 规则 | 来源 | 状态 |');
    parts.push('|---|---|---|---|---|---|---|');
    for (const candidate of candidates) {
      const status = activeIds.has(candidate.id) ? '已激活' : '待审';
      parts.push(`| ${candidate.id} | ${candidate.confidence ?? '?'} | ${candidate.category ?? '?'} | ${cell(candidate.title)} | ${cell(candidate.rule)} | ${cell(candidate.source ?? '')} | ${status} |`);
    }
    parts.push('');
  }

  parts.push('## 变更历史（最近 20 条）');
  parts.push('');
  const recent = [...events].reverse().slice(0, 20);
  if (!recent.length) {
    parts.push('暂无事件。');
    parts.push('');
  } else {
    parts.push('| 时间 | 事件 |');
    parts.push('|---|---|');
    for (const event of recent) {
      parts.push(`| ${event.timestamp} | ${cell(describeEvent(event))} |`);
    }
    parts.push('');
  }

  return parts.join('\n');
}
