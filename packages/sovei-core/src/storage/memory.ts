/**
 * In-Memory Storage Backend (for testing)
 */

import type { StorageBackend } from './types.js';

export class MemoryStorage implements StorageBackend {
  private files = new Map<string, string>();

  private normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
  }

  async read(filePath: string): Promise<string | null> {
    return this.files.get(this.normalize(filePath)) ?? null;
  }

  async write(filePath: string, content: string): Promise<void> {
    this.files.set(this.normalize(filePath), content);
  }

  async writeIfAbsent(filePath: string, content: string): Promise<boolean> {
    const path = this.normalize(filePath);
    if (this.files.has(path)) return false;
    this.files.set(path, content);
    return true;
  }

  async append(filePath: string, content: string): Promise<void> {
    const path = this.normalize(filePath);
    const existing = this.files.get(path) ?? '';
    this.files.set(path, existing + content);
  }

  async exists(filePath: string): Promise<boolean> {
    return this.files.has(this.normalize(filePath));
  }

  async delete(filePath: string): Promise<void> {
    this.files.delete(this.normalize(filePath));
  }

  async list(dirPath: string): Promise<string[]> {
    const normalized = this.normalize(dirPath);
    const prefix = normalized ? normalized + '/' : '';
    const files = [...this.files.keys()]
      .filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes('/'));
    return files.map((k) => k.slice(prefix.length)).sort();
  }

  async listEntries(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> {
    const normalized = this.normalize(dirPath);
    const prefix = normalized ? normalized + '/' : '';
    const seen = new Set<string>();
    const results: { name: string; isDirectory: boolean }[] = [];
    for (const key of this.files.keys()) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      if (!rest) continue;
      const firstSeg = rest.split('/')[0];
      if (seen.has(firstSeg)) continue;
      seen.add(firstSeg);
      const isDir = rest.includes('/');
      results.push({ name: firstSeg, isDirectory: isDir });
    }
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  async isDirectory(filePath: string): Promise<boolean> {
    // In memory storage, a path is a directory if it's a prefix of other paths
    // but not a file itself
    const normalized = this.normalize(filePath);
    if (this.files.has(normalized)) return false;
    const prefix = normalized ? normalized + '/' : '';
    return [...this.files.keys()].some((k) => k.startsWith(prefix));
  }

  async listRecursive(dirPath: string): Promise<string[]> {
    const normalized = this.normalize(dirPath);
    const prefix = normalized ? normalized + '/' : '';
    return [...this.files.keys()]
      .filter((k) => k.startsWith(prefix))
      .sort();
  }
}
