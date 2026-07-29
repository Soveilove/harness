/**
 * @sovei/core - Sovei Workflow Engine
 * Portable development SOP with typed knowledge management.
 *
 * Design patterns:
 * - XState-inspired state machine with event sourcing
 * - Vite-inspired stage plugin system with lifecycle hooks
 * - Redux-inspired knowledge store with typed actions
 * - NestJS-inspired lightweight DI container
 * - Express-inspired pipeline with context passing
 */
// Engine
export { WorkflowEngine, DEFAULT_WORKFLOW } from './engine/workflow-engine.js';
export { workflowReducer, createInitialState, canExecuteStage } from './engine/state-machine.js';
export { EventStore } from './engine/event-store.js';
// Stages
export { defineStage } from './stages/define-stage.js';
export { stageRegistry } from './stages/registry.js';
// Knowledge
export { KnowledgeStore } from './knowledge/store.js';
export * from './knowledge/schemas.js';
export * from './knowledge/lifecycle.js';
// Storage
export { FilesystemStorage } from './storage/filesystem.js';
export { MemoryStorage } from './storage/memory.js';
// Providers
export { container, TOKENS } from './providers/container.js';
export { bootstrap } from './providers/bootstrap.js';
export { ConsoleLogger } from './providers/tokens.js';
// Artifacts
export { ArtifactRepository } from './artifacts/repository.js';
// Config
export { loadConfig, getFeaturePath } from './config/loader.js';
//# sourceMappingURL=index.js.map