import { z } from 'zod';
import type { ContextShadowSummary } from '../context/policy.js';
import type { StorageBackend } from '../storage/types.js';

export const USAGE_SCHEMA_VERSION = 1 as const;
export const USAGE_FILE = 'harness/project/usage.jsonl';

export const UsageTokenStatusSchema = z.enum(['known', 'unknown']);
export type UsageTokenStatus = z.infer<typeof UsageTokenStatusSchema>;

export const UsageTokenSchema = z.object({
  status: UsageTokenStatusSchema,
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  cacheReadTokens: z.number().int().nonnegative().nullable(),
  cacheWriteTokens: z.number().int().nonnegative().nullable(),
}).strict();
export type UsageToken = z.infer<typeof UsageTokenSchema>;

const ContextShadowSummarySchema = z.object({
  name: z.enum(['full', 'scoped', 'index+on-demand']),
  ids: z.object({
    required: z.array(z.string()),
    indexed: z.array(z.string()),
    expanded: z.array(z.string()),
    unloaded: z.array(z.string()),
  }).strict(),
  counts: z.object({
    required: z.number().int().nonnegative(),
    indexed: z.number().int().nonnegative(),
    expanded: z.number().int().nonnegative(),
    unloaded: z.number().int().nonnegative(),
  }).strict(),
  sizes: z.object({
    requiredCharacters: z.number().int().nonnegative(),
    indexedCharacters: z.number().int().nonnegative(),
    expandedCharacters: z.number().int().nonnegative(),
  }).strict(),
  characters: z.number().int().nonnegative(),
}).strict();

export const UsageBaseSchema = z.object({
  schemaVersion: z.literal(USAGE_SCHEMA_VERSION),
  event: z.enum(['run-start', 'context-selected', 'run-end']),
  runId: z.string().min(1),
  channel: z.string().min(1),
  stage: z.string().min(1).nullable(),
  occurredAt: z.string().datetime(),
  policyVersion: z.string().min(1).nullable(),
  baselineRevision: z.string().min(1).nullable(),
  tokenUsage: UsageTokenSchema,
}).strict();

export const UsageRunStartSchema = UsageBaseSchema.extend({
  event: z.literal('run-start'),
  targetDigest: z.string().regex(/^[a-f0-9]{16}$/).nullable(),
}).strict();

export const UsageContextSelectedSchema = UsageBaseSchema.extend({
  event: z.literal('context-selected'),
  counts: z.object({
    required: z.number().int().nonnegative(),
    indexed: z.number().int().nonnegative(),
    expanded: z.number().int().nonnegative(),
    unloaded: z.number().int().nonnegative(),
  }).strict(),
  sizes: z.object({
    requiredCharacters: z.number().int().nonnegative(),
    indexedCharacters: z.number().int().nonnegative(),
    expandedCharacters: z.number().int().nonnegative(),
  }).strict(),
  matchedRedlineIds: z.array(z.string()),
  candidateIds: z.array(z.string()),
  decision: z.string().min(1),
  overBudget: z.boolean(),
  shadow: z.object({
    actual: z.literal('full'),
    compatibility: z.literal('preserved'),
    variants: z.object({
      full: ContextShadowSummarySchema,
      scoped: ContextShadowSummarySchema,
      indexOnDemand: ContextShadowSummarySchema,
    }).strict(),
  }).strict().optional(),
}).strict();

export const UsageRunEndSchema = UsageBaseSchema.extend({
  event: z.literal('run-end'),
  status: z.enum(['completed', 'failed', 'escalated', 'stopped', 'interrupted']),
  escalated: z.boolean(),
  testsPassed: z.boolean().nullable(),
  calls: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative().nullable(),
}).strict();

export const UsageEventSchema = z.discriminatedUnion('event', [
  UsageRunStartSchema,
  UsageContextSelectedSchema,
  UsageRunEndSchema,
]);
export type UsageRunStart = z.infer<typeof UsageRunStartSchema>;
export type UsageContextSelected = z.infer<typeof UsageContextSelectedSchema>;
export type UsageRunEnd = z.infer<typeof UsageRunEndSchema>;
export type UsageEvent = z.infer<typeof UsageEventSchema>;

export function unknownTokenUsage(): UsageToken {
  return {
    status: 'unknown',
    inputTokens: null,
    outputTokens: null,
    cacheReadTokens: null,
    cacheWriteTokens: null,
  };
}

export function knownTokenUsage(input: Omit<UsageToken, 'status'>): UsageToken {
  return UsageTokenSchema.parse({ status: 'known', ...input });
}

export class UsageRecorder {
  constructor(
    private readonly storage: StorageBackend,
    private readonly filePath = USAGE_FILE,
  ) {}

  async ensureFile(): Promise<boolean> {
    return this.storage.writeIfAbsent(this.filePath, '');
  }

  async append(event: UsageEvent): Promise<void> {
    const parsed = UsageEventSchema.parse(event);
    await this.storage.withLock(this.filePath, async () => {
      await this.ensureFile();
      await this.storage.append(this.filePath, JSON.stringify(parsed) + '\n');
    });
  }

  async read(): Promise<UsageEvent[]> {
    const content = await this.storage.read(this.filePath);
    if (!content) return [];
    const events: UsageEvent[] = [];
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parsed = UsageEventSchema.safeParse(JSON.parse(trimmed));
      if (parsed.success) events.push(parsed.data);
    }
    return events;
  }

  async interruptedRunIds(): Promise<string[]> {
    const events = await this.read();
    const started = new Set(events.filter((event) => event.event === 'run-start').map((event) => event.runId));
    const ended = new Set(events.filter((event) => event.event === 'run-end').map((event) => event.runId));
    return [...started].filter((runId) => !ended.has(runId)).sort();
  }
}
