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

/**
 * A binding to render into an agent context file. `stage` is the Sovei workflow
 * stage, `skillId` the bound skill (native or external), and `status` whether it
 * is actually enabled in the runtime.
 */
export interface SkillBindingRender {
  stage: string;
  skillId: string;
  status: string;
}

export interface IDEAdapter {
  id: string;
  name: string;
  invocationFormat: (stage: string, feature: string) => string;
  reopenFormat: (feature: string, target: string, reason: string) => string;
  capabilities: AdapterCapabilities;
  /**
   * Agent context file this adapter reads at runtime (AGENTS.md, CLAUDE.md,
   * .cursorrules, ...). `sync` writes skill directives into these files.
   */
  contextFile: string;
  /**
   * Render the connected skills into the agent context file. OpenSpec/SpecKit
   * style: turn a single skill-map into per-agent directives so the agent knows
   * which skill to invoke for which stage.
   */
  renderSkillDirectives: (bindings: SkillBindingRender[]) => string;
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
  contextFile: 'AGENTS.md',
  renderSkillDirectives: (bindings) => renderCliSkillDirectives(bindings),
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
  contextFile: 'CLAUDE.md',
  renderSkillDirectives: (bindings) => renderClaudeSkillDirectives(bindings),
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
  contextFile: 'AGENTS.md',
  renderSkillDirectives: (bindings) => renderCliSkillDirectives(bindings),
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
  contextFile: '.cursorrules',
  renderSkillDirectives: (bindings) => renderCliSkillDirectives(bindings),
};

const geminiAdapter: IDEAdapter = {
  id: 'gemini',
  name: 'Gemini CLI',
  invocationFormat: (stage, feature) => `sovei workflow ${stage} ${feature}`,
  reopenFormat: (feature, target, reason) =>
    `sovei workflow reopen ${feature} --target ${target} --reason "${reason}"`,
  capabilities: {
    nativeCodeSearch: true,
    contextDelivery: 'file',
    toolExecution: true,
    mcp: true,
    cli: true,
    notes: 'Gemini CLI 读取 GEMINI.md；支持工具执行与 MCP；上下文通过文件交付。',
  },
  contextFile: 'GEMINI.md',
  renderSkillDirectives: (bindings) => renderCliSkillDirectives(bindings),
};

const aiderAdapter: IDEAdapter = {
  id: 'aider',
  name: 'Aider',
  invocationFormat: (stage, feature) => `sovei workflow ${stage} ${feature}`,
  reopenFormat: (feature, target, reason) =>
    `sovei workflow reopen ${feature} --target ${target} --reason "${reason}"`,
  capabilities: {
    nativeCodeSearch: true,
    contextDelivery: 'file',
    toolExecution: false,
    mcp: false,
    cli: true,
    notes: 'Aider 读取 .aiderrules；以 CLI 驱动；无 MCP；上下文通过文件交付。',
  },
  contextFile: '.aiderrules',
  renderSkillDirectives: (bindings) => renderCliSkillDirectives(bindings),
};

const windsurfAdapter: IDEAdapter = {
  id: 'windsurf',
  name: 'Windsurf',
  invocationFormat: (stage, feature) => `sovei workflow ${stage} ${feature}`,
  reopenFormat: (feature, target, reason) =>
    `sovei workflow reopen ${feature} --target ${target} --reason "${reason}"`,
  capabilities: {
    nativeCodeSearch: true,
    contextDelivery: 'file',
    toolExecution: true,
    mcp: true,
    cli: true,
    notes: 'Windsurf 读取 .windsurfrules；支持工具执行与 MCP；上下文通过文件交付。',
  },
  contextFile: '.windsurfrules',
  renderSkillDirectives: (bindings) => renderCliSkillDirectives(bindings),
};

/**
 * Shared renderer for CLI-first agents (Codex, CodeBuddy, Trae, Cursor):
 * emit a compact "stage → skill" directive block the agent can follow at runtime.
 */
function renderCliSkillDirectives(bindings: SkillBindingRender[]): string {
  const lines = ['## Connected Skills (sovei)', ''];
  if (!bindings.length) {
    lines.push('No external skills connected. Sovei uses its native stages.', '');
    return lines.join('\n');
  }
  lines.push('For each workflow stage, invoke the bound skill via the Sovei CLI:');
  lines.push('');
  for (const b of bindings) {
    const marker = b.status === 'enabled' ? 'ENABLED' : 'candidate';
    lines.push(`- ${b.stage}: ${b.skillId} [${marker}]`);
    lines.push(`  \`sovei workflow ${b.stage} <feature>\``);
  }
  lines.push('');
  lines.push('Skills stay read-only: they propose artifacts, Sovei validates and completes stages.', '');
  return lines.join('\n');
}

/**
 * Claude Code-style renderer: emits slash-command flavoured directives so the
 * agent can drive each stage with the bound skill.
 */
function renderClaudeSkillDirectives(bindings: SkillBindingRender[]): string {
  const lines = ['## Connected Skills (sovei)', ''];
  if (!bindings.length) {
    lines.push('No external skills connected. Sovei uses its native stages.', '');
    return lines.join('\n');
  }
  lines.push('Drive each workflow stage with the bound skill:');
  lines.push('');
  for (const b of bindings) {
    const marker = b.status === 'enabled' ? 'ENABLED' : 'candidate';
    lines.push(`- ${b.stage}: ${b.skillId} [${marker}]`);
    lines.push(`  \`sovei workflow ${b.stage} <feature>\` — runs the ${b.stage} skill, returns candidate artifacts for Sovei validation.`);
  }
  lines.push('');
  lines.push('Skills stay read-only: they propose artifacts, Sovei validates and completes stages.', '');
  return lines.join('\n');
}

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
adapterRegistry.register(geminiAdapter);
adapterRegistry.register(aiderAdapter);
adapterRegistry.register(windsurfAdapter);
