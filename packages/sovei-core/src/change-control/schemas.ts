import { z } from 'zod';

export const Redline = z.object({
  id: z.string().regex(/^[A-Z][A-Z0-9_-]*$/),
  title: z.string().min(1),
  rule: z.string().min(1),
  enforcement: z.enum(['absolute', 'approval-required']),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Redline = z.infer<typeof Redline>;

export const RedlineAssessment = z.object({
  redlineId: z.string(),
  disposition: z.enum([
    'review-required',
    'unaffected',
    'compliant',
    'violation',
    'approved-exception',
  ]),
  rationale: z.string(),
  evidence: z.array(z.string()),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  approvalReference: z.string().nullable(),
});
export type RedlineAssessment = z.infer<typeof RedlineAssessment>;

export const ChangeDimension = z.enum([
  'business-direction',
  'business-redline',
  'user-behavior',
  'acceptance-or-api-contract',
  'impact-surface',
  'technical-design',
  'task-decomposition',
  'implementation-only',
]);
export type ChangeDimension = z.infer<typeof ChangeDimension>;

export const ChangeRequest = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  featureId: z.string(),
  summary: z.string().min(1),
  reason: z.string().min(1),
  targetStage: z.string(),
  changeDimensions: z.array(ChangeDimension),
  baseEventRevision: z.number().int().nonnegative(),
  baseCurrentStage: z.string().nullable(),
  status: z.enum(['draft', 'applied', 'cancelled']),
  affectedSurfaces: z.array(z.string()),
  supersedes: z.array(z.string()),
  redlineAssessments: z.array(RedlineAssessment),
  authorizedBy: z.string().nullable(),
  authorizedAt: z.string().nullable(),
  authorizationReference: z.string().nullable(),
  createdAt: z.string(),
  appliedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  cancellationReason: z.string().nullable(),
});
export type ChangeRequest = z.infer<typeof ChangeRequest>;

export interface ChangeValidation {
  valid: boolean;
  blockers: string[];
}
