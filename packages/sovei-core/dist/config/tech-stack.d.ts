/**
 * Tech Stack Detection & Knowledge Seeding
 *
 * For new projects: generates seed knowledge based on declared tech stack.
 * For existing projects: auto-detects tech stack from manifest files.
 */
import type { KnowledgeEntry } from '../knowledge/schemas.js';
export interface DetectedStack {
    framework?: string;
    language?: string;
    state?: string;
    build?: string;
    packageManager?: string;
    testRunner?: string;
}
/** Seed knowledge entries generated per tech stack */
export interface KnowledgeSeed {
    type: string;
    title: string;
    content: string;
    tags: string[];
}
/**
 * Detect tech stack from an existing project's manifest files.
 * Reads package.json, tsconfig.json, etc.
 */
export declare function detectTechStack(packageJson: any, tsconfig: any): DetectedStack;
/**
 * Generate seed knowledge entries based on detected tech stack.
 * All seeds start as 'candidate' - they're common patterns, not verified rules.
 */
export declare function generateSeeds(stack: DetectedStack): KnowledgeSeed[];
/**
 * Convert seeds to full KnowledgeEntry objects.
 */
export declare function seedsToEntries(seeds: KnowledgeSeed[]): Omit<KnowledgeEntry, 'id'>[];
//# sourceMappingURL=tech-stack.d.ts.map