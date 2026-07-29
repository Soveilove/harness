/**
 * Filesystem Storage Backend
 * Default implementation using Node.js fs/promises
 */
import { readFile, writeFile, appendFile, mkdir, unlink, readdir, stat, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
export class FilesystemStorage {
    rootPath;
    constructor(rootPath) {
        this.rootPath = rootPath;
    }
    resolve(p) {
        return join(this.rootPath, p);
    }
    async read(filePath) {
        try {
            return await readFile(this.resolve(filePath), 'utf8');
        }
        catch {
            return null;
        }
    }
    async write(filePath, content) {
        const full = this.resolve(filePath);
        await mkdir(dirname(full), { recursive: true });
        await writeFile(full, content, 'utf8');
    }
    async append(filePath, content) {
        const full = this.resolve(filePath);
        await mkdir(dirname(full), { recursive: true });
        await appendFile(full, content, 'utf8');
    }
    async exists(filePath) {
        try {
            await access(this.resolve(filePath));
            return true;
        }
        catch {
            return false;
        }
    }
    async delete(filePath) {
        try {
            await unlink(this.resolve(filePath));
        }
        catch {
            // ignore
        }
    }
    async list(dirPath) {
        try {
            const entries = await readdir(this.resolve(dirPath), { withFileTypes: true });
            return entries
                .filter((e) => e.isFile())
                .map((e) => e.name)
                .sort();
        }
        catch {
            return [];
        }
    }
    async listEntries(dirPath) {
        try {
            const entries = await readdir(this.resolve(dirPath), { withFileTypes: true });
            return entries
                .map((e) => ({ name: e.name, isDirectory: e.isDirectory() }))
                .sort((a, b) => a.name.localeCompare(b.name));
        }
        catch {
            return [];
        }
    }
    async isDirectory(filePath) {
        try {
            const s = await stat(this.resolve(filePath));
            return s.isDirectory();
        }
        catch {
            return false;
        }
    }
    async listRecursive(dirPath) {
        const results = [];
        await this.walk(dirPath, results);
        return results.sort();
    }
    async walk(dirPath, results) {
        let entries;
        try {
            entries = await readdir(this.resolve(dirPath), { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const childPath = `${dirPath}/${entry.name}`;
            if (entry.isDirectory()) {
                await this.walk(childPath, results);
            }
            else {
                results.push(childPath);
            }
        }
    }
}
//# sourceMappingURL=filesystem.js.map