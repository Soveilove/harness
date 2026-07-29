/**
 * In-Memory Storage Backend (for testing)
 */
import type { StorageBackend } from './types.js';
export declare class MemoryStorage implements StorageBackend {
    private files;
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
}
//# sourceMappingURL=memory.d.ts.map