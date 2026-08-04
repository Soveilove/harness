/**
 * Filesystem Storage Backend
 * Default implementation using Node.js fs/promises
 */

import { readFile, writeFile, appendFile, mkdir, unlink, readdir, stat, access, open, rename } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
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
    // Atomic write: stage to a temp file then rename, so a crash mid-write
    // never leaves a truncated/corrupt file at the target path.
    const tmp = `${full}.tmp-${process.pid}-${Date.now()}`;
    try {
      await writeFile(tmp, content, 'utf8');
      await rename(tmp, full);
    } catch (error) {
      await unlink(tmp).catch(() => {});
      throw error;
    }
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

  /**
   * Run fn while holding an exclusive lock on `key`, preventing concurrent
   * read-modify-write races across processes. Uses a sibling `<key>.lock` file
   * acquired via O_EXCL (open 'wx'); stale locks older than 30s are reclaimed.
   */
  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const lockPath = this.resolve(`${key}.lock`);
    await mkdir(dirname(lockPath), { recursive: true });
    const STALE_MS = 30_000;
    const deadline = Date.now() + 10_000;
    let handle: FileHandle | undefined;
    while (true) {
      try {
        handle = await open(lockPath, 'wx');
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        try {
          const s = await stat(lockPath);
          if (Date.now() - s.mtimeMs > STALE_MS) await unlink(lockPath).catch(() => {});
        } catch {
          // ignore stat errors; retry
        }
        if (Date.now() > deadline) {
          throw new Error(
            `无法获取文件锁(超时):${key}。若确认无其他 sovei 进程在运行,可删除 ${lockPath}`,
          );
        }
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    try {
      return await fn();
    } finally {
      await handle.close();
      await unlink(lockPath).catch(() => {});
    }
  }
}
