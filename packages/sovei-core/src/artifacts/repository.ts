/**
 * Artifact Repository
 * Manages Feature artifacts (decision-log.md, spec.md, etc.)
 * Provides read/write/list operations with validation.
 */

import type { StorageBackend } from '../storage/types.js';

/**
 * Build the artifact directory path for a sub-change.
 * Sub-change artifacts live under `specs/<feature>/sub-changes/<id>/`.
 */
export function getSubChangePath(featurePath: string, subChangeId: string): string {
  return `${featurePath}/sub-changes/${subChangeId}`;
}

export class ArtifactRepository {
  /**
   * Optional parent artifact root. When set (sub-change context), read/exists
   * fall back to the parent root for shared front-stage artifacts (spec.md,
   * scope.md, ...) that live at the Feature top level, not in the sub-change
   * directory. Writes always target the primary featurePath (sub-change dir).
   */
  constructor(
    private storage: StorageBackend,
    private featurePath: string,
    private parentPath?: string,
  ) {}

  /** Read an artifact by name (falls back to parent root in sub-change context) */
  async read(name: string): Promise<string | null> {
    const primary = await this.storage.read(`${this.featurePath}/${name}`);
    if (primary !== null) return primary;
    if (this.parentPath) return this.storage.read(`${this.parentPath}/${name}`);
    return null;
  }

  /** Write an artifact (always to the primary featurePath, never to parent) */
  async write(name: string, content: string): Promise<void> {
    await this.storage.write(`${this.featurePath}/${name}`, content);
  }

  /** Check if an artifact exists (falls back to parent root in sub-change context) */
  async exists(name: string): Promise<boolean> {
    if (await this.storage.exists(`${this.featurePath}/${name}`)) return true;
    if (this.parentPath) return this.storage.exists(`${this.parentPath}/${name}`);
    return false;
  }

  /** List all artifacts in the feature directory */
  async list(): Promise<string[]> {
    return this.storage.list(this.featurePath);
  }

  /** Delete an artifact */
  async delete(name: string): Promise<void> {
    await this.storage.delete(`${this.featurePath}/${name}`);
  }

  /** Check that all required artifacts exist */
  async checkRequired(required: string[]): Promise<{ missing: string[] }> {
    const missing: string[] = [];
    for (const name of required) {
      if (!(await this.exists(name))) {
        missing.push(name);
      }
    }
    return { missing };
  }

  /** Produced artifacts must contain real work, not the generated prompt template. */
  async validateProduced(names: string[]): Promise<{ missing: string[]; placeholders: string[] }> {
    const missing: string[] = [];
    const placeholders: string[] = [];
    for (const name of names) {
      const content = await this.read(name);
      if (!content?.trim()) {
        missing.push(name);
      } else if (content.includes('SOVEI_TEMPLATE_PLACEHOLDER')) {
        placeholders.push(name);
      }
    }
    return { missing, placeholders };
  }
}
