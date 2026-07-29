/**
 * Stage Registry
 * Central registry for all stage plugins.
 * Stages register themselves at import time.
 */
class StageRegistry {
    stages = new Map();
    register(def) {
        if (this.stages.has(def.name)) {
            throw new Error(`Stage already registered: ${def.name}`);
        }
        this.stages.set(def.name, def);
    }
    get(name) {
        const stage = this.stages.get(name);
        if (!stage)
            throw new Error(`Unknown stage: ${name}`);
        return stage;
    }
    has(name) {
        return this.stages.has(name);
    }
    list() {
        return [...this.stages.keys()];
    }
    listAll() {
        return [...this.stages.values()];
    }
}
export const stageRegistry = new StageRegistry();
//# sourceMappingURL=registry.js.map