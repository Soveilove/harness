/**
 * IDE Adapter Registry
 * Maps IDE-specific invocation formats to Sovei CLI commands.
 * Currently the CLI is the primary interface; adapters are for future IDE integration.
 */
const codexAdapter = {
    id: 'codex',
    name: 'Codex',
    invocationFormat: (stage, feature) => `sovei workflow ${stage} ${feature}`,
    reopenFormat: (feature, target, reason) => `sovei workflow reopen ${feature} --target ${target} --reason "${reason}"`,
};
const claudeAdapter = {
    id: 'claude',
    name: 'Claude Code',
    invocationFormat: (stage, feature) => `sovei workflow ${stage} ${feature}`,
    reopenFormat: (feature, target, reason) => `sovei workflow reopen ${feature} --target ${target} --reason "${reason}"`,
};
class AdapterRegistry {
    adapters = new Map();
    register(adapter) {
        this.adapters.set(adapter.id, adapter);
    }
    get(id) {
        const adapter = this.adapters.get(id);
        if (!adapter)
            throw new Error(`Unknown IDE adapter: ${id}`);
        return adapter;
    }
    list() {
        return [...this.adapters.values()];
    }
}
export const adapterRegistry = new AdapterRegistry();
// Register built-in adapters
adapterRegistry.register(codexAdapter);
adapterRegistry.register(claudeAdapter);
//# sourceMappingURL=registry.js.map