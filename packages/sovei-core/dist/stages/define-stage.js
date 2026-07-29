/**
 * Stage Plugin System
 * Inspired by Vite plugins (lifecycle hooks) + Vue defineComponent (typed factory)
 *
 * Each stage is a self-contained plugin with:
 * - Typed input/output contracts (Zod)
 * - Lifecycle hooks: preExecute → execute → postExecute → cleanup
 * - Artifact requirements and production declarations
 */
/**
 * Factory function for defining stages.
 * Like Vue's defineComponent() - provides type inference and validation.
 */
export function defineStage(def) {
    // Validate at definition time
    if (!def.name)
        throw new Error('Stage must have a name');
    if (!def.description)
        throw new Error('Stage must have a description');
    if (!def.contract)
        throw new Error('Stage must have a contract');
    if (typeof def.execute !== 'function')
        throw new Error('Stage must have an execute function');
    return def;
}
//# sourceMappingURL=define-stage.js.map