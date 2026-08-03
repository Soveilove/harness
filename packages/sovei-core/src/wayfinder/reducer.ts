import type { DecisionTicket, WayfinderEvent, WayfinderState } from './schemas.js';

export function createWayfinderState(event: Extract<WayfinderEvent, { type: 'MAP_CHARTED' | 'MAP_SKIPPED' }>, timestamp: string): WayfinderState {
  return {
    schemaVersion: 1,
    featureId: event.featureId,
    destination: event.type === 'MAP_CHARTED' ? event.destination : '',
    notes: event.type === 'MAP_CHARTED' ? event.notes : '',
    notRequiredReason: event.type === 'MAP_SKIPPED' ? event.reason : null,
    tickets: {},
    fog: [],
    revision: 0,
    updatedAt: timestamp,
  };
}

export function wayfinderReducer(state: WayfinderState, event: WayfinderEvent, timestamp: string, revision: number): WayfinderState {
  const updateTicket = (ticket: DecisionTicket): WayfinderState => ({
    ...state,
    tickets: { ...state.tickets, [ticket.id]: ticket },
    revision,
    updatedAt: timestamp,
  });

  switch (event.type) {
    case 'MAP_CHARTED':
    case 'MAP_SKIPPED':
      throw new Error('Wayfinder map is already initialized');
    case 'TICKET_ADDED': {
      if (state.notRequiredReason) throw new Error('A skipped map cannot accept tickets');
      if (state.tickets[event.ticket.id]) throw new Error(`Decision ticket already exists: ${event.ticket.id}`);
      return updateTicket(event.ticket);
    }
    case 'TICKET_CLAIMED': {
      const ticket = requireTicket(state, event.ticketId);
      if (ticket.status !== 'open') throw new Error(`Decision ticket is ${ticket.status}: ${ticket.title}`);
      if (ticket.claim && !event.replaceExpired) throw new Error(`Decision ticket is already claimed by ${ticket.claim.actor}: ${ticket.title}`);
      return updateTicket({ ...ticket, claim: { actor: event.actor, claimedAt: timestamp, expiresAt: event.expiresAt }, updatedAt: timestamp });
    }
    case 'TICKET_RELEASED': {
      const ticket = requireTicket(state, event.ticketId);
      if (!ticket.claim || ticket.claim.actor !== event.actor) throw new Error(`Decision ticket is not claimed by ${event.actor}: ${ticket.title}`);
      return updateTicket({ ...ticket, claim: null, updatedAt: timestamp });
    }
    case 'TICKET_RESOLVED': {
      const ticket = requireTicket(state, event.ticketId);
      if (ticket.status !== 'open') throw new Error(`Decision ticket is ${ticket.status}: ${ticket.title}`);
      if (!ticket.claim || ticket.claim.actor !== event.actor) throw new Error(`Claim ${ticket.title} before resolving it`);
      return updateTicket({
        ...ticket,
        status: 'resolved',
        claim: null,
        resolution: event.resolution,
        evidence: event.evidence,
        contextPointers: event.contextPointers,
        updatedAt: timestamp,
        resolvedAt: timestamp,
      });
    }
    case 'TICKET_EXCLUDED': {
      const ticket = requireTicket(state, event.ticketId);
      if (ticket.status !== 'open') throw new Error(`Decision ticket is ${ticket.status}: ${ticket.title}`);
      if (ticket.claim && ticket.claim.actor !== event.actor && !event.overrideExpired) {
        throw new Error(`Decision ticket is claimed by ${ticket.claim.actor}: ${ticket.title}`);
      }
      return updateTicket({ ...ticket, status: 'excluded', claim: null, exclusionReason: event.reason, updatedAt: timestamp, resolvedAt: timestamp });
    }
    case 'FOG_ADDED': {
      if (state.notRequiredReason) throw new Error('A skipped map cannot contain fog');
      return { ...state, fog: [...state.fog, event.fog], revision, updatedAt: timestamp };
    }
    case 'FOG_GRADUATED': {
      const fog = state.fog.find((entry) => entry.id === event.fogId);
      if (!fog) throw new Error(`Fog entry not found: ${event.fogId}`);
      if (state.tickets[event.ticket.id]) throw new Error(`Decision ticket already exists: ${event.ticket.id}`);
      return {
        ...state,
        fog: state.fog.filter((entry) => entry.id !== event.fogId),
        tickets: { ...state.tickets, [event.ticket.id]: event.ticket },
        revision,
        updatedAt: timestamp,
      };
    }
  }
}

function requireTicket(state: WayfinderState, id: string): DecisionTicket {
  const ticket = state.tickets[id];
  if (!ticket) throw new Error(`Decision ticket not found: ${id}`);
  return ticket;
}
