/**
 * Artifact Repository
 * Manages Feature artifacts (decision-log.md, spec.md, etc.)
 * Provides read/write/list operations with validation.
 */
import type { StorageBackend } from '../storage/types.js';
export declare class ArtifactRepository {
    private storage;
    private featurePath;
    constructor(storage: StorageBackend, featurePath: string);
    /** Read an artifact by name */
    read(name: string): Promise<string | null>;
    /** Write an artifact */
    write(name: string, content: string): Promise<void>;
    /** Check if an artifact exists */
    exists(name: string): Promise<boolean>;
    /** List all artifacts in the feature directory */
    list(): Promise<string[]>;
    /** Delete an artifact */
    delete(name: string): Promise<void>;
    /** Check that all required artifacts exist */
    checkRequired(required: string[]): Promise<{
        missing: string[];
    }>;
}
//# sourceMappingURL=repository.d.ts.map