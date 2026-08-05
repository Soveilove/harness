/**
 * Context Builder
 *
 * Assembles a versioned context pack for a host agent.
 * `required` items are deterministic (active redlines, stable rules, Feature contracts).
 * `suggested` items are scored retrievals (candidate/pending knowledge, optional semantic).
 */

import { createHash } from 'node:crypto';
import type { KnowledgeEntry } from '../knowledge/schemas.js';
import type { Redline } from '../change-control/schemas.js';
import { searchEntries } from '../knowledge/selectors.js';
import type { KnowledgeSnapshot } from './snapshot.js';
import type { LoadedProjectRule } from '../rules/schemas.js';

export interface ContextItem {
  source: string;
  id: string;
  type: string;
  title: string;
  content: string;
  lifecycle: string;
  contentHash: string;
  citation: string;
}

export interface ContextPack {
  schemaVersion: 1;
  feature: string;
  stage: string;
  adapter: string | null;
  query: string | null;
  required: ContextItem[];
  suggested: ContextItem[];
  snapshot: KnowledgeSnapshot | null;
  builtAt: string;
}

function hashContent(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function fromRedline(rl: Redline): ContextItem {
  const sections = [rl.rule];
  if (rl.rationale) sections.push(`为什么：${rl.rationale}`);
  if (rl.scope) sections.push(`适用范围：${rl.scope}`);
  if (rl.examples?.length) sections.push(`典型违规示例：${rl.examples.join('；')}`);
  const content = sections.join('\n');
  return {
    source: 'governance/redlines.json',
    id: rl.id,
    type: 'redline',
    title: rl.title,
    content,
    lifecycle: rl.active ? 'active' : 'inactive',
    contentHash: hashContent(rl.id + content),
    citation: `红线 ${rl.id}（${rl.enforcement}）`,
  };
}

function fromKnowledge(entry: KnowledgeEntry, required: boolean): ContextItem {
  return {
    source: `knowledge/${entry.type}.json`,
    id: entry.id,
    type: entry.type,
    title: entry.title,
    content: entry.content,
    lifecycle: entry.lifecycle,
    contentHash: hashContent(entry.id + entry.content),
    citation: required
      ? `${entry.type} ${entry.id}（stable，确定性必选）`
      : `${entry.type} ${entry.id}（${entry.lifecycle}，建议参考）`,
  };
}

function fromProjectRule(rule: LoadedProjectRule): ContextItem {
  const verification = rule.verification.map((item) => item.type === 'command'
    ? `- command: ${item.command} (${item.description})`
    : `- review: ${item.description}`);
  const content = verification.length
    ? `${rule.instruction}\n\nVerification:\n${verification.join('\n')}`
    : rule.instruction;
  return {
    source: rule.source,
    id: rule.id,
    type: 'project-rule',
    title: rule.title,
    content,
    lifecycle: rule.lifecycle,
    contentHash: hashContent(rule.id + content),
    citation: `项目规范 ${rule.id}（${rule.enforcement}，${rule.source}）`,
  };
}

function fromArtifact(name: string, content: string): ContextItem {
  return {
    source: `specs/${name}`,
    id: name,
    type: 'feature-artifact',
    title: name,
    content: content.slice(0, 4000),
    lifecycle: 'current',
    contentHash: hashContent(name + content),
    citation: `Feature 产物 ${name}`,
  };
}

export interface ContextBuildOptions {
  feature: string;
  stage: string;
  adapter?: string;
  query?: string;
  redlines: Redline[];
  projectRules?: LoadedProjectRule[];
  knowledge: KnowledgeEntry[];
  artifacts: Array<{ name: string; content: string }>;
  crossFeatureArtifacts?: Array<{ featureId: string; name: string; content: string }>;
  snapshot: KnowledgeSnapshot | null;
}

export function buildContextPack(opts: ContextBuildOptions): ContextPack {
  const required: ContextItem[] = [];

  // 1. Active redlines are always required
  for (const rl of opts.redlines.filter((r) => r.active)) {
    required.push(fromRedline(rl));
  }

  // 2. Stable rules are always required
  for (const entry of opts.knowledge.filter((e) => e.lifecycle === 'stable' && e.type === 'rule')) {
    required.push(fromKnowledge(entry, true));
  }

  // 3. Active project rules are deterministic and already scope-resolved.
  for (const rule of (opts.projectRules ?? []).filter((item) => item.lifecycle === 'active')) {
    const contextItem = fromProjectRule(rule);
    if (rule.enforcement === 'required') required.push(contextItem);
  }

  // 4. Current Feature contract artifacts are required
  for (const artifact of opts.artifacts) {
    required.push(fromArtifact(artifact.name, artifact.content));
  }

  // Suggested: candidate/pending knowledge, optionally filtered by query
  let suggested = opts.knowledge.filter(
    (e) => e.lifecycle === 'candidate' || e.lifecycle === 'pending',
  );
  if (opts.query) {
    suggested = searchEntries(suggested, opts.query);
  }
  const suggestedItems = suggested.slice(0, 20).map((e) => fromKnowledge(e, false));
  for (const rule of (opts.projectRules ?? []).filter((item) => item.lifecycle === 'active' && item.enforcement === 'advisory')) {
    suggestedItems.push(fromProjectRule(rule));
  }

  // Cross-feature decision logs help the agent understand prior context.
  for (const cross of (opts.crossFeatureArtifacts ?? [])) {
    const truncated = cross.content.slice(0, 4000);
    suggestedItems.push({
      source: `specs/${cross.featureId}/${cross.name}`,
      id: `${cross.featureId}/${cross.name}`,
      type: 'cross-feature',
      title: `${cross.featureId} / ${cross.name}`,
      content: truncated,
      lifecycle: 'cross-feature',
      contentHash: hashContent(cross.featureId + cross.name + truncated),
      citation: `Feature ${cross.featureId} 的 ${cross.name}（历史决策，建议参考）`,
    });
  }

  return {
    schemaVersion: 1,
    feature: opts.feature,
    stage: opts.stage,
    adapter: opts.adapter ?? null,
    query: opts.query ?? null,
    required,
    suggested: suggestedItems,
    snapshot: opts.snapshot,
    builtAt: new Date().toISOString(),
  };
}

/** Render a ContextPack as human-readable Markdown for review. */
export function renderContextPackMarkdown(pack: ContextPack): string {
  const lines: string[] = [
    `# 上下文包：${pack.feature} / ${pack.stage}`,
    '',
    `> 生成时间：${pack.builtAt}`,
    `> 适配器：${pack.adapter ?? '（默认）'}`,
    `> 查询：${pack.query ?? '（无）'}`,
    '',
    '## 必选上下文（required）',
    '',
  ];
  if (!pack.required.length) lines.push('（无）');
  for (const item of pack.required) {
    lines.push(`### ${item.citation}`, '', '```', item.content, '```', '');
  }
  lines.push('## 建议参考（suggested）', '');
  if (!pack.suggested.length) lines.push('（无）');
  for (const item of pack.suggested) {
    lines.push(`- ${item.citation}`);
  }
  if (pack.snapshot) {
    lines.push('', '## 知识快照', '', `- indexVersion: ${pack.snapshot.indexVersion}`, `- sourceHash: ${pack.snapshot.sourceHash.slice(0, 16)}…`, `- entryCount: ${pack.snapshot.entryCount}`, `- stale: ${pack.snapshot ? '否' : '是'}`, '');
  } else {
    lines.push('', '## 知识快照', '', '（无快照，视为 stale）', '');
  }
  return lines.join('\n');
}
