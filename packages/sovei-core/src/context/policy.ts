import type { ContextItem, ContextPack } from './builder.js';
import type { Redline } from '../change-control/schemas.js';
import type { LoadedProjectRule } from '../rules/schemas.js';

export const CONTEXT_POLICY_VERSION = '1';

export interface ContextPolicyControlPlane {
  policyVersion: string;
  baselineRevision: string | null;
  globalInvariantIds: string[];
  matchedRedlineIds: string[];
  selectionDecision: string;
  unloadedCandidateIds: string[];
  status: 'stable' | 'expanded' | 'escalated' | 'over-budget';
}

export interface ContextIndexItem {
  id: string;
  type: string;
  title: string;
  source: string;
  summary: string;
  expandable: boolean;
}

export interface ContextShadowVariant {
  name: 'full' | 'scoped' | 'index+on-demand';
  required: ContextItem[];
  indexed: ContextIndexItem[];
  expanded: ContextItem[];
  unloaded: ContextIndexItem[];
  characters: number;
}

export interface ContextShadowSummary {
  name: ContextShadowVariant['name'];
  ids: {
    required: string[];
    indexed: string[];
    expanded: string[];
    unloaded: string[];
  };
  counts: {
    required: number;
    indexed: number;
    expanded: number;
    unloaded: number;
  };
  sizes: {
    requiredCharacters: number;
    indexedCharacters: number;
    expandedCharacters: number;
  };
  characters: number;
}

export function summarizeContextShadow(variant: ContextShadowVariant): ContextShadowSummary {
  return {
    name: variant.name,
    ids: {
      required: variant.required.map((item) => item.id),
      indexed: variant.indexed.map((item) => item.id),
      expanded: variant.expanded.map((item) => item.id),
      unloaded: variant.unloaded.map((item) => item.id),
    },
    counts: {
      required: variant.required.length,
      indexed: variant.indexed.length,
      expanded: variant.expanded.length,
      unloaded: variant.unloaded.length,
    },
    sizes: {
      requiredCharacters: variant.required.reduce((sum, item) => sum + item.content.length, 0),
      indexedCharacters: variant.indexed.reduce((sum, item) => sum + item.summary.length, 0),
      expandedCharacters: variant.expanded.reduce((sum, item) => sum + item.content.length, 0),
    },
    characters: variant.characters,
  };
}

export interface ContextPolicyResult {
  controlPlane: ContextPolicyControlPlane;
  index: ContextIndexItem[];
  shadow: {
    full: ContextShadowVariant;
    scoped: ContextShadowVariant;
    indexOnDemand: ContextShadowVariant;
    actual: 'full';
    compatibility: 'preserved';
  };
}

export interface ContextPolicyOptions {
  baselineRevision?: string | null;
  paths?: string[];
  symbols?: string[];
  domains?: string[];
  stage?: string;
}

function normalize(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
}

function indexItem(item: ContextItem): ContextIndexItem {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    source: item.source,
    summary: item.content.replace(/\s+/g, ' ').slice(0, 240),
    expandable: item.content.length > 240,
  };
}

function matchesTarget(item: ContextItem, options: ContextPolicyOptions): boolean {
  const paths = (options.paths ?? []).map(normalize).filter(Boolean);
  if (!paths.length) return true;
  const searchable = normalize(`${item.source} ${item.id} ${item.title} ${item.content}`);
  return paths.some((path) => searchable.includes(path));
}

function variant(name: ContextShadowVariant['name'], required: ContextItem[], indexed: ContextIndexItem[], expanded: ContextItem[], unloaded: ContextIndexItem[]): ContextShadowVariant {
  const characters = [...required, ...expanded].reduce((sum, item) => sum + item.content.length, 0)
    + indexed.reduce((sum, item) => sum + item.summary.length, 0);
  return { name, required, indexed, expanded, unloaded, characters };
}

export function buildContextPolicy(pack: ContextPack, redlines: Redline[], projectRules: LoadedProjectRule[], options: ContextPolicyOptions = {}): ContextPolicyResult {
  const allItems = [...pack.required, ...pack.suggested];
  const globalInvariantIds = redlines
    .filter((redline) => redline.active && redline.enforcement === 'absolute' && !redline.scope)
    .map((redline) => redline.id)
    .sort();
  const matchedRedlineIds = redlines
    .filter((redline) => redline.active && matchesTarget({
      source: 'governance/redlines.json',
      id: redline.id,
      type: 'redline',
      title: redline.title,
      content: `${redline.rule} ${redline.scope ?? ''}`,
      lifecycle: 'active',
      contentHash: '',
      citation: '',
    }, options))
    .map((redline) => redline.id)
    .sort();

  const index = allItems.map(indexItem);
  const targeted = allItems.filter((item) => matchesTarget(item, options));
  const globalInvariantItems = allItems.filter((item) => globalInvariantIds.includes(item.id));
  const scopedRequired = [...new Map(
    [...globalInvariantItems, ...targeted.filter((item) => item.type === 'redline' || item.type === 'project-rule' || item.type === 'feature-artifact')]
      .map((item) => [item.id, item]),
  ).values()];
  const scopedRequiredIds = new Set(scopedRequired.map((item) => item.id));
  const targetedIds = new Set(targeted.map((item) => item.id));
  const candidates = index.filter((item) => !targetedIds.has(item.id) && !scopedRequiredIds.has(item.id));
  const scopedExpanded = targeted.filter((item) => !scopedRequiredIds.has(item.id));
  const full = variant('full', pack.required, [], pack.required, pack.suggested.map(indexItem));
  const scoped = variant('scoped', scopedRequired, candidates, scopedExpanded, candidates);
  const indexOnDemand = variant('index+on-demand', [], index, [], index);
  const uncertain = Boolean(options.paths?.length) && candidates.some((item) => item.type === 'redline' || item.type === 'project-rule');
  const status = uncertain ? 'expanded' : 'stable';

  return {
    controlPlane: {
      policyVersion: CONTEXT_POLICY_VERSION,
      baselineRevision: options.baselineRevision ?? null,
      globalInvariantIds,
      matchedRedlineIds,
      selectionDecision: uncertain
        ? 'target match uncertain; retain candidates and allow one expansion before escalation'
        : 'target match deterministic; shadow only, actual context remains full',
      unloadedCandidateIds: candidates.map((item) => item.id),
      status,
    },
    index,
    shadow: {
      full,
      scoped,
      indexOnDemand,
      actual: 'full',
      compatibility: 'preserved',
    },
  };
}
