/**
 * Bootstrap - Initialize the DI container with all providers.
 * Called at application startup (CLI or programmatic).
 */
import { container } from './container.js';
import { TOKENS, ConsoleLogger } from './tokens.js';
import { FilesystemStorage } from '../storage/filesystem.js';
import { KnowledgeStore } from '../knowledge/store.js';
import { WorkflowEngine } from '../engine/workflow-engine.js';
import { loadConfig } from '../config/loader.js';
export function bootstrap(rootPath, logger) {
    const config = loadConfig(rootPath);
    const log = logger ?? new ConsoleLogger();
    // Register providers
    container.provide(TOKENS.Storage, new FilesystemStorage(rootPath));
    container.provide(TOKENS.Logger, log);
    container.provide(TOKENS.Config, config);
    const storage = container.inject(TOKENS.Storage);
    const knowledgeStore = new KnowledgeStore(storage, config.knowledgeDir);
    container.provide(TOKENS.KnowledgeStore, knowledgeStore);
    const engine = new WorkflowEngine(storage, knowledgeStore, log, config);
    container.provide(TOKENS.WorkflowEngine, engine);
    return config;
}
export { container, TOKENS };
//# sourceMappingURL=bootstrap.js.map