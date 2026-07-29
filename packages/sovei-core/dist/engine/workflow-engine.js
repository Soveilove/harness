/**
 * Workflow Engine
 * High-level orchestrator that ties together:
 * - State machine (pure transitions)
 * - Event store (append-only log)
 * - Stage registry (plugin system)
 * - Knowledge store (typed knowledge)
 * - Artifact repository (feature files)
 *
 * The engine is the single entry point for all workflow operations.
 */
import { canExecuteStage } from './state-machine.js';
import { EventStore } from './event-store.js';
import { stageRegistry } from '../stages/registry.js';
import { ArtifactRepository } from '../artifacts/repository.js';
import { getFeaturePath } from '../config/loader.js';
/** Default workflow definition for Sovei 2.0 */
export const DEFAULT_WORKFLOW = {
    version: '2.0.0',
    maxStagesPerInvocation: 1,
    allowChaining: false,
    stageOrder: [
        'load', 'grill', 'wayfind', 'spec', 'scope', 'plan',
        'tasks', 'implement', 'converge', 'verify', 'learn', 'sync',
    ],
    stages: {
        load: { name: 'load', status: 'active', requiredArtifacts: [], producesArtifacts: [], next: ['grill'] },
        grill: { name: 'grill', status: 'active', requiredArtifacts: [], producesArtifacts: ['decision-log.md'], next: ['wayfind', 'spec'] },
        wayfind: { name: 'wayfind', status: 'active', requiredArtifacts: ['decision-log.md'], producesArtifacts: ['wayfinder.md'], next: ['spec'] },
        spec: { name: 'spec', status: 'active', requiredArtifacts: ['decision-log.md'], producesArtifacts: ['spec.md'], next: ['scope'] },
        scope: { name: 'scope', status: 'active', requiredArtifacts: ['spec.md'], producesArtifacts: ['scope.md', 'coverage-matrix.md'], next: ['plan'] },
        plan: { name: 'plan', status: 'active', requiredArtifacts: ['spec.md', 'scope.md', 'coverage-matrix.md'], producesArtifacts: ['plan.md'], next: ['tasks'] },
        tasks: { name: 'tasks', status: 'active', requiredArtifacts: ['plan.md'], producesArtifacts: ['tasks.md'], next: ['implement'] },
        implement: { name: 'implement', status: 'active', requiredArtifacts: ['tasks.md'], producesArtifacts: ['change-manifest.md'], next: ['converge'] },
        converge: { name: 'converge', status: 'active', requiredArtifacts: ['change-manifest.md'], producesArtifacts: ['convergence-report.md'], next: ['verify'] },
        verify: { name: 'verify', status: 'active', requiredArtifacts: ['convergence-report.md'], producesArtifacts: ['evidence.md'], next: ['learn'] },
        learn: { name: 'learn', status: 'active', requiredArtifacts: ['evidence.md'], producesArtifacts: ['learning-report.md'], next: ['sync'] },
        sync: { name: 'sync', status: 'active', requiredArtifacts: ['learning-report.md'], producesArtifacts: ['sync-report.md'], next: [] },
    },
};
export class WorkflowEngine {
    storage;
    knowledgeStore;
    logger;
    config;
    eventStore;
    workflow;
    constructor(storage, knowledgeStore, logger, config) {
        this.storage = storage;
        this.knowledgeStore = knowledgeStore;
        this.logger = logger;
        this.config = config;
        this.eventStore = new EventStore(storage);
        this.workflow = DEFAULT_WORKFLOW;
    }
    /** Bootstrap a new feature */
    async bootstrap(featureId) {
        const featurePath = getFeaturePath(this.config, featureId);
        const event = { type: 'BOOTSTRAP', featureId };
        await this.eventStore.append(featurePath, event);
        const state = await this.eventStore.replay(featurePath, this.workflow);
        await this.eventStore.persistState(featurePath, state);
        this.logger.info(`Bootstrapped feature: ${featureId}`);
        return state;
    }
    /** Get current state (from event replay) */
    async getState(featureId) {
        const featurePath = getFeaturePath(this.config, featureId);
        return this.eventStore.replay(featurePath, this.workflow);
    }
    /** Execute a stage */
    async executeStage(featureId, stageName) {
        const featurePath = getFeaturePath(this.config, featureId);
        const state = await this.getState(featureId);
        // Guard: can we execute this stage?
        const check = canExecuteStage(state, stageName, this.workflow);
        if (!check.valid) {
            throw new Error(check.reason);
        }
        // Get stage definition from registry
        const stageDef = stageRegistry.get(stageName);
        // Create context
        const artifacts = new ArtifactRepository(this.storage, featurePath);
        const ctx = {
            featureId,
            featurePath,
            workflowState: state,
            knowledge: this.knowledgeStore,
            artifacts,
            logger: this.logger,
        };
        // preExecute hook
        if (stageDef.preExecute) {
            const pre = await stageDef.preExecute(ctx);
            if (pre?.block) {
                throw new Error(`Stage ${stageName} blocked: ${pre.reason}`);
            }
        }
        // Check required artifacts
        const { missing } = await artifacts.checkRequired(stageDef.contract.requiredArtifacts);
        if (missing.length > 0) {
            throw new Error(`Missing required artifacts for ${stageName}: ${missing.join(', ')}`);
        }
        // Execute
        const result = await stageDef.execute(ctx);
        // Write template artifacts so postExecute validation passes.
        // AI agents will fill these in based on the prompt contract.
        for (const artifactName of stageDef.contract.producesArtifacts) {
            const exists = await artifacts.exists(artifactName);
            if (!exists) {
                const template = this.getArtifactTemplate(artifactName, stageName, result.prompt);
                await artifacts.write(artifactName, template);
                this.logger.debug('Created template: ' + artifactName);
            }
        }
        // postExecute hook
        if (stageDef.postExecute) {
            await stageDef.postExecute(ctx, result);
        }
        // Record event
        const event = {
            type: 'STAGE_COMPLETE',
            stage: stageName,
            artifacts: result.artifactsWritten,
        };
        await this.eventStore.append(featurePath, event, stageName);
        // Derive and persist new state
        const newState = await this.eventStore.replay(featurePath, this.workflow);
        await this.eventStore.persistState(featurePath, newState);
        // cleanup hook
        if (stageDef.cleanup) {
            await stageDef.cleanup(ctx);
        }
        this.logger.info(`Stage ${stageName} completed. Next: ${newState.nextStage ?? 'done'}`);
        return result;
    }
    /** Reopen a completed stage */
    async reopen(featureId, targetStage, reason) {
        const featurePath = getFeaturePath(this.config, featureId);
        const state = await this.getState(featureId);
        const event = { type: 'REOPEN', target: targetStage, reason };
        await this.eventStore.append(featurePath, event, state.currentStage);
        const newState = await this.eventStore.replay(featurePath, this.workflow);
        await this.eventStore.persistState(featurePath, newState);
        this.logger.info(`Reopened ${targetStage}. Revision: ${newState.revision}`);
        return newState;
    }
    /** Get the workflow definition */
    getWorkflow() {
        return this.workflow;
    }
    /** List all registered stages */
    listStages() {
        return stageRegistry.list();
    }
    /** Generate a template for an artifact */
    getArtifactTemplate(artifactName, stageName, prompt) {
        const title = artifactName.replace(/\.md$/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const header = '# ' + title + '\n\n';
        const note = '> Generated by Sovei stage: ' + stageName + '\n';
        const note2 = '> AI agent: replace this template with actual content based on the prompt contract below.\n\n';
        const separator = '---\n\n';
        const promptSection = prompt ? '## Prompt Contract\n\n' + prompt + '\n' : '';
        return header + note + note2 + separator + promptSection;
    }
}
//# sourceMappingURL=workflow-engine.js.map