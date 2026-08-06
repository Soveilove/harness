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
import { parseSkillMap, parseSkillLock } from '../skills/config.js';
import { MarkdownSkillAdapter, parseSkillFile } from '../skills/adapter.js';
import type { SkillManifest } from '../skills/types.js';
import type { SoveiConfig } from '../config/types.js';
import type { Logger } from './tokens.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

  // Synchronously read skill config and register adapters so they are available
  // before the WorkflowEngine is constructed.
  try {
    const mapPath = join(rootPath, 'harness/skills/skill-map.yaml');
    const lockPath = join(rootPath, 'harness/skills/skill-lock.yaml');
    const mapContent = readFileSync(mapPath, 'utf8');
    const lockContent = readFileSync(lockPath, 'utf8');
    const map = parseSkillMap(mapContent);
    const lock = parseSkillLock(lockContent);

    // Register non-native bindings
    for (const binding of map.bindings) {
      if (!binding.skillId.startsWith('sovei/native/')) {
        skillRegistry.registerBinding(binding);
      }
    }

    // Create and register adapters for each enabled locked skill
    for (const [skillId, lockEntry] of Object.entries(lock.skills)) {
      if (lockEntry.status !== 'enabled') continue;
      const skillFile = join(rootPath, lockEntry.source, 'SKILL.md');
      try {
        const skillContent = readFileSync(skillFile, 'utf8');
        const parsed = parseSkillFile(skillContent);
        const supportedStages = map.bindings
          .filter((b) => b.skillId === skillId)
          .map((b) => b.stage);
        const manifest: SkillManifest = {
          id: skillId,
          name: parsed.name || skillId,
          version: lockEntry.version,
          source: {
            type: 'path',
            locator: lockEntry.source,
            ref: lockEntry.ref || undefined,
            commit: lockEntry.commit || undefined,
          },
          license: lockEntry.license,
          supportedStages: supportedStages.length ? supportedStages : ['unknown'],
          readOnly: true,
          protocolVersion: '1.0.0',
        };
        const adapter = new MarkdownSkillAdapter(manifest, skillContent);
        skillRegistry.registerAdapter(adapter);
      } catch {
        // Skill file not found or invalid – skip; fallback will handle at runtime
      }
    }
  } catch {
    // Skill config problems must not block the rest of the CLI.
  }

  container.provide(TOKENS.SkillRegistry, skillRegistry);
  container.provide(TOKENS.SkillManager, skillManager);

  const engine = new WorkflowEngine(storage, knowledgeStore, log, config, skillRegistry);
  container.provide(TOKENS.WorkflowEngine, engine);

  return config;
}

export { container, TOKENS };
