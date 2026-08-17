/**
 * Filesystem Storage Backend
 * Default implementation using Node.js fs/promises
 */

import { readFile, writeFile, appendFile, mkdir, unlink, readdir, stat, access, open, rename, link } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join, relative, resolve as pathResolve, sep } from 'node:path';
import type { StorageBackend } from './types.js';

export interface FilesystemStorageOptions {
  lockTimeoutMs?: number;
  lockRetryMs?: number;
  openFile?: (filePath: string, flags: string) => Promise<FileHandle>;
}

export class FilesystemStorage implements StorageBackend {
  private readonly lockTimeoutMs: number;
  private readonly lockRetryMs: number;
  private readonly openFile: (filePath: string, flags: string) => Promise<FileHandle>;

  constructor(private rootPath: string, options: FilesystemStorageOptions = {}) {
    this.lockTimeoutMs = options.lockTimeoutMs ?? 10_000;
    this.lockRetryMs = options.lockRetryMs ?? 100;
    this.openFile = options.openFile ?? ((filePath, flags) => open(filePath, flags));
  }

  /**
   * Resolve a project-relative path against the storage root.
   *
   * Enforces path containment: every path passed to read/write/append/delete
   * must resolve strictly inside rootPath. `join` alone does not stop `..`
   * traversal, so we normalize with `path.resolve` and verify the result is
   * still under the root. This is the single choke point that closes the
   * directory-traversal surface for the whole engine (see redline
   * PATH_TRAVERSAL_CONTAINMENT).
   */
  private resolve(p: string): string {
    const root = pathResolve(this.rootPath);
    const full = pathResolve(root, p);
    // Containment: `full` must be strictly inside `root`. Prefix comparison
    // (rather than `relative`) is robust across Windows drive letters, where
    // an absolute path on another drive makes `relative` return an unrelated
    // absolute path that a `..`-prefix check would miss.
    const contained =
      full === root ||
      full.startsWith(root.endsWith(sep) ? root : root + sep);
    if (!contained) {
      throw new Error(`路径越界: "${p}" 解析后超出项目根目录 "${root}"`);
    }
    return full;
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
    const tmp = `${full}.tmp-${process.pid}-${randomUUID()}`;
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
    const tmp = `${full}.tmp-${process.pid}-${randomUUID()}`;
    let tmpHandle: FileHandle | undefined;
    try {
      tmpHandle = await this.openFile(tmp, 'wx');
      await tmpHandle.writeFile(content, 'utf8');
      await tmpHandle.close();
      tmpHandle = undefined;
      await link(tmp, full);
      await unlink(tmp).catch(() => {});
      return true;
    } catch (error) {
      await tmpHandle?.close().catch(() => {});
      await unlink(tmp).catch(() => {});
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
   * acquired via O_EXCL (open 'wx'). Locks are never reclaimed by age;
   * callers receive a timeout and must explicitly recover abandoned locks.
   */
  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const lockPath = this.resolve(`${key}.lock`);
    await mkdir(dirname(lockPath), { recursive: true });
    const deadline = Date.now() + this.lockTimeoutMs;
    const owner = randomUUID();
    let handle: FileHandle | undefined;
    while (true) {
      const tempLockPath = `${lockPath}.tmp-${process.pid}-${randomUUID()}`;
      let tempHandle: FileHandle | undefined;
      try {
        tempHandle = await this.openFile(tempLockPath, 'wx');
        await tempHandle.writeFile(owner, 'utf8');
        await tempHandle.close();
        tempHandle = undefined;
        await link(tempLockPath, lockPath);
        await unlink(tempLockPath).catch(() => {});
        handle = await this.openFile(lockPath, 'r+');
        break;
      } catch (error) {
        await tempHandle?.close().catch(() => {});
        await unlink(tempLockPath).catch(() => {});
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        // Never reclaim an old lock automatically: its owner may still be
        // running a long critical section. The timeout below gives the caller
        // an explicit recovery path without breaking mutual exclusion.

        if (Date.now() > deadline) {
          throw new Error(
            `无法获取文件锁(超时):${key}。若确认无其他 sovei 进程在运行,可删除 ${lockPath}`,
          );
        }
        await new Promise((r) => setTimeout(r, this.lockRetryMs));
      }
    }
    try {
      return await fn();
    } finally {
      try {
        await handle.close();
      } finally {
        const currentOwner = await readFile(lockPath, 'utf8').catch(() => '');
        if (currentOwner === owner) await unlink(lockPath).catch(() => {});
      }
    }
  }
}
