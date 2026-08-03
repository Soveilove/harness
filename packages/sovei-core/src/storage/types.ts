/**
 * Storage Backend Interface
 * Pluggable storage abstraction (NestJS provider pattern).
 * Default: filesystem. Could be replaced with git, S3, etc.
 */

export interface StorageBackend {
  /** Read file content as string. Returns null if not exists. */
  read(filePath: string): Promise<string | null>;

  /** Write string content to file (creates dirs). */
  write(filePath: string, content: string): Promise<void>;

  /** Atomically create a file only when it does not exist. */
  writeIfAbsent(filePath: string, content: string): Promise<boolean>;

  /** Append string to file (creates if not exists). */
  append(filePath: string, content: string): Promise<void>;

  /** Check if file exists. */
  exists(filePath: string): Promise<boolean>;

  /** Delete a file. */
  delete(filePath: string): Promise<void>;

  /** List files in a directory. */
  list(dirPath: string): Promise<string[]>;

  /** List files recursively. */
  listRecursive(dirPath: string): Promise<string[]>;

  /** Check if path is a directory. */
  isDirectory(filePath: string): Promise<boolean>;

  /** List all entries (files and dirs) in a directory. */
  listEntries(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]>;
}
