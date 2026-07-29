/**
 * Artifact Repository
 * Manages Feature artifacts (decision-log.md, spec.md, etc.)
 * Provides read/write/list operations with validation.
 */
export class ArtifactRepository {
    storage;
    featurePath;
    constructor(storage, featurePath) {
        this.storage = storage;
        this.featurePath = featurePath;
    }
    /** Read an artifact by name */
    async read(name) {
        return this.storage.read(`${this.featurePath}/${name}`);
    }
    /** Write an artifact */
    async write(name, content) {
        await this.storage.write(`${this.featurePath}/${name}`, content);
    }
    /** Check if an artifact exists */
    async exists(name) {
        return this.storage.exists(`${this.featurePath}/${name}`);
    }
    /** List all artifacts in the feature directory */
    async list() {
        return this.storage.list(this.featurePath);
    }
    /** Delete an artifact */
    async delete(name) {
        await this.storage.delete(`${this.featurePath}/${name}`);
    }
    /** Check that all required artifacts exist */
    async checkRequired(required) {
        const missing = [];
        for (const name of required) {
            if (!(await this.exists(name))) {
                missing.push(name);
            }
        }
        return { missing };
    }
}
//# sourceMappingURL=repository.js.map