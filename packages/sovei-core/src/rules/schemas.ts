import { z } from 'zod';

export const RuleLifecycleSchema = z.enum(['candidate', 'active', 'deprecated']);
export const RuleEnforcementSchema = z.enum(['required', 'advisory']);
export const ProjectStageSchema = z.enum([
  'load', 'grill', 'wayfind', 'spec', 'scope', 'plan',
  'tasks', 'implement', 'converge', 'verify', 'learn', 'sync',
]);

export const RuleVerificationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('command'),
    command: z.string().min(1),
    description: z.string().min(1),
  }).strict(),
  z.object({
    type: z.literal('review'),
    description: z.string().min(1),
  }).strict(),
]);

export const ProjectRuleSchema = z.object({
  id: z.string().regex(/^[A-Za-z][A-Za-z0-9._-]{2,127}$/),
  title: z.string().min(1),
  instruction: z.string().min(1),
  rationale: z.string().min(1).optional(),
  lifecycle: RuleLifecycleSchema,
  enforcement: RuleEnforcementSchema,
  appliesTo: z.object({
    paths: z.array(z.string().min(1)).min(1).default(['**/*']),
    excludePaths: z.array(z.string().min(1)).default([]),
    stages: z.array(ProjectStageSchema).default([]),
  }).strict(),
  verification: z.array(RuleVerificationSchema).default([]),
  tags: z.array(z.string().min(1)).default([]),
  provenance: z.object({
    kind: z.enum(['declared', 'adapted']),
    sources: z.array(z.string().min(1)).min(1),
    reviewedBy: z.string().min(1).optional(),
    reviewedAt: z.string().datetime().optional(),
    reviewReason: z.string().min(1).optional(),
  }).strict(),
}).strict();

export const ProjectRulesDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  rules: z.array(ProjectRuleSchema),
}).strict();

export type RuleLifecycle = z.infer<typeof RuleLifecycleSchema>;
export type RuleEnforcement = z.infer<typeof RuleEnforcementSchema>;
export type RuleVerification = z.infer<typeof RuleVerificationSchema>;
export type ProjectStage = z.infer<typeof ProjectStageSchema>;
export type ProjectRule = z.infer<typeof ProjectRuleSchema>;
export type ProjectRulesDocument = z.infer<typeof ProjectRulesDocumentSchema>;
export type LoadedProjectRule = ProjectRule & { source: string };
