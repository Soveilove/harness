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
import { SkillManager } from '../skills/manager.js';
import { SkillAdapterRegistry } from '../skills/registry.js';
import type { SoveiConfig } from '../config/types.js';
import type { Logger } from './tokens.js';

export function bootstrap(rootPath: string, logger?: Logger): SoveiConfig {
  const config = loadConfig(rootPath);
  const log = logger ?? new ConsoleLogger();

  // Register providers
  container.provide(TOKENS.Storage, new FilesystemStorage(rootPath));
  container.provide(TOKENS.Logger, log);
  container.provide(TOKENS.Config, config);

  const storage = container.inject(TOKENS.Storage) as FilesystemStorage;
  const knowledgeStore = new KnowledgeStore(storage, config.knowledgeDir);
  container.provide(TOKENS.KnowledgeStore, knowledgeStore);

  // Initialize the skill runtime: read map/lock and register bindings so the
  // resolver can report which third-party skills are actually connected. Native
  // bindings resolve to null (Sovei keeps executing its own stages).
  const skillManager = new SkillManager(storage);
  const skillRegistry = new SkillAdapterRegistry();
  (async () => {
    try {
      const status = await skillManager.status();
      for (const binding of status.bindings) {
        if (!binding.skillId.startsWith('sovei/native/')) skillRegistry.registerBinding(binding);
      }
    } catch {
      // Skill config problems must not block the rest of the CLI.
    }
  })();
  container.provide(TOKENS.SkillRegistry, skillRegistry);
  container.provide(TOKENS.SkillManager, skillManager);

  const engine = new WorkflowEngine(storage, knowledgeStore, log, config);
  container.provide(TOKENS.WorkflowEngine, engine);

  return config;
}

export { container, TOKENS };
