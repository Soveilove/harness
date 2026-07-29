/**
 * Knowledge Lifecycle Manager
 * Manages candidate → pending → stable transitions with evidence requirements.
 * Single observations can never bypass to stable.
 */

import type { KnowledgeEntry, Lifecycle } from './schemas.js';
import { canTransition, MIN_EVIDENCE_COUNT } from './schemas.js';

export interface PromotionRequest {
  entryId: string;
  to: Lifecycle;
  evidence?: { feature: string; description: string };
}

export interface PromotionResult {
  success: boolean;
  entry?: KnowledgeEntry;
  error?: string;
}

/**
 * Validate a promotion request without executing it.
 * Useful for dry-run checks.
 */
export function validatePromotion(
  entry: KnowledgeEntry,
  to: Lifecycle,
  hasNewEvidence: boolean,
): { valid: boolean; reason?: string } {
  if (!canTransition(entry.lifecycle, to)) {
    return {
      valid: false,
      reason: `Invalid transition: ${entry.lifecycle} → ${to}`,
    };
  }

  const effectiveEvidence = hasNewEvidence
    ? entry.evidence.length + 1
    : entry.evidence.length;
  const required = MIN_EVIDENCE_COUNT[to];

  if (effectiveEvidence < required) {
    return {
      valid: false,
      reason: `Insufficient evidence: need ${required}, have ${effectiveEvidence}`,
    };
  }

  return { valid: true };
}

/**
 * Get the next lifecycle stage for an entry.
 * Returns null if already at max (stable or deprecated).
 */
export function nextLifecycle(entry: KnowledgeEntry): Lifecycle | null {
  switch (entry.lifecycle) {
    case 'candidate':
      return 'pending';
    case 'pending':
      return 'stable';
    case 'stable':
      return null;
    case 'deprecated':
      return null;
  }
}
