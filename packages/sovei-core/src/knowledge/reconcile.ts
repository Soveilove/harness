/**
 * Knowledge Reconciliation Engine
 *
 * Closes the learn → knowledge loop: parses structured observations from
 * learning-report.md, matches them against existing knowledge entries,
 * and auto-applies ADD / PROMOTE operations.
 *
 * Automation rules:
 * - New observation (no match)        → ADD as candidate
 * - Existing entry + new evidence     → PROMOTE with evidence
 * - candidate with ≥ 2 evidence       → auto-advance to pending
 * - pending with ≥ 3 evidence         → auto-advance to stable (logged for retrospective review)
 *
 * The single human gate ("修改 stable 前必须人工审查") is replaced by a
 * "trust-but-verify" model: stable promotions happen automatically when
 * 3+ independent Features provide evidence, but every auto-promotion is
 * recorded in a promotion log for retrospective audit. Humans can revert
 * via `sovei knowledge deprecate`.
 */

import { createHash } from 'node:crypto';
import type { KnowledgeStore } from './store.js';
import type { KnowledgeEntry, Lifecycle } from './schemas.js';
import { KnowledgeType, canTransition, MIN_EVIDENCE_COUNT } from './schemas.js';

// ── Types ──

export interface ParsedObservation {
  title: string;
  type: KnowledgeType;
  content: string;
  tags: string[];
  /** "candidate" | "pending-proposal" | "stable-proposal" | "rejected" */
  category: string;
  /** Evidence description from the learning report */
  evidence: string;
  /** AI-suggested related entry ID (may be null or wrong) */
  relatedEntryId?: string | null;
}

export interface ReconcileResult {
  added: { id: string; title: string; type: KnowledgeType }[];
  promoted: { id: string; title: string; from: Lifecycle; to: Lifecycle; feature: string }[];
  autoStable: { id: string; title: string; evidenceCount: number }[];
  skipped: { title: string; reason: string }[];
  errors: { title: string; error: string }[];
}

// ── Parsing ──

const DELTA_FENCE = /```yaml:knowledge-delta\n([\s\S]*?)```/;

/**
 * Parse the structured knowledge-delta block from learning-report.md.
 * The block uses a simplified YAML-ish format that is easy for AI to produce
 * and for this parser to handle without a full YAML dependency.
 */
export function parseLearningReport(
  markdown: string,
): ParsedObservation[] {
  const match = markdown.match(DELTA_FENCE);
  if (!match) return [];

  const block = match[1];
  const observations: ParsedObservation[] = [];
  let current: Partial<ParsedObservation> & { tagsRaw?: string } = {};

  for (const line of block.split('\n')) {
    const trimmed = line.trim();

    // New observation entry
    if (trimmed.startsWith('- title:') || trimmed.startsWith('-title:')) {
      if (current.title) {
        observations.push(finalize(current));
      }
      current = { title: trimValue(trimmed.replace(/^-\s*title:\s*/, '')) };
      continue;
    }

    if (current.title) {
      if (trimmed.startsWith('type:')) {
        current.type = trimValue(trimmed.replace(/^type:\s*/, '')) as KnowledgeType;
      } else if (trimmed.startsWith('content:')) {
        current.content = trimValue(trimmed.replace(/^content:\s*/, ''));
      } else if (trimmed.startsWith('tags:')) {
        current.tagsRaw = trimValue(trimmed.replace(/^tags:\s*/, ''));
      } else if (trimmed.startsWith('category:')) {
        current.category = trimValue(trimmed.replace(/^category:\s*/, ''));
      } else if (trimmed.startsWith('evidence:')) {
        current.evidence = trimValue(trimmed.replace(/^evidence:\s*/, ''));
      } else if (trimmed.startsWith('relatedEntryId:')) {
        const val = trimValue(trimmed.replace(/^relatedEntryId:\s*/, ''));
        current.relatedEntryId = val === 'null' ? null : val;
      }
    }
  }

  if (current.title) {
    observations.push(finalize(current));
  }

  return observations.filter((o) => o.title && o.type && o.content);
}

function finalize(raw: Partial<ParsedObservation> & { tagsRaw?: string }): ParsedObservation {
  const tags = raw.tagsRaw
    ? raw.tagsRaw.replace(/[\[\]]/g, '').split(',').map((t) => t.trim()).filter(Boolean)
    : [];
  return {
    title: raw.title || '',
    type: (raw.type || 'rule') as KnowledgeType,
    content: raw.content || '',
    tags,
    category: raw.category || 'candidate',
    evidence: raw.evidence || 'Observation from learn stage',
    relatedEntryId: raw.relatedEntryId ?? null,
  };
}

function trimValue(s: string): string {
  const v = s.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

// ── Matching ──

/**
 * Normalize a title for comparison: lowercase, strip non-alphanumeric.
 */
function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '');
}

/**
 * Calculate a simple similarity score between two titles.
 * Returns 0-1. Uses normalized substring containment + word overlap.
 */
function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return 1;
  if (na.length < 8 || nb.length < 8) return 0;

  // Substring containment
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  // Word overlap (for titles with enough words)
  const wordsA = new Set(a.toLowerCase().split(/[\s\-_,.]+/).filter((w) => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/[\s\-_,.]+/).filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let common = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) common++;
  }
  const overlap = common / Math.max(wordsA.size, wordsB.size);
  return overlap >= 0.5 ? overlap * 0.8 : 0;
}

/**
 * Find the best matching entry for an observation.
 * Considers: explicit relatedEntryId, title similarity, tag overlap.
 */
function findMatch(
  obs: ParsedObservation,
  entries: KnowledgeEntry[],
): KnowledgeEntry | null {
  // 1. Try explicit relatedEntryId
  if (obs.relatedEntryId) {
    const exact = entries.find((e) => e.id === obs.relatedEntryId);
    if (exact) return exact;
  }

  // 2. Title similarity + tag overlap
  let best: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of entries) {
    if (entry.lifecycle === 'deprecated') continue;
    if (entry.type !== obs.type) continue;

    const titleScore = titleSimilarity(obs.title, entry.title);
    const obsTags = new Set(obs.tags.map((t) => t.toLowerCase()));
    const entryTags = new Set(entry.tags.map((t) => t.toLowerCase()));
    let tagScore = 0;
    if (obsTags.size > 0 && entryTags.size > 0) {
      let common = 0;
      for (const t of obsTags) {
        if (entryTags.has(t)) common++;
      }
      tagScore = common / Math.max(obsTags.size, entryTags.size);
    }

    const score = titleScore * 0.7 + tagScore * 0.3;
    if (score > bestScore && score >= 0.6) {
      bestScore = score;
      best = entry;
    }
  }

  return best;
}

// ── ID Generation ──

function generateId(type: string, title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const hash = createHash('sha1').update(`${type}\0${title}`).digest('hex').slice(0, 8);
  return `${type}-${slug}-${hash}`;
}

// ── Core Reconciliation ──

/**
 * Reconcile parsed observations against the knowledge store.
 * Applies ADD/PROMOTE operations and returns a detailed result.
 *
 * @param observations - Parsed from learning-report.md
 * @param store - Loaded knowledge store (will be mutated)
 * @param featureId - Source feature ID for evidence tracking
 * @returns Detailed reconciliation result
 */
export function reconcileObservations(
  observations: ParsedObservation[],
  store: KnowledgeStore,
  featureId: string,
): ReconcileResult {
  const result: ReconcileResult = {
    added: [],
    promoted: [],
    autoStable: [],
    skipped: [],
    errors: [],
  };

  const allEntries = store.selectAll();
  const now = new Date().toISOString();

  for (const obs of observations) {
    try {
      // Skip rejected patterns — they're documentation, not knowledge entries
      if (obs.category === 'rejected') {
        result.skipped.push({ title: obs.title, reason: 'rejected pattern (documented in report only)' });
        continue;
      }

      // Validate type
      let type: KnowledgeType;
      try {
        type = KnowledgeType.parse(obs.type);
      } catch {
        result.errors.push({ title: obs.title, error: `invalid type: ${obs.type}` });
        continue;
      }

      const match = findMatch(obs, allEntries);

      if (match) {
        // ── Existing entry: add evidence and try to promote ──
        const hasFeatureEvidence = match.evidence.some((e) => e.feature === featureId);
        if (hasFeatureEvidence) {
          result.skipped.push({
            title: obs.title,
            reason: `already has evidence from ${featureId}`,
          });
          continue;
        }

        const evidenceCountAfter = match.evidence.length + 1;
        const targetLifecycle = determineTargetLifecycle(
          match.lifecycle,
          evidenceCountAfter,
        );

        if (targetLifecycle && targetLifecycle !== match.lifecycle) {
          if (canTransition(match.lifecycle, targetLifecycle)) {
            store.dispatch({
              type: 'PROMOTE',
              id: match.id,
              to: targetLifecycle,
              evidence: { feature: featureId, description: obs.evidence },
            });

            result.promoted.push({
              id: match.id,
              title: match.title,
              from: match.lifecycle,
              to: targetLifecycle,
              feature: featureId,
            });

            if (targetLifecycle === 'stable') {
              result.autoStable.push({
                id: match.id,
                title: match.title,
                evidenceCount: evidenceCountAfter,
              });
            }
          } else {
            // Can't transition directly (e.g., candidate → stable)
            // Try intermediate step: candidate → pending first
            if (match.lifecycle === 'candidate' && targetLifecycle === 'stable') {
              store.dispatch({
                type: 'PROMOTE',
                id: match.id,
                to: 'pending',
                evidence: { feature: featureId, description: obs.evidence },
              });
              result.promoted.push({
                id: match.id,
                title: match.title,
                from: match.lifecycle,
                to: 'pending',
                feature: featureId,
              });
            }
          }
        } else if (targetLifecycle === match.lifecycle) {
          // Enough evidence but already at this level — just add evidence via UPDATE
          store.dispatch({
            type: 'UPDATE',
            id: match.id,
            patch: {
              evidence: [...match.evidence, {
                feature: featureId,
                date: now,
                description: obs.evidence,
                verified: false,
              }],
            },
          });
        }
      } else {
        // ── New entry: ADD as candidate ──
        const id = generateId(type, obs.title);

        // Check for ID collision (same title + type already exists)
        if (store.selectById(id)) {
          result.skipped.push({ title: obs.title, reason: 'duplicate (same title+type hash)' });
          continue;
        }

        const entry = {
          id,
          type,
          title: obs.title,
          content: obs.content,
          lifecycle: 'candidate' as Lifecycle,
          evidence: [{
            feature: featureId,
            date: now,
            description: obs.evidence,
            verified: false,
          }],
          tags: obs.tags,
          scope: 'project' as const,
          createdAt: now,
          updatedAt: now,
          promotedAt: null,
          deprecatedReason: null,
        };

        store.dispatch({ type: 'ADD', entry });
        result.added.push({ id, title: obs.title, type });
      }
    } catch (error) {
      result.errors.push({
        title: obs.title,
        error: (error as Error).message,
      });
    }
  }

  return result;
}

/**
 * Determine the target lifecycle based on current lifecycle and evidence count.
 * candidate + 2 evidence → pending
 * candidate + 3+ evidence → stable (will go through pending first via two-step)
 * pending + 3+ evidence → stable
 */
function determineTargetLifecycle(
  current: Lifecycle,
  evidenceCount: number,
): Lifecycle | null {
  if (current === 'candidate') {
    if (evidenceCount >= MIN_EVIDENCE_COUNT.stable) return 'stable';
    if (evidenceCount >= MIN_EVIDENCE_COUNT.pending) return 'pending';
    return current; // stays candidate, just add evidence
  }
  if (current === 'pending') {
    if (evidenceCount >= MIN_EVIDENCE_COUNT.stable) return 'stable';
    return current; // stays pending
  }
  // stable or deprecated — no auto-advancement
  return current;
}

/**
 * Format a reconciliation result as a human-readable markdown report.
 */
export function formatReconcileReport(result: ReconcileResult, featureId: string): string {
  const lines: string[] = [
    '# 知识对账报告',
    '',
    `> Feature: ${featureId}`,
    `> 生成时间: ${new Date().toISOString()}`,
    '',
  ];

  if (result.added.length > 0) {
    lines.push('## 新增知识条目');
    lines.push('');
    for (const a of result.added) {
      lines.push(`- **[${a.type}] ${a.title}** → \`${a.id}\``);
    }
    lines.push('');
  }

  if (result.promoted.length > 0) {
    lines.push('## 生命周期晋级');
    lines.push('');
    for (const p of result.promoted) {
      const icon = p.to === 'stable' ? '⚠️ 自动' : '✓';
      lines.push(`- ${icon} **${p.title}**: ${p.from} → ${p.to} (evidence from ${p.feature})`);
    }
    lines.push('');
  }

  if (result.autoStable.length > 0) {
    lines.push('## ⚠️ 自动晋级 stable（需事后审查）');
    lines.push('');
    lines.push('> 以下条目因 3+ 独立 Feature 证据自动晋级 stable。');
    lines.push('> 如有误判，请运行 `sovei knowledge deprecate <id> --reason "..."` 回退。');
    lines.push('');
    for (const s of result.autoStable) {
      lines.push(`- **${s.title}** (${s.evidenceCount} evidence) → \`${s.id}\``);
    }
    lines.push('');
  }

  if (result.skipped.length > 0) {
    lines.push('## 跳过');
    lines.push('');
    for (const s of result.skipped) {
      lines.push(`- ${s.title}: ${s.reason}`);
    }
    lines.push('');
  }

  if (result.errors.length > 0) {
    lines.push('## 错误');
    lines.push('');
    for (const e of result.errors) {
      lines.push(`- ${e.title}: ${e.error}`);
    }
    lines.push('');
  }

  const total = result.added.length + result.promoted.length;
  if (total === 0 && result.skipped.length === 0 && result.errors.length === 0) {
    lines.push('（无知识变更）');
  }

  return lines.join('\n');
}
