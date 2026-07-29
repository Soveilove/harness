/**
 * In-Memory Storage Backend (for testing)
 */
export class MemoryStorage {
    files = new Map();
    async read(filePath) {
        return this.files.get(filePath) ?? null;
    }
    async write(filePath, content) {
        this.files.set(filePath, content);
    }
    async append(filePath, content) {
        const existing = this.files.get(filePath) ?? '';
        this.files.set(filePath, existing + content);
    }
    async exists(filePath) {
        return this.files.has(filePath);
    }
    async delete(filePath) {
        this.files.delete(filePath);
    }
    async list(dirPath) {
        const prefix = dirPath.endsWith('/') ? dirPath : dirPath + '/';
        const files = [...this.files.keys()]
            .filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes('/'));
        return files.map((k) => k.slice(prefix.length)).sort();
    }
    async listEntries(dirPath) {
        const prefix = dirPath.endsWith('/') ? dirPath : dirPath + '/';
        const seen = new Set();
        const results = [];
        for (const key of this.files.keys()) {
            if (!key.startsWith(prefix))
                continue;
            const rest = key.slice(prefix.length);
            if (!rest)
                continue;
            const firstSeg = rest.split('/')[0];
            if (seen.has(firstSeg))
                continue;
            seen.add(firstSeg);
            const isDir = rest.includes('/');
            results.push({ name: firstSeg, isDirectory: isDir });
        }
        return results.sort((a, b) => a.name.localeCompare(b.name));
    }
    async isDirectory(filePath) {
        // In memory storage, a path is a directory if it's a prefix of other paths
        // but not a file itself
        if (this.files.has(filePath))
            return false;
        const prefix = filePath.endsWith('/') ? filePath : filePath + '/';
        return [...this.files.keys()].some((k) => k.startsWith(prefix));
    }
    async listRecursive(dirPath) {
        const prefix = dirPath.endsWith('/') ? dirPath : dirPath + '/';
        return [...this.files.keys()]
            .filter((k) => k.startsWith(prefix))
            .sort();
    }
}
//# sourceMappingURL=memory.js.map