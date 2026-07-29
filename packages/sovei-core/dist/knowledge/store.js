/**
 * Knowledge Store
 * Inspired by Redux: pure reducer + dispatch + selectors + subscriptions.
 *
 * The store is the single point of mutation for all project knowledge.
 * All changes go through typed actions. State is persisted as typed JSON.
 */
import { canTransition, MIN_EVIDENCE_COUNT, } from './schemas.js';
/** Task type to knowledge type mapping */
const TASK_TYPE_MAP = {
    'general': ['constitution', 'preference', 'architecture'],
    'decision-making': ['decision', 'constitution'],
    'specification': ['decision', 'architecture', 'code-map'],
    'impact-analysis': ['code-map', 'architecture'],
    'planning': ['architecture', 'decision', 'rule'],
    'implementation': ['pitfall', 'rule', 'code-map'],
    'bug-fix': ['pitfall', 'rule'],
    'debugging': ['pitfall', 'rule'],
};
export class KnowledgeStore {
    entries = new Map();
    listeners = new Set();
    loadedSources = [];
    storage;
    knowledgeDir;
    constructor(storage, knowledgeDir = 'harness/project/knowledge') {
        this.storage = storage;
        this.knowledgeDir = knowledgeDir;
    }
    // ── Dispatch (Redux-inspired) ──
    dispatch(action) {
        switch (action.type) {
            case 'ADD': {
                this.entries.set(action.entry.id, action.entry);
                break;
            }
            case 'UPDATE': {
                const existing = this.entries.get(action.id);
                if (!existing)
                    throw new Error(`Knowledge entry not found: ${action.id}`);
                const updated = { ...existing, ...action.patch, updatedAt: new Date().toISOString() };
                this.entries.set(action.id, updated);
                break;
            }
            case 'PROMOTE': {
                const entry = this.entries.get(action.id);
                if (!entry)
                    throw new Error(`Knowledge entry not found: ${action.id}`);
                if (!canTransition(entry.lifecycle, action.to)) {
                    throw new Error(`Invalid lifecycle transition: ${entry.lifecycle} → ${action.to}`);
                }
                const minEvidence = MIN_EVIDENCE_COUNT[action.to];
                const evidenceCount = action.evidence
                    ? entry.evidence.length + 1
                    : entry.evidence.length;
                if (evidenceCount < minEvidence) {
                    throw new Error(`Insufficient evidence for ${action.to}: need ${minEvidence}, have ${evidenceCount}`);
                }
                const newEvidence = action.evidence
                    ? [...entry.evidence, {
                            feature: action.evidence.feature,
                            date: new Date().toISOString(),
                            description: action.evidence.description,
                            verified: false,
                        }]
                    : entry.evidence;
                this.entries.set(action.id, {
                    ...entry,
                    lifecycle: action.to,
                    evidence: newEvidence,
                    promotedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
                break;
            }
            case 'DEPRECATE': {
                const entry = this.entries.get(action.id);
                if (!entry)
                    throw new Error(`Knowledge entry not found: ${action.id}`);
                this.entries.set(action.id, {
                    ...entry,
                    lifecycle: 'deprecated',
                    deprecatedReason: action.reason,
                    updatedAt: new Date().toISOString(),
                });
                break;
            }
            case 'DELETE': {
                this.entries.delete(action.id);
                break;
            }
        }
        this.notify();
    }
    // ── Selectors ──
    selectAll() {
        return [...this.entries.values()];
    }
    selectById(id) {
        return this.entries.get(id);
    }
    selectByType(type) {
        return [...this.entries.values()].filter((e) => e.type === type && e.lifecycle !== 'deprecated');
    }
    selectByLifecycle(lifecycle) {
        return [...this.entries.values()].filter((e) => e.lifecycle === lifecycle);
    }
    selectStableRules() {
        return this.selectByType('rule').filter((e) => e.lifecycle === 'stable');
    }
    selectCandidates() {
        return [...this.entries.values()].filter((e) => e.lifecycle === 'candidate' || e.lifecycle === 'pending');
    }
    selectByTags(tags) {
        return [...this.entries.values()].filter((e) => e.lifecycle !== 'deprecated' && e.tags.some((t) => tags.includes(t)));
    }
    /** Load knowledge by task type - replaces knowledge-loader keyword matching */
    loadByTaskType(taskType) {
        const types = TASK_TYPE_MAP[taskType] ?? TASK_TYPE_MAP['general'];
        this.loadedSources = types.map((t) => `knowledge/${t}.json`);
    }
    getLoadedSources() {
        return [...this.loadedSources];
    }
    // ── Persistence ──
    async persist() {
        const grouped = this.groupByType();
        for (const [type, entries] of Object.entries(grouped)) {
            await this.storage.write(`${this.knowledgeDir}/${type}.json`, JSON.stringify(entries, null, 2));
        }
    }
    async load() {
        const files = await this.storage.list(this.knowledgeDir);
        for (const file of files) {
            if (!file.endsWith('.json'))
                continue;
            const content = await this.storage.read(`${this.knowledgeDir}/${file}`);
            if (!content)
                continue;
            try {
                const entries = JSON.parse(content);
                for (const entry of entries) {
                    this.entries.set(entry.id, entry);
                }
            }
            catch {
                // skip invalid files
            }
        }
    }
    groupByType() {
        const grouped = {};
        for (const entry of this.entries.values()) {
            if (!grouped[entry.type])
                grouped[entry.type] = [];
            grouped[entry.type].push(entry);
        }
        return grouped;
    }
    // ── Subscription (Redux-inspired) ──
    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }
    notify() {
        for (const fn of this.listeners)
            fn();
    }
}
//# sourceMappingURL=store.js.map