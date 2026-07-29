/**
 * Project Scanner
 *
 * For the "existing project onboarding" scenario.
 * Scans a codebase to bootstrap initial knowledge.
 */
import type { StorageBackend } from '../storage/types.js';
import { type DetectedStack } from './tech-stack.js';
import type { KnowledgeEntry } from '../knowledge/schemas.js';
export interface ScanResult {
    techStack: DetectedStack;
    projectRoot: string;
    packageJson: any | null;
    entryPoints: string[];
    directoryMap: DirectoryNode[];
    detectedPatterns: string[];
    generatedKnowledge: Omit<KnowledgeEntry, 'id'>[];
}
export interface DirectoryNode {
    path: string;
    type: 'dir' | 'file';
    depth: number;
    note?: string;
}
export declare class ProjectScanner {
    private storage;
    constructor(storage: StorageBackend);
    scan(maxDepth?: number): Promise<ScanResult>;
    private scanDirectory;
    /** Best-effort JSON parse that strips comments and trailing commas */
    private looseParse;
    private isDirectory;
    private findEntryPoints;
    private detectPatterns;
}
//# sourceMappingURL=scanner.d.ts.map