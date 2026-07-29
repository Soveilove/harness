/**
 * Filesystem Storage Backend
 * Default implementation using Node.js fs/promises
 */
import type { StorageBackend } from './types.js';
export declare class FilesystemStorage implements StorageBackend {
    private rootPath;
    constructor(rootPath: string);
    private resolve;
    read(filePath: string): Promise<string | null>;
    write(filePath: string, content: string): Promise<void>;
    append(filePath: string, content: string): Promise<void>;
    exists(filePath: string): Promise<boolean>;
    delete(filePath: string): Promise<void>;
    list(dirPath: string): Promise<string[]>;
    listEntries(dirPath: string): Promise<{
        name: string;
        isDirectory: boolean;
    }[]>;
    isDirectory(filePath: string): Promise<boolean>;
    listRecursive(dirPath: string): Promise<string[]>;
    private walk;
}
//# sourceMappingURL=filesystem.d.ts.map