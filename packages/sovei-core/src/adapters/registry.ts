/**
 * IDE Adapter Registry
 * Maps IDE-specific invocation formats to Sovei CLI commands.
 * Each adapter declares its host agent capabilities so Sovei can
 * build appropriate context without assuming all IDEs are equivalent.
 */

export interface AdapterCapabilities {
  nativeCodeSearch: boolean;
  contextDelivery: 'inline' | 'file' | 'mcp-resource';
  toolExecution: boolean;
  mcp: boolean;
  cli: boolean;
  notes: string;
}

export interface IDEAdapter {
  id: string;
  name: string;
  invocationFormat: (stage: string, feature: string) => string;
  reopenFormat: (feature: string, target: string, reason: string) => string;
  capabilities: AdapterCapabilities;
}

const codexAdapter: IDEAdapter = {
  id: 'codex',
  name: 'Codex',
  invocationFormat: (stage, feature) => `sovei workflow ${stage} ${feature}`,
  reopenFormat: (feature, target, reason) =>
    `sovei workflow reopen ${feature} --target ${target} --reason "${reason}"`,
  capabilities: {
    nativeCodeSearch: true,
    contextDelivery: 'inline',
    toolExecution: true,
    mcp: true,
    cli: true,
    notes: 'Codex 支持完整工具执行和 MCP；上下文通过 inline 注入。',
  },
};

const claudeAdapter: IDEAdapter = {
  id: 'claude',
  name: 'Claude Code',
  invocationFormat: (stage, feature) => `sovei workflow ${stage} ${feature}`,
  reopenFormat: (feature, target, reason) =>
    `sovei workflow reopen ${feature} --target ${target} --reason "${reason}"`,
  capabilities: {
    nativeCodeSearch: true,
    contextDelivery: 'inline',
    toolExecution: true,
    mcp: true,
    cli: true,
    notes: 'Claude Code 支持完整工具执行和 MCP；上下文通过 inline 注入。',
  },
};

const codebuddyAdapter: IDEAdapter = {
  id: 'codebuddy',
  name: 'CodeBuddy',
  invocationFormat: (stage, feature) => `SOVEI: ${stage} ${feature}`,
  reopenFormat: (feature, target, reason) =>
    `SOVEI: reopen ${feature} --target ${target} --reason "${reason}"`,
  capabilities: {
    nativeCodeSearch: true,
    contextDelivery: 'file',
    toolExecution: true,
    mcp: false,
    cli: true,
    notes: 'CodeBuddy 使用 SOVEI: 前缀调用；无 MCP 支持；上下文通过文件交付。',
  },
};

const traeAdapter: IDEAdapter = {
  id: 'trae',
  name: 'Trae',
  invocationFormat: (stage, feature) => `sovei workflow ${stage} ${feature}`,
  reopenFormat: (feature, target, reason) =>
    `sovei workflow reopen ${feature} --target ${target} --reason "${reason}"`,
  capabilities: {
    nativeCodeSearch: true,
    contextDelivery: 'file',
    toolExecution: false,
    mcp: false,
    cli: true,
    notes: 'Trae 使用自然语言调用 Sovei CLI；无 MCP；上下文通过文件交付。',
  },
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
adapterRegistry.register(codebuddyAdapter);
adapterRegistry.register(traeAdapter);
