/**
 * Artifact Repository
 * Manages Feature artifacts (decision-log.md, spec.md, etc.)
 * Provides read/write/list operations with validation.
 */

import type { StorageBackend } from '../storage/types.js';

export class ArtifactRepository {
  constructor(
    private storage: StorageBackend,
    private featurePath: string,
  ) {}

  /** Read an artifact by name */
  async read(name: string): Promise<string | null> {
    return this.storage.read(`${this.featurePath}/${name}`);
  }

  /** Write an artifact */
  async write(name: string, content: string): Promise<void> {
    await this.storage.write(`${this.featurePath}/${name}`, content);
  }

  /** Check if an artifact exists */
  async exists(name: string): Promise<boolean> {
    return this.storage.exists(`${this.featurePath}/${name}`);
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
}
