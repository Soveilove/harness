/**
 * Filesystem Storage Backend
 * Default implementation using Node.js fs/promises
 */

import { readFile, writeFile, appendFile, mkdir, unlink, readdir, stat, access, open } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import type { StorageBackend } from './types.js';

export class FilesystemStorage implements StorageBackend {
  constructor(private rootPath: string) {}

  private resolve(p: string): string {
    return join(this.rootPath, p);
  }

  async read(filePath: string): Promise<string | null> {
    try {
      return await readFile(this.resolve(filePath), 'utf8');
    } catch {
      return null;
    }
  }

  async write(filePath: string, content: string): Promise<void> {
    const full = this.resolve(filePath);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content, 'utf8');
  }

  async writeIfAbsent(filePath: string, content: string): Promise<boolean> {
    const full = this.resolve(filePath);
    await mkdir(dirname(full), { recursive: true });
    try {
      const handle = await open(full, 'wx');
      try {
        await handle.writeFile(content, 'utf8');
      } finally {
        await handle.close();
      }
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
      throw error;
    }
  }

  async append(filePath: string, content: string): Promise<void> {
    const full = this.resolve(filePath);
    await mkdir(dirname(full), { recursive: true });
    await appendFile(full, content, 'utf8');
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await access(this.resolve(filePath));
      return true;
    } catch {
      return false;
    }
  }

  async delete(filePath: string): Promise<void> {
    try {
      await unlink(this.resolve(filePath));
    } catch {
      // ignore
    }
  }

  async list(dirPath: string): Promise<string[]> {
    try {
      const entries = await readdir(this.resolve(dirPath), { withFileTypes: true });
      return entries
        .filter((e) => e.isFile())
        .map((e) => e.name)
        .sort();
    } catch {
      return [];
    }
  }

  async listEntries(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> {
    try {
      const entries = await readdir(this.resolve(dirPath), { withFileTypes: true });
      return entries
        .map((e) => ({ name: e.name, isDirectory: e.isDirectory() }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return [];
    }
  }

  async isDirectory(filePath: string): Promise<boolean> {
    try {
      const s = await stat(this.resolve(filePath));
      return s.isDirectory();
    } catch {
      return false;
    }
  }

  async listRecursive(dirPath: string): Promise<string[]> {
    const results: string[] = [];
    await this.walk(dirPath, results);
    return results.sort();
  }

  private async walk(dirPath: string, results: string[]): Promise<void> {
    let entries;
    try {
      entries = await readdir(this.resolve(dirPath), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const childPath = `${dirPath}/${entry.name}`;
      if (entry.isDirectory()) {
        await this.walk(childPath, results);
      } else {
        results.push(childPath);
      }
    }
  }
}
