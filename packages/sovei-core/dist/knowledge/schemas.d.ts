/**
 * Knowledge Schemas
 * Zod type definitions for all knowledge types.
 * Replaces free-form markdown with typed, validated JSON.
 */
import { z } from 'zod';
export declare const KnowledgeType: z.ZodEnum<["pitfall", "rule", "decision", "code-map", "architecture", "preference", "constitution"]>;
export type KnowledgeType = z.infer<typeof KnowledgeType>;
export declare const Lifecycle: z.ZodEnum<["candidate", "pending", "stable", "deprecated"]>;
export type Lifecycle = z.infer<typeof Lifecycle>;
export declare const Evidence: z.ZodObject<{
    feature: z.ZodString;
    date: z.ZodString;
    description: z.ZodString;
    verified: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    feature: string;
    date: string;
    description: string;
    verified: boolean;
}, {
    feature: string;
    date: string;
    description: string;
    verified?: boolean | undefined;
}>;
export type Evidence = z.infer<typeof Evidence>;
export declare const KnowledgeEntry: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["pitfall", "rule", "decision", "code-map", "architecture", "preference", "constitution"]>;
    title: z.ZodString;
    content: z.ZodString;
    lifecycle: z.ZodEnum<["candidate", "pending", "stable", "deprecated"]>;
    evidence: z.ZodArray<z.ZodObject<{
        feature: z.ZodString;
        date: z.ZodString;
        description: z.ZodString;
        verified: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        feature: string;
        date: string;
        description: string;
        verified: boolean;
    }, {
        feature: string;
        date: string;
        description: string;
        verified?: boolean | undefined;
    }>, "many">;
    tags: z.ZodArray<z.ZodString, "many">;
    scope: z.ZodDefault<z.ZodEnum<["project", "global"]>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    promotedAt: z.ZodNullable<z.ZodString>;
    deprecatedReason: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    updatedAt: string;
    type: "pitfall" | "rule" | "decision" | "code-map" | "architecture" | "preference" | "constitution";
    id: string;
    title: string;
    content: string;
    lifecycle: "deprecated" | "candidate" | "pending" | "stable";
    evidence: {
        feature: string;
        date: string;
        description: string;
        verified: boolean;
    }[];
    tags: string[];
    scope: "project" | "global";
    createdAt: string;
    promotedAt: string | null;
    deprecatedReason: string | null;
}, {
    updatedAt: string;
    type: "pitfall" | "rule" | "decision" | "code-map" | "architecture" | "preference" | "constitution";
    id: string;
    title: string;
    content: string;
    lifecycle: "deprecated" | "candidate" | "pending" | "stable";
    evidence: {
        feature: string;
        date: string;
        description: string;
        verified?: boolean | undefined;
    }[];
    tags: string[];
    createdAt: string;
    promotedAt: string | null;
    deprecatedReason: string | null;
    scope?: "project" | "global" | undefined;
}>;
export type KnowledgeEntry = z.infer<typeof KnowledgeEntry>;
export declare const LIFECYCLE_TRANSITIONS: Record<Lifecycle, Lifecycle[]>;
/**
 * Validate a lifecycle transition.
 * Returns true if the transition is allowed.
 */
export declare function canTransition(from: Lifecycle, to: Lifecycle): boolean;
/**
 * Minimum evidence count required for each lifecycle stage.
 */
export declare const MIN_EVIDENCE_COUNT: Record<Lifecycle, number>;
//# sourceMappingURL=schemas.d.ts.map