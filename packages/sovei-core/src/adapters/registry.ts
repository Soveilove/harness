/**
 * IDE Adapter Registry
 * Maps IDE-specific invocation formats to Sovei CLI commands.
 * Currently the CLI is the primary interface; adapters are for future IDE integration.
 */

export interface IDEAdapter {
  id: string;
  name: string;
  invocationFormat: (stage: string, feature: string) => string;
  reopenFormat: (feature: string, target: string, reason: string) => string;
}

const codexAdapter: IDEAdapter = {
  id: 'codex',
  name: 'Codex',
  invocationFormat: (stage, feature) => `sovei workflow ${stage} ${feature}`,
  reopenFormat: (feature, target, reason) =>
    `sovei workflow reopen ${feature} --target ${target} --reason "${reason}"`,
};

const claudeAdapter: IDEAdapter = {
  id: 'claude',
  name: 'Claude Code',
  invocationFormat: (stage, feature) => `sovei workflow ${stage} ${feature}`,
  reopenFormat: (feature, target, reason) =>
    `sovei workflow reopen ${feature} --target ${target} --reason "${reason}"`,
};

class AdapterRegistry {
  private adapters = new Map<string, IDEAdapter>();

  register(adapter: IDEAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): IDEAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error(`Unknown IDE adapter: ${id}`);
    return adapter;
  }

  list(): IDEAdapter[] {
    return [...this.adapters.values()];
  }
}

export const adapterRegistry = new AdapterRegistry();

// Register built-in adapters
adapterRegistry.register(codexAdapter);
adapterRegistry.register(claudeAdapter);
