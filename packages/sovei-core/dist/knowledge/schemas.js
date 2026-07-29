/**
 * Knowledge Schemas
 * Zod type definitions for all knowledge types.
 * Replaces free-form markdown with typed, validated JSON.
 */
import { z } from 'zod';
// ── Enums ──
export const KnowledgeType = z.enum([
    'pitfall', // 踩坑
    'rule', // 实现规则
    'decision', // ADR (Architecture Decision Record)
    'code-map', // 代码地图
    'architecture', // 架构文档
    'preference', // 用户偏好
    'constitution', // 开发原则
]);
export const Lifecycle = z.enum([
    'candidate', // 单次观察，待验证
    'pending', // 已观察 2+ 次，待晋级审查
    'stable', // 经人工确认，可分发
    'deprecated', // 已废弃
]);
// ── Evidence ──
export const Evidence = z.object({
    feature: z.string(), // 来源 Feature ID
    date: z.string(), // ISO date
    description: z.string(), // 证据描述
    verified: z.boolean().default(false),
});
// ── Knowledge Entry ──
export const KnowledgeEntry = z.object({
    id: z.string(), // auto-generated (type-slug-hash)
    type: KnowledgeType,
    title: z.string(),
    content: z.string(), // markdown body
    lifecycle: Lifecycle,
    evidence: z.array(Evidence),
    tags: z.array(z.string()),
    scope: z.enum(['project', 'global']).default('project'),
    createdAt: z.string(),
    updatedAt: z.string(),
    promotedAt: z.string().nullable(),
    deprecatedReason: z.string().nullable(),
});
// ── Lifecycle Transition Rules ──
export const LIFECYCLE_TRANSITIONS = {
    candidate: ['pending', 'deprecated'],
    pending: ['stable', 'candidate', 'deprecated'],
    stable: ['deprecated'],
    deprecated: [],
};
/**
 * Validate a lifecycle transition.
 * Returns true if the transition is allowed.
 */
export function canTransition(from, to) {
    return LIFECYCLE_TRANSITIONS[from].includes(to);
}
/**
 * Minimum evidence count required for each lifecycle stage.
 */
export const MIN_EVIDENCE_COUNT = {
    candidate: 1,
    pending: 2,
    stable: 3,
    deprecated: 0,
};
//# sourceMappingURL=schemas.js.map