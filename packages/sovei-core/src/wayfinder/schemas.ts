import { z } from 'zod';

export const DecisionTicketType = z.enum(['research', 'prototype', 'grilling', 'task']);
export type DecisionTicketType = z.infer<typeof DecisionTicketType>;

export const InteractionMode = z.enum(['HITL', 'AFK']);
export type InteractionMode = z.infer<typeof InteractionMode>;

export const TicketClaim = z.object({
  actor: z.string().min(1),
  claimedAt: z.string(),
  expiresAt: z.string(),
});
export type TicketClaim = z.infer<typeof TicketClaim>;

export const DecisionTicket = z.object({
  id: z.string(),
  title: z.string().min(1),
  question: z.string().min(1),
  type: DecisionTicketType,
  interaction: InteractionMode,
  status: z.enum(['open', 'resolved', 'excluded']),
  blockedBy: z.array(z.string()),
  claim: TicketClaim.nullable(),
  resolution: z.string().nullable(),
  evidence: z.array(z.string()),
  contextPointers: z.array(z.string()),
  exclusionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullable(),
});
export type DecisionTicket = z.infer<typeof DecisionTicket>;

export const FogEntry = z.object({
  id: z.string(),
  summary: z.string().min(1),
  createdAt: z.string(),
});
export type FogEntry = z.infer<typeof FogEntry>;

export const WayfinderState = z.object({
  schemaVersion: z.literal(1),
  featureId: z.string(),
  destination: z.string(),
  notes: z.string(),
  notRequiredReason: z.string().nullable(),
  tickets: z.record(DecisionTicket),
  fog: z.array(FogEntry),
  revision: z.number().int().nonnegative(),
  updatedAt: z.string(),
});
export type WayfinderState = z.infer<typeof WayfinderState>;

export const WayfinderEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('MAP_CHARTED'), featureId: z.string(), destination: z.string().min(1), notes: z.string() }),
  z.object({ type: z.literal('MAP_SKIPPED'), featureId: z.string(), reason: z.string().min(1) }),
  z.object({ type: z.literal('TICKET_ADDED'), ticket: DecisionTicket }),
  z.object({ type: z.literal('TICKET_CLAIMED'), ticketId: z.string(), actor: z.string(), expiresAt: z.string(), replaceExpired: z.boolean() }),
  z.object({ type: z.literal('TICKET_RELEASED'), ticketId: z.string(), actor: z.string(), reason: z.string() }),
  z.object({ type: z.literal('TICKET_RESOLVED'), ticketId: z.string(), actor: z.string(), resolution: z.string().min(1), evidence: z.array(z.string()), contextPointers: z.array(z.string()) }),
  z.object({ type: z.literal('TICKET_EXCLUDED'), ticketId: z.string(), actor: z.string(), reason: z.string().min(1), overrideExpired: z.boolean() }),
  z.object({ type: z.literal('FOG_ADDED'), fog: FogEntry }),
  z.object({ type: z.literal('FOG_GRADUATED'), fogId: z.string(), ticket: DecisionTicket }),
]);
export type WayfinderEvent = z.infer<typeof WayfinderEvent>;

export const WayfinderEventEntry = z.object({
  timestamp: z.string(),
  revision: z.number().int().nonnegative(),
  actor: z.string().min(1),
  event: WayfinderEvent,
});
export type WayfinderEventEntry = z.infer<typeof WayfinderEventEntry>;
