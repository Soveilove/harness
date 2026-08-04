import { randomUUID } from 'node:crypto';
import type { StorageBackend } from '../storage/types.js';
import { parseJson } from '../storage/json.js';
import { createWayfinderState, wayfinderReducer } from './reducer.js';
import {
  DecisionTicket as DecisionTicketSchema,
  WayfinderEventEntry as WayfinderEventEntrySchema,
  WayfinderState as WayfinderStateSchema,
  type DecisionTicket,
  type DecisionTicketType,
  type InteractionMode,
  type WayfinderEvent,
  type WayfinderEventEntry,
  type WayfinderState,
} from './schemas.js';
import { isClaimActive, selectFrontier, validateWayfinderCompletion } from './selectors.js';

const LOCK_TTL_MS = 30_000;

export class WayfinderRepository {
  constructor(private readonly storage: StorageBackend) {}

  async chart(featurePath: string, featureId: string, destination: string, notes: string, actor: string): Promise<WayfinderState> {
    return this.initialize(featurePath, actor, { type: 'MAP_CHARTED', featureId, destination, notes });
  }

  async skip(featurePath: string, featureId: string, reason: string, actor: string): Promise<WayfinderState> {
    return this.initialize(featurePath, actor, { type: 'MAP_SKIPPED', featureId, reason });
  }

  async addTicket(
    featurePath: string,
    input: { title: string; question: string; type: DecisionTicketType; interaction: InteractionMode; blockedBy: string[] },
    actor: string,
  ): Promise<DecisionTicket> {
    this.validateInteraction(input.type, input.interaction);
    let created!: DecisionTicket;
    await this.mutate(featurePath, actor, (state, timestamp) => {
      for (const dependency of input.blockedBy) {
        if (!state.tickets[dependency]) throw new Error(`Blocking decision ticket not found: ${dependency}`);
      }
      created = this.createTicket(state, input, timestamp);
      return { type: 'TICKET_ADDED', ticket: created };
    });
    return created;
  }

  async addFog(featurePath: string, summary: string, actor: string): Promise<WayfinderState> {
    return this.mutate(featurePath, actor, (state, timestamp) => ({
      type: 'FOG_ADDED',
      fog: { id: this.nextId('F', state.fog.map((entry) => entry.id)), summary, createdAt: timestamp },
    }));
  }

  async graduateFog(
    featurePath: string,
    fogId: string,
    input: { title: string; question: string; type: DecisionTicketType; interaction: InteractionMode; blockedBy: string[] },
    actor: string,
  ): Promise<DecisionTicket> {
    this.validateInteraction(input.type, input.interaction);
    let created!: DecisionTicket;
    await this.mutate(featurePath, actor, (state, timestamp) => {
      if (!state.fog.some((entry) => entry.id === fogId)) throw new Error(`Fog entry not found: ${fogId}`);
      for (const dependency of input.blockedBy) {
        if (!state.tickets[dependency]) throw new Error(`Blocking decision ticket not found: ${dependency}`);
      }
      created = this.createTicket(state, input, timestamp);
      return { type: 'FOG_GRADUATED', fogId, ticket: created };
    });
    return created;
  }

  async claim(featurePath: string, ticketId: string, actor: string, leaseMinutes = 240): Promise<WayfinderState> {
    if (!Number.isFinite(leaseMinutes) || leaseMinutes <= 0) throw new Error('Claim lease must be a positive number of minutes');
    return this.mutate(featurePath, actor, (state, timestamp) => {
      const ticket = state.tickets[ticketId];
      if (!ticket) throw new Error(`Decision ticket not found: ${ticketId}`);
      const frontierIds = new Set(selectFrontier(state, new Date(timestamp)).map((entry) => entry.id));
      if (!frontierIds.has(ticketId)) throw new Error(`Decision ticket is not on the frontier: ${ticket.title}`);
      return {
        type: 'TICKET_CLAIMED',
        ticketId,
        actor,
        expiresAt: new Date(new Date(timestamp).getTime() + leaseMinutes * 60_000).toISOString(),
        replaceExpired: Boolean(ticket.claim),
      };
    });
  }

  async release(featurePath: string, ticketId: string, actor: string, reason: string): Promise<WayfinderState> {
    return this.mutate(featurePath, actor, () => ({ type: 'TICKET_RELEASED', ticketId, actor, reason }));
  }

  async resolve(
    featurePath: string,
    ticketId: string,
    actor: string,
    resolution: string,
    evidence: string[],
    contextPointers: string[],
  ): Promise<WayfinderState> {
    return this.mutate(featurePath, actor, (state, timestamp) => {
      const ticket = state.tickets[ticketId];
      if (!ticket) throw new Error(`Decision ticket not found: ${ticketId}`);
      if (!isClaimActive(ticket, new Date(timestamp))) throw new Error(`Claim expired or missing for decision ticket: ${ticket.title}`);
      if (ticket.claim?.actor !== actor) throw new Error(`Decision ticket is claimed by ${ticket.claim?.actor}: ${ticket.title}`);
      if ((ticket.interaction === 'HITL' || ticket.type === 'research') && evidence.length === 0 && contextPointers.length === 0) {
        throw new Error(`Decision ticket requires human or research evidence before resolution: ${ticket.title}`);
      }
      return { type: 'TICKET_RESOLVED', ticketId, actor, resolution, evidence, contextPointers };
    });
  }

  async exclude(featurePath: string, ticketId: string, reason: string, actor: string): Promise<WayfinderState> {
    return this.mutate(featurePath, actor, (state, timestamp) => {
      const ticket = state.tickets[ticketId];
      if (!ticket) throw new Error(`Decision ticket not found: ${ticketId}`);
      const activeClaim = isClaimActive(ticket, new Date(timestamp));
      if (activeClaim && ticket.claim?.actor !== actor) {
        throw new Error(`Decision ticket is claimed by ${ticket.claim?.actor}: ${ticket.title}`);
      }
      return { type: 'TICKET_EXCLUDED', ticketId, actor, reason, overrideExpired: Boolean(ticket.claim && !activeClaim) };
    });
  }

  async getState(featurePath: string): Promise<WayfinderState | null> {
    const entries = await this.readEvents(featurePath);
    if (!entries.length) return null;
    const first = entries[0];
    if (first.event.type !== 'MAP_CHARTED' && first.event.type !== 'MAP_SKIPPED') {
      throw new Error('First Wayfinder event must initialize the map');
    }
    let state = createWayfinderState(first.event, first.timestamp);
    for (const entry of entries.slice(1)) {
      state = wayfinderReducer(state, entry.event, entry.timestamp, entry.revision);
    }
    return WayfinderStateSchema.parse(state);
  }

  async frontier(featurePath: string): Promise<DecisionTicket[]> {
    const state = await this.requireState(featurePath);
    return selectFrontier(state);
  }

  async validateCompletion(featurePath: string): Promise<{ valid: boolean; blockers: string[] }> {
    return validateWayfinderCompletion(await this.getState(featurePath));
  }

  private async initialize(featurePath: string, actor: string, event: Extract<WayfinderEvent, { type: 'MAP_CHARTED' | 'MAP_SKIPPED' }>): Promise<WayfinderState> {
    return this.withLock(featurePath, async () => {
      if ((await this.readEvents(featurePath)).length) throw new Error('Wayfinder map is already initialized');
      const entry = WayfinderEventEntrySchema.parse({ timestamp: new Date().toISOString(), revision: 0, actor, event });
      const state = createWayfinderState(event, entry.timestamp);
      await this.appendEvent(featurePath, entry);
      await this.persistViews(featurePath, state);
      return state;
    });
  }

  private async mutate(
    featurePath: string,
    actor: string,
    createEvent: (state: WayfinderState, timestamp: string) => WayfinderEvent,
  ): Promise<WayfinderState> {
    return this.withLock(featurePath, async () => {
      const state = await this.requireState(featurePath);
      const timestamp = new Date().toISOString();
      const event = createEvent(state, timestamp);
      const revision = state.revision + 1;
      const next = wayfinderReducer(state, event, timestamp, revision);
      const entry = WayfinderEventEntrySchema.parse({ timestamp, revision, actor, event });
      await this.appendEvent(featurePath, entry);
      await this.persistViews(featurePath, next);
      return next;
    });
  }

  private async requireState(featurePath: string): Promise<WayfinderState> {
    const state = await this.getState(featurePath);
    if (!state) throw new Error('Wayfinder map is not initialized. Run wayfinder chart or wayfinder skip.');
    return state;
  }

  private createTicket(
    state: WayfinderState,
    input: { title: string; question: string; type: DecisionTicketType; interaction: InteractionMode; blockedBy: string[] },
    timestamp: string,
  ): DecisionTicket {
    return DecisionTicketSchema.parse({
      id: this.nextId('D', Object.keys(state.tickets)),
      ...input,
      blockedBy: [...new Set(input.blockedBy)],
      status: 'open',
      claim: null,
      resolution: null,
      evidence: [],
      contextPointers: [],
      exclusionReason: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      resolvedAt: null,
    });
  }

  private nextId(prefix: string, ids: string[]): string {
    const maximum = ids.reduce((current, id) => {
      const match = id.match(new RegExp(`^${prefix}-(\\d+)$`));
      return match ? Math.max(current, Number.parseInt(match[1], 10)) : current;
    }, 0);
    return `${prefix}-${String(maximum + 1).padStart(3, '0')}`;
  }

  private validateInteraction(type: DecisionTicketType, interaction: InteractionMode): void {
    if (type === 'research' && interaction !== 'AFK') throw new Error('Research decision tickets must use AFK interaction');
    if ((type === 'prototype' || type === 'grilling') && interaction !== 'HITL') {
      throw new Error(`${type} decision tickets must use HITL interaction`);
    }
  }

  private async readEvents(featurePath: string): Promise<WayfinderEventEntry[]> {
    const content = await this.storage.read(this.eventsPath(featurePath));
    if (!content?.trim()) return [];
    const entries = content.trim().split(/\r?\n/).map((line) => WayfinderEventEntrySchema.parse(parseJson(line, 'Wayfinder 事件日志')));
    entries.forEach((entry, index) => {
      if (entry.revision !== index) throw new Error(`Invalid Wayfinder event revision: expected ${index}, got ${entry.revision}`);
    });
    return entries;
  }

  private async appendEvent(featurePath: string, entry: WayfinderEventEntry): Promise<void> {
    await this.storage.append(this.eventsPath(featurePath), JSON.stringify(entry) + '\n');
  }

  private async persistViews(featurePath: string, state: WayfinderState): Promise<void> {
    const tickets = Object.values(state.tickets).sort((left, right) => left.id.localeCompare(right.id));
    const mapView = {
      schemaVersion: 1,
      featureId: state.featureId,
      destination: state.destination,
      notes: state.notes,
      notRequiredReason: state.notRequiredReason,
      revision: state.revision,
      updatedAt: state.updatedAt,
      ticketIndex: tickets.map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        type: ticket.type,
        interaction: ticket.interaction,
        status: ticket.status,
        blockedBy: ticket.blockedBy,
        claimedBy: ticket.claim?.actor ?? null,
        claimExpiresAt: ticket.claim?.expiresAt ?? null,
      })),
      fog: state.fog,
    };
    await this.storage.write(`${featurePath}/wayfinder.json`, JSON.stringify(mapView, null, 2));
    for (const ticket of tickets) {
      await this.storage.write(`${featurePath}/decision-tickets/${ticket.id}.json`, JSON.stringify(ticket, null, 2));
    }
    await this.storage.write(`${featurePath}/wayfinder.md`, this.renderMarkdown(state));
  }

  private renderMarkdown(state: WayfinderState): string {
    const lines = ['# 决策地图', '', '## 目标', ''];
    if (state.notRequiredReason) {
      lines.push('无需建立决策地图：' + state.notRequiredReason, '');
    } else {
      lines.push(state.destination, '', '## 备注', '', state.notes || '（无）', '');
    }
    lines.push('## 已完成决策', '');
    const resolved = Object.values(state.tickets).filter((ticket) => ticket.status === 'resolved');
    if (!resolved.length) lines.push('（无）');
    for (const ticket of resolved) {
      const gist = (ticket.resolution ?? '').replace(/\s+/g, ' ').slice(0, 160);
      lines.push(`- [${ticket.title}](decision-tickets/${ticket.id}.json) - ${gist}`);
    }
    lines.push('', '## 尚未明确', '');
    if (!state.fog.length) lines.push('（无）');
    for (const fog of state.fog) lines.push(`- ${fog.id}: ${fog.summary}`);
    lines.push('', '## 范围外', '');
    const excluded = Object.values(state.tickets).filter((ticket) => ticket.status === 'excluded');
    if (!excluded.length) lines.push('（无）');
    for (const ticket of excluded) {
      lines.push(`- [${ticket.title}](decision-tickets/${ticket.id}.json) - ${ticket.exclusionReason}`);
    }
    lines.push('');
    return lines.join('\n');
  }

  private eventsPath(featurePath: string): string {
    return `${featurePath}/wayfinder-events.jsonl`;
  }

  private async withLock<T>(featurePath: string, action: () => Promise<T>): Promise<T> {
    const lockPath = `${featurePath}/.wayfinder.lock`;
    const token = randomUUID();
    const lock = JSON.stringify({ token, createdAt: new Date().toISOString() });
    let acquired = await this.storage.writeIfAbsent(lockPath, lock);
    if (!acquired) {
      const existing = await this.storage.read(lockPath);
      let expired = false;
      try {
        const createdAt = JSON.parse(existing ?? '{}').createdAt;
        expired = typeof createdAt === 'string' && Date.now() - new Date(createdAt).getTime() > LOCK_TTL_MS;
      } catch {
        expired = true;
      }
      if (expired) {
        await this.storage.delete(lockPath);
        acquired = await this.storage.writeIfAbsent(lockPath, lock);
      }
    }
    if (!acquired) throw new Error('Wayfinder map is busy; another process is updating it');
    try {
      return await action();
    } finally {
      if ((await this.storage.read(lockPath)) === lock) await this.storage.delete(lockPath);
    }
  }
}
