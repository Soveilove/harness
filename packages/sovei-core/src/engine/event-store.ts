/**
 * Event Store - Append-only log with replay
 * Inspired by Event Sourcing: state = fold(events, reducer)
 *
 * All state changes are immutable events. The current state is always
 * derived by replaying events through the reducer.
 */

import type { WorkflowState, WorkflowEvent, WorkflowEventEntry } from './types.js';
import type { WorkflowDefinition } from './types.js';
import { workflowReducer, createInitialState } from './state-machine.js';
import type { StorageBackend } from '../storage/types.js';

const EVENTS_FILE = 'workflow-events.jsonl';
const STATE_FILE = 'workflow-state.yaml';

export class EventStore {
  constructor(private storage: StorageBackend) {}

  /** Append an event to the feature's event log */
  async append(
    featurePath: string,
    event: WorkflowEvent,
    sourceStage: string | null = null,
  ): Promise<WorkflowEventEntry> {
    const eventsPath = `${featurePath}/${EVENTS_FILE}`;
    const revision = await this.nextRevision(featurePath);

    const entry: WorkflowEventEntry = {
      timestamp: new Date().toISOString(),
      revision,
      event,
      actor: 'cli',
      sourceStage,
    };

    await this.storage.append(eventsPath, JSON.stringify(entry) + '\n');
    return entry;
  }

  /** Read all events for a feature */
  async readAll(featurePath: string): Promise<WorkflowEventEntry[]> {
    const eventsPath = `${featurePath}/${EVENTS_FILE}`;
    const content = await this.storage.read(eventsPath);
    if (!content) return [];

    const entries: WorkflowEventEntry[] = [];
    for (const line of content.trim().split('\n')) {
      if (!line.trim()) continue;
      try {
        entries.push(JSON.parse(line) as WorkflowEventEntry);
      } catch (error) {
        // Append-only log: a corrupt line is usually a half-written tail
        // from a crash. Skip it (with a warning) rather than abort replay.
        console.error(`警告:跳过无法解析的事件日志行:${(error as Error).message}`);
      }
    }
    return entries;
  }

  /**
   * Replay events to derive current state.
   * This is the single source of truth - state file is a cache.
   */
  async replay(
    featurePath: string,
    workflow: WorkflowDefinition,
  ): Promise<WorkflowState> {
    const events = await this.readAll(featurePath);
    if (events.length === 0) {
      throw new Error('No events found - feature not bootstrapped');
    }

    const firstEntry = events[0];
    if (firstEntry.event.type !== 'BOOTSTRAP') {
      throw new Error('First event must be BOOTSTRAP');
    }

    let state = createInitialState(firstEntry.event.featureId);
    for (const entry of events.slice(1)) {
      state = workflowReducer(state, entry.event, workflow);
    }
    return state;
  }

  /** Persist derived state as a YAML cache file */
  async persistState(featurePath: string, state: WorkflowState): Promise<void> {
    const statePath = `${featurePath}/${STATE_FILE}`;
    const yaml = this.stateToYaml(state);
    await this.storage.write(statePath, yaml);
  }

  /** Read the cached state file (for quick reads without replay) */
  async readStateCache(featurePath: string): Promise<WorkflowState | null> {
    const statePath = `${featurePath}/${STATE_FILE}`;
    const content = await this.storage.read(statePath);
    if (!content) return null;
    try {
      return this.parseStateYaml(content);
    } catch (error) {
      // State file is only a cache; on corruption, return null so callers replay.
      console.error(`警告:工作流状态缓存已损坏,将重新回放事件重建:${(error as Error).message}`);
      return null;
    }
  }

  private async nextRevision(featurePath: string): Promise<number> {
    const events = await this.readAll(featurePath);
    return events.length;
  }

  private stateToYaml(state: WorkflowState): string {
    const lines = [
      `featureId: ${JSON.stringify(state.featureId)}`,
      `status: ${state.status}`,
      `currentStage: ${state.currentStage ? JSON.stringify(state.currentStage) : 'null'}`,
      `nextStage: ${state.nextStage ? JSON.stringify(state.nextStage) : 'null'}`,
      `completedStages:`,
      ...state.completedStages.map((s) => `  - ${JSON.stringify(s)}`),
      `reopenedStages:`,
      ...(state.reopenedStages.length ? state.reopenedStages.map((s) => `  - ${JSON.stringify(s)}`) : ['  []']),
      `completedTaskIds:`,
      ...(state.completedTaskIds.length ? state.completedTaskIds.map((s) => `  - ${JSON.stringify(s)}`) : ['  []']),
      `activeChangeId: ${state.activeChangeId ? JSON.stringify(state.activeChangeId) : 'null'}`,
      `revision: ${state.revision}`,
      `riskLevel: ${state.riskLevel}`,
      `blockers:`,
      ...(state.blockers.length ? state.blockers.map((b) => `  - ${JSON.stringify(b)}`) : ['  []']),
      `updatedAt: ${JSON.stringify(state.updatedAt)}`,
    ];
    return lines.join('\n') + '\n';
  }

  private parseStateYaml(content: string): WorkflowState {
    // Simple YAML parser for our own format
    const state: Partial<WorkflowState> = {
      completedStages: [],
      reopenedStages: [],
      completedTaskIds: [],
      activeChangeId: null,
      blockers: [],
    };
    let currentList: string[] | null = null;

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (line.startsWith('  - ')) {
        const value = JSON.parse(trimmed.slice(2));
        if (currentList) currentList.push(value);
        continue;
      }

      currentList = null;
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();

      switch (key) {
        case 'featureId':
          state.featureId = JSON.parse(value);
          break;
        case 'status':
          state.status = value as WorkflowState['status'];
          break;
        case 'currentStage':
          state.currentStage = value === 'null' ? null : JSON.parse(value);
          break;
        case 'nextStage':
          state.nextStage = value === 'null' ? null : JSON.parse(value);
          break;
        case 'completedStages':
          currentList = state.completedStages!;
          break;
        case 'reopenedStages':
          currentList = state.reopenedStages!;
          break;
        case 'completedTaskIds':
          currentList = state.completedTaskIds!;
          break;
        case 'activeChangeId':
          state.activeChangeId = value === 'null' ? null : JSON.parse(value);
          break;
        case 'revision':
          state.revision = parseInt(value, 10);
          break;
        case 'riskLevel':
          state.riskLevel = value as WorkflowState['riskLevel'];
          break;
        case 'blockers':
          currentList = state.blockers!;
          break;
        case 'updatedAt':
          state.updatedAt = JSON.parse(value);
          break;
      }
    }

    return state as WorkflowState;
  }
}
