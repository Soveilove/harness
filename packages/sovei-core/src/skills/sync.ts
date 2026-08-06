/**
 * SkillAgentSync - render connected skills into per-agent context files.
 *
 * OpenSpec-style single-source → multi-output. Reads the project skill-map and
 * compiles the enabled/candidate bindings into directives each host agent can
 * read at runtime (AGENTS.md, CLAUDE.md, .cursorrules). It never overwrites the
 * rest of those files: it only replaces the section between two sentinel
 * comments (`<!-- sovei-skills:start -->` ... `<!-- sovei-skills:end -->`).
 */

import { adapterRegistry, type SkillBindingRender } from '../adapters/registry.js';
import type { StorageBackend } from '../storage/types.js';
import { SKILL_MAP_FILE } from './manager.js';
import { parseSkillMap } from './config.js';

export const SKILL_SECTION_START = '<!-- sovei-skills:start -->';
export const SKILL_SECTION_END = '<!-- sovei-skills:end -->';

export interface SyncResult {
  files: string[];
  bindings: SkillBindingRender[];
}

/**
 * Upsert the skill directives into a target context file, replacing only the
 * marked section. Preserves any other content the user already has.
 */
async function upsertSection(
  storage: StorageBackend,
  filePath: string,
  section: string,
): Promise<boolean> {
  const existing = await storage.read(filePath);
  const block = `${SKILL_SECTION_START}\n${section}\n${SKILL_SECTION_END}`;
  if (!existing) {
    await storage.write(filePath, `# Agent context\n\n${block}\n`);
    return true;
  }
  const start = existing.indexOf(SKILL_SECTION_START);
  const end = existing.indexOf(SKILL_SECTION_END);
  if (start === -1 || end === -1 || end < start) {
    // No existing section: append at the end.
    const next = existing.endsWith('\n') ? existing : existing + '\n';
    await storage.write(filePath, next + '\n' + block + '\n');
    return true;
  }
  const head = existing.slice(0, start);
  const tail = existing.slice(end + SKILL_SECTION_END.length);
  await storage.write(filePath, head + block + tail);
  return true;
}

export class SkillAgentSync {
  constructor(private readonly storage: StorageBackend) {}

  /** Render current skill-map bindings into all registered agent context files. */
  async sync(adapterIds?: string[]): Promise<SyncResult> {
    const mapContent = await this.storage.read(SKILL_MAP_FILE);
    const bindings: SkillBindingRender[] = [];
    if (mapContent) {
      try {
        const map = parseSkillMap(mapContent);
        bindings.push(...map.bindings.map((b) => ({
          stage: b.stage,
          skillId: b.skillId,
          status: b.status,
        })));
      } catch {
        // Invalid map: render nothing for this file, but keep going.
      }
    }

    let adapters = adapterRegistry.list();
    if (adapterIds?.length) {
      adapters = adapterIds
        .map((id) => adapterRegistry.get(id))
        .filter(Boolean);
    }

    const files: string[] = [];
    const seen = new Set<string>();
    for (const adapter of adapters) {
      if (seen.has(adapter.contextFile)) continue;
      seen.add(adapter.contextFile);
      const section = adapter.renderSkillDirectives(bindings);
      await upsertSection(this.storage, adapter.contextFile, section);
      files.push(adapter.contextFile);
    }
    return { files, bindings };
  }

  /** Remove the sovei skills section from agent context files (clean). */
  async clean(adapterIds?: string[]): Promise<string[]> {
    let adapters = adapterRegistry.list();
    if (adapterIds?.length) {
      adapters = adapterIds
        .map((id) => adapterRegistry.get(id))
        .filter(Boolean);
    }
    const files: string[] = [];
    for (const adapter of adapters) {
      const existing = await this.storage.read(adapter.contextFile);
      if (!existing) continue;
      const start = existing.indexOf(SKILL_SECTION_START);
      const end = existing.indexOf(SKILL_SECTION_END);
      if (start === -1 || end === -1 || end < start) continue;
      const cleaned = existing.slice(0, start) + existing.slice(end + SKILL_SECTION_END.length);
      await this.storage.write(adapter.contextFile, cleaned.trimEnd() + '\n');
      files.push(adapter.contextFile);
    }
    return files;
  }
}
