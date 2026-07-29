/**
 * Knowledge Lifecycle Manager
 * Manages candidate → pending → stable transitions with evidence requirements.
 * Single observations can never bypass to stable.
 */
import { canTransition, MIN_EVIDENCE_COUNT } from './schemas.js';
/**
 * Validate a promotion request without executing it.
 * Useful for dry-run checks.
 */
export function validatePromotion(entry, to, hasNewEvidence) {
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
export function nextLifecycle(entry) {
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
//# sourceMappingURL=lifecycle.js.map