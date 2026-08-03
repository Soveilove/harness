import type { DecisionTicket, WayfinderState } from './schemas.js';

export function isClaimActive(ticket: DecisionTicket, now = new Date()): boolean {
  return Boolean(ticket.claim && new Date(ticket.claim.expiresAt).getTime() > now.getTime());
}

export function selectFrontier(state: WayfinderState, now = new Date()): DecisionTicket[] {
  return Object.values(state.tickets)
    .filter((ticket) => ticket.status === 'open')
    .filter((ticket) => !isClaimActive(ticket, now))
    .filter((ticket) => ticket.blockedBy.every((id) => {
      const blocker = state.tickets[id];
      return blocker?.status === 'resolved' || blocker?.status === 'excluded';
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function validateWayfinderCompletion(state: WayfinderState | null): { valid: boolean; blockers: string[] } {
  if (!state) return { valid: false, blockers: ['wayfinder map is not initialized'] };
  if (state.notRequiredReason) return { valid: true, blockers: [] };
  const blockers: string[] = [];
  if (!state.destination.trim()) blockers.push('destination is missing');
  if (!Object.keys(state.tickets).length && !state.fog.length) {
    blockers.push('map has no decision tickets or fog; use wayfinder skip for a one-session effort');
  }
  const open = Object.values(state.tickets).filter((ticket) => ticket.status === 'open');
  if (open.length) blockers.push(`open decision tickets: ${open.map((ticket) => ticket.title).join(', ')}`);
  if (state.fog.length) blockers.push(`fog is not empty: ${state.fog.map((entry) => entry.summary).join(', ')}`);
  const dangling = Object.values(state.tickets).flatMap((ticket) =>
    ticket.blockedBy.filter((id) => !state.tickets[id]).map((id) => `${ticket.title} -> ${id}`));
  if (dangling.length) blockers.push(`dangling dependencies: ${dangling.join(', ')}`);
  const unsupported = Object.values(state.tickets).filter((ticket) =>
    ticket.status === 'resolved'
    && (ticket.interaction === 'HITL' || ticket.type === 'research')
    && ticket.evidence.length === 0
    && ticket.contextPointers.length === 0);
  if (unsupported.length) {
    blockers.push(`resolved tickets missing human/research evidence: ${unsupported.map((ticket) => ticket.title).join(', ')}`);
  }
  return { valid: blockers.length === 0, blockers };
}
