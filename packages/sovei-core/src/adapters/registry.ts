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
  /**
   * 快速通道指令文本——嵌入 contextFile，告诉 IDE Agent 每次代码变更必须走 sovei quick。
   * installer 会将此文本追加到 contextFile 中。
   */
  quickChannelDirective: string;
  /**
   * 可选 slash command 文件——仅支持 slash command 机制的 IDE（如 Claude Code）。
   * installer 会创建 dir/filename 文件，内容为 content。
   */
  slashCommand?: {
    dir: string;
    filename: string;
    content: string;
  };
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
  quickChannelDirective: [
    '',
    '### Quick Channel (Codex)',
    '',
    '**每次代码变更必须走快速通道**——即使是小的 post-completion 修复也要走：',
    '',
    '1. 编辑前运行 `sovei quick "<变更描述>" --paths <文件>`（排除路径自动从 .gitignore 读取）',
    '2. 完成编辑',
    '3. 运行测试',
    '4. 快速通道记录 usage 并验证 git diff 范围',
    '',
  ].join('\n'),
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
  quickChannelDirective: [
    '',
    '### Quick Channel (Claude Code)',
    '',
    '**每次代码变更必须走快速通道**——使用 `/sovei-quick` slash command 或直接运行：',
    '',
    '1. 编辑前运行 `sovei quick "<变更描述>" --paths <文件>`（排除路径自动从 .gitignore 读取）',
    '2. 完成编辑',
    '3. 运行测试',
    '4. 快速通道记录 usage 并验证 git diff 范围',
    '',
  ].join('\n'),
  slashCommand: {
    dir: '.claude/commands',
    filename: 'sovei-quick.md',
    content: [
      '---',
      'description: 走 Sovei 快速通道验证代码变更',
      '---',
      '',
      '运行以下命令走快速通道：',
      '',
      '```bash',
      'sovei quick "$ARGUMENTS" --paths <变更文件>',
      '```',
      '',
      '> 排除路径自动从 .gitignore 读取，无需手动指定 --exclude。',
      '',
      '然后：',
      '1. 根据快速通道的 riskLevel 决定是否需要升级到完整工作流',
      '2. 完成代码编辑',
      '3. 运行测试验证',
      '4. 再次运行快速通道验证 git diff 范围',
      '',
    ].join('\n'),
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
  contextFile: 'AGENTS.md',
  renderSkillDirectives: (bindings) => renderCliSkillDirectives(bindings),
  quickChannelDirective: [
    '',
    '### Quick Channel (CodeBuddy)',
    '',
    '**每次代码变更必须走快速通道**——CodeBuddy Agent 必须在编辑代码前先执行：',
    '',
    '1. 使用 execute_command 工具运行 `sovei quick "<变更描述>" --paths <文件> --exclude dist/**`',
    '2. 检查返回的 riskLevel——若 escalated 需人工确认',
    '3. 完成代码编辑',
    '4. 运行测试验证',
    '5. 快速通道记录 usage 并验证 git diff 范围',
    '',
  ].join('\n'),
  slashCommand: {
    dir: '.codebuddy/commands',
    filename: 'sovei-quick.md',
    content: [
      '# Sovei 快速通道',
      '',
      '在编辑代码前，必须先走快速通道：',
      '',
      '使用 execute_command 工具运行：',
      '```bash',
      'sovei quick "$ARGUMENTS" --paths <变更文件>',
      '```',
      '',
      '> 排除路径自动从 .gitignore 读取，无需手动指定 --exclude。',
      '',
      '检查返回的 riskLevel：',
      '- fast-track: 可直接编辑',
      '- escalated: 需人工确认范围',
      '',
      '编辑完成后运行测试，快速通道会记录 usage 并验证 git diff 范围。',
    ].join('\n'),
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
  contextFile: '.cursorrules',
  renderSkillDirectives: (bindings) => renderCliSkillDirectives(bindings),
  quickChannelDirective: [
    '',
    '### Quick Channel (Trae)',
    '',
    '**每次代码变更必须走快速通道**——在编辑代码前先运行：',
    '',
    '1. `sovei quick "<变更描述>" --paths <文件> --exclude dist/**`',
    '2. 完成编辑',
    '3. 运行测试',
    '4. 快速通道记录 usage 并验证 git diff 范围',
    '',
  ].join('\n'),
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
  quickChannelDirective: '',
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
  quickChannelDirective: '',
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
  quickChannelDirective: '',
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
