/**
 * Stage Registry
 * Central registry for all stage plugins.
 * Stages register themselves at import time.
 */
import type { StageDefinition } from './define-stage.js';
declare class StageRegistry {
    private stages;
    register(def: StageDefinition): void;
    get(name: string): StageDefinition;
    has(name: string): boolean;
    list(): string[];
    listAll(): StageDefinition[];
}
export declare const stageRegistry: StageRegistry;
export {};
//# sourceMappingURL=registry.d.ts.map