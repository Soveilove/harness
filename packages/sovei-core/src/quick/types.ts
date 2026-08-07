import { z } from 'zod';

export const QUICK_SCHEMA_VERSION = 1 as const;

export const QuickPhaseSchema = z.enum(['capture', 'check', 'confirm', 'implement', 'verify', 'report']);
export type QuickPhase = z.infer<typeof QuickPhaseSchema>;

export const QuickStatusSchema = z.enum([
  'pending',
  'completed',
  'failed',
  'escalated',
  'stopped',
  'interrupted',
]);
export type QuickStatus = z.infer<typeof QuickStatusSchema>;

export const QuickRiskLevelSchema = z.enum(['low', 'high', 'uncertain']);
export type QuickRiskLevel = z.infer<typeof QuickRiskLevelSchema>;

export const QuickRunInputSchema = z.object({
  target: z.string().trim().min(1),
  exclusions: z.array(z.string().trim().min(1)).default([]),
  declaredPaths: z.array(z.string().trim().min(1)).default([]),
  declaredSymbols: z.array(z.string().trim().min(1)).default([]),
  declaredTests: z.array(z.string().trim().min(1)).default([]),
}).strict();
export type QuickRunInput = z.infer<typeof QuickRunInputSchema>;

export const QuickRunStateSchema = z.object({
  schemaVersion: z.literal(QUICK_SCHEMA_VERSION),
  runId: z.string().min(1),
  channel: z.literal('quick'),
  target: z.string().min(1),
  exclusions: z.array(z.string()),
  declaredPaths: z.array(z.string()),
  declaredSymbols: z.array(z.string()),
  declaredTests: z.array(z.string()),
  baselineRevision: z.string().nullable(),
  baselineSummary: z.string().nullable(),
  phase: QuickPhaseSchema,
  status: QuickStatusSchema,
  riskLevel: QuickRiskLevelSchema,
  riskSignals: z.array(z.string()),
  scopeDeclaration: z.string().nullable(),
  actualDiff: z.array(z.string()),
  testsPassed: z.boolean().nullable(),
  unverifiedItems: z.array(z.string()),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();
export type QuickRunState = z.infer<typeof QuickRunStateSchema>;

export interface QuickTransitionResult {
  state: QuickRunState;
  accepted: boolean;
  reason?: string;
}

const NEXT_PHASE: Record<QuickPhase, QuickPhase | null> = {
  capture: 'check',
  check: 'confirm',
  confirm: 'implement',
  implement: 'verify',
  verify: 'report',
  report: null,
};

const TERMINAL_STATUSES = new Set<QuickStatus>(['completed', 'failed', 'escalated', 'stopped', 'interrupted']);

function now(): string {
  return new Date().toISOString();
}

export function createQuickRun(input: QuickRunInput, runId: string, baseline?: { revision: string | null; summary: string | null }): QuickRunState {
  const parsed = QuickRunInputSchema.parse(input);
  const timestamp = now();
  return QuickRunStateSchema.parse({
    schemaVersion: QUICK_SCHEMA_VERSION,
    runId,
    channel: 'quick',
    ...parsed,
    baselineRevision: baseline?.revision ?? null,
    baselineSummary: baseline?.summary ?? null,
    phase: 'capture',
    status: 'pending',
    riskLevel: 'uncertain',
    riskSignals: [],
    scopeDeclaration: null,
    actualDiff: [],
    testsPassed: null,
    unverifiedItems: [],
    startedAt: timestamp,
    updatedAt: timestamp,
  });
}

export function transitionQuickRun(
  state: QuickRunState,
  nextPhase: QuickPhase,
  patch: Partial<Pick<QuickRunState, 'riskLevel' | 'riskSignals' | 'scopeDeclaration' | 'actualDiff' | 'testsPassed' | 'unverifiedItems' | 'baselineRevision' | 'baselineSummary'>> = {},
): QuickTransitionResult {
  const parsed = QuickRunStateSchema.parse(state);
  if (TERMINAL_STATUSES.has(parsed.status)) {
    return { state: parsed, accepted: false, reason: `run is already ${parsed.status}` };
  }
  if (NEXT_PHASE[parsed.phase] !== nextPhase) {
    return { state: parsed, accepted: false, reason: `cannot move from ${parsed.phase} to ${nextPhase}` };
  }
  const next = QuickRunStateSchema.parse({
    ...parsed,
    ...patch,
    phase: nextPhase,
    updatedAt: now(),
  });
  return { state: next, accepted: true };
}

export function finishQuickRun(
  state: QuickRunState,
  status: Exclude<QuickStatus, 'pending' | 'interrupted'>,
  patch: Partial<Pick<QuickRunState, 'riskLevel' | 'riskSignals' | 'actualDiff' | 'testsPassed' | 'unverifiedItems'>> = {},
): QuickTransitionResult {
  const parsed = QuickRunStateSchema.parse(state);
  if (TERMINAL_STATUSES.has(parsed.status)) {
    return { state: parsed, accepted: false, reason: `run is already ${parsed.status}` };
  }
  const canTerminateEarly = status !== 'completed' && parsed.phase !== 'report';
  const transition = parsed.phase === 'report'
    ? { accepted: true, state: parsed }
    : canTerminateEarly
      ? { accepted: true, state: parsed }
      : transitionQuickRun(parsed, 'report', patch);
  if (!transition.accepted) return transition;
  return {
    accepted: true,
    state: QuickRunStateSchema.parse({ ...transition.state, ...patch, phase: 'report', status, updatedAt: now() }),
  };
}

export function interruptQuickRun(state: QuickRunState, reason: string): QuickRunState {
  const parsed = QuickRunStateSchema.parse(state);
  return QuickRunStateSchema.parse({
    ...parsed,
    status: 'interrupted',
    unverifiedItems: [...parsed.unverifiedItems, reason],
    updatedAt: now(),
  });
}
