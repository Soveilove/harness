/**
 * Event Store - Append-only log with replay
 * Inspired by Event Sourcing: state = fold(events, reducer)
 *
 * All state changes are immutable events. The current state is always
 * derived by replaying events through the reducer.
 */
import { workflowReducer, createInitialState } from './state-machine.js';
const EVENTS_FILE = 'workflow-events.jsonl';
const STATE_FILE = 'workflow-state.yaml';
export class EventStore {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    /** Append an event to the feature's event log */
    async append(featurePath, event, sourceStage = null) {
        const eventsPath = `${featurePath}/${EVENTS_FILE}`;
        const revision = await this.nextRevision(featurePath);
        const entry = {
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
    async readAll(featurePath) {
        const eventsPath = `${featurePath}/${EVENTS_FILE}`;
        const content = await this.storage.read(eventsPath);
        if (!content)
            return [];
        return content
            .trim()
            .split('\n')
            .filter((line) => line.trim())
            .map((line) => JSON.parse(line));
    }
    /**
     * Replay events to derive current state.
     * This is the single source of truth - state file is a cache.
     */
    async replay(featurePath, workflow) {
        const events = await this.readAll(featurePath);
        if (events.length === 0) {
            throw new Error('No events found - feature not bootstrapped');
        }
        const firstEntry = events[0];
        if (firstEntry.event.type !== 'BOOTSTRAP') {
            throw new Error('First event must be BOOTSTRAP');
        }
        let state = createInitialState(firstEntry.event.featureId);
        for (const entry of events) {
            state = workflowReducer(state, entry.event, workflow);
        }
        return state;
    }
    /** Persist derived state as a YAML cache file */
    async persistState(featurePath, state) {
        const statePath = `${featurePath}/${STATE_FILE}`;
        const yaml = this.stateToYaml(state);
        await this.storage.write(statePath, yaml);
    }
    /** Read the cached state file (for quick reads without replay) */
    async readStateCache(featurePath) {
        const statePath = `${featurePath}/${STATE_FILE}`;
        const content = await this.storage.read(statePath);
        if (!content)
            return null;
        return this.parseStateYaml(content);
    }
    async nextRevision(featurePath) {
        const events = await this.readAll(featurePath);
        return events.length;
    }
    stateToYaml(state) {
        const lines = [
            `featureId: ${JSON.stringify(state.featureId)}`,
            `status: ${state.status}`,
            `currentStage: ${state.currentStage ? JSON.stringify(state.currentStage) : 'null'}`,
            `nextStage: ${state.nextStage ? JSON.stringify(state.nextStage) : 'null'}`,
            `completedStages:`,
            ...state.completedStages.map((s) => `  - ${JSON.stringify(s)}`),
            `reopenedStages:`,
            ...(state.reopenedStages.length ? state.reopenedStages.map((s) => `  - ${JSON.stringify(s)}`) : ['  []']),
            `revision: ${state.revision}`,
            `riskLevel: ${state.riskLevel}`,
            `blockers:`,
            ...(state.blockers.length ? state.blockers.map((b) => `  - ${JSON.stringify(b)}`) : ['  []']),
            `updatedAt: ${JSON.stringify(state.updatedAt)}`,
        ];
        return lines.join('\n') + '\n';
    }
    parseStateYaml(content) {
        // Simple YAML parser for our own format
        const state = {
            completedStages: [],
            reopenedStages: [],
            blockers: [],
        };
        let currentList = null;
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                continue;
            if (line.startsWith('  - ')) {
                const value = JSON.parse(trimmed.slice(2));
                if (currentList)
                    currentList.push(value);
                continue;
            }
            currentList = null;
            const colonIdx = trimmed.indexOf(':');
            if (colonIdx === -1)
                continue;
            const key = trimmed.slice(0, colonIdx).trim();
            const value = trimmed.slice(colonIdx + 1).trim();
            switch (key) {
                case 'featureId':
                    state.featureId = JSON.parse(value);
                    break;
                case 'status':
                    state.status = value;
                    break;
                case 'currentStage':
                    state.currentStage = value === 'null' ? null : JSON.parse(value);
                    break;
                case 'nextStage':
                    state.nextStage = value === 'null' ? null : JSON.parse(value);
                    break;
                case 'completedStages':
                    currentList = state.completedStages;
                    break;
                case 'reopenedStages':
                    currentList = state.reopenedStages;
                    break;
                case 'revision':
                    state.revision = parseInt(value, 10);
                    break;
                case 'riskLevel':
                    state.riskLevel = value;
                    break;
                case 'blockers':
                    currentList = state.blockers;
                    break;
                case 'updatedAt':
                    state.updatedAt = JSON.parse(value);
                    break;
            }
        }
        return state;
    }
}
//# sourceMappingURL=event-store.js.map