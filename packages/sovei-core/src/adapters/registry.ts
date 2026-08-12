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
   * 快速通道指令文本——嵌入 contextFile，告诉 IDE Agent 临时代码变更走 sovei quick。
   * 快速通道与完整工作流（sovei workflow）是二选一关系，不叠加：
   * 低风险局部改动走 quick；已注册 Feature 走 13 阶段流程，代码在 implement 阶段完成。
   * installer 会将此文本追加到 contextFile 中。
   */
  quickChannelDirective: string;
  /**
   * 可选 slash command 文件——仅支持 slash command 机制的 IDE（如 Claude Code）。
   * installer 会创建 dir/filename 文件，内容为 content。
   * 向后兼容字段；新代码应使用 slashCommands（数组）。
   */
  slashCommand?: {
    dir: string;
    filename: string;
    content: string;
  };
  /**
   * 可选 slash command 文件列表（P0-B）——为 Claude Code / CodeBuddy 生成 13 阶段
   * slash command，让 agent 用 /load、/spec、/implement 等原生方式触发工作流节点。
   * installer 会为每个条目创建 dir/filename 文件。
   */
  slashCommands?: Array<{
    dir: string;
    filename: string;
    content: string;
  }>;
  /**
   * 可选技能包——为不支持 slash command 的 IDE（如 Codex 桌面版）生成技能文件，
   * 让 agent 通过技能 description 主动唤起工作流。installer 会将文件写入 dir/ 下。
   */
  skillPackage?: {
    dir: string;
    skills: Array<{
      filename: string;
      content: string;
    }>;
  };
}

/**
 * 13 个工作流阶段定义——用于生成 slash command 和节点说明。
 */
const WORKFLOW_STAGES: Array<{ name: string; desc: string }> = [
  { name: 'explore', desc: '需求探索 + 业务关联 + 拆分提议（入口）' },
  { name: 'load', desc: '加载/恢复 Feature 状态' },
  { name: 'grill', desc: '决策拷问（事实/推断/范围）' },
  { name: 'wayfind', desc: '依赖分析与路径选择' },
  { name: 'spec', desc: '规格定义 + reconciliation' },
  { name: 'scope', desc: '范围确定 + 拆分修正' },
  { name: 'plan', desc: '实现计划' },
  { name: 'tasks', desc: '任务拆分' },
  { name: 'implement', desc: '代码实现' },
  { name: 'converge', desc: '收敛检查' },
  { name: 'verify', desc: '验证' },
  { name: 'learn', desc: '知识提取' },
  { name: 'sync', desc: '同步' },
];

/**
 * 为 Claude Code 生成 13 阶段 slash command 文件列表。
 * 每个 stage 一个 .md 文件，agent 可用 /sovei-explore、/sovei-load、/sovei-spec 等触发。
 */
function generateClaudeStageSlashCommands(dir: string): Array<{
  dir: string;
  filename: string;
  content: string;
}> {
  return WORKFLOW_STAGES.map((stage) => ({
    dir,
    filename: `sovei-${stage.name}.md`,
    content: [
      '---',
      `description: Sovei ${stage.name} 阶段 — ${stage.desc}`,
      '---',
      '',
      `# Sovei ${stage.name}`,
      '',
      `> ${stage.desc}`,
      '',
      '## 参数',
      '',
      stage.name === 'explore'
        ? [
            '- `$ARGUMENTS`：Feature ID（如 001-my-feature）',
            '- 可选 `--prd <path>`：PRD 文件路径（入口模式，复制到 specs/<feature>/prd.md）',
            '- 可选 `--brief <text>`：内联需求描述（无 PRD 文件时使用）',
            '- 可选 `--complete`：校验产物并完成阶段',
          ].join('\n')
        : [
            '- `$ARGUMENTS`：Feature ID（如 001-my-feature）',
            '- 可选 `--sub-change <id>`：对子变更执行此阶段',
            '- 可选 `--task <id>`：implement 阶段指定任务',
          ].join('\n'),
      '',
      '## 执行步骤',
      '',
      stage.name === 'explore'
        ? [
            '1. **入口模式**（首次进入 Feature，带 PRD 或 brief）：',
            '   ```bash',
            '   sovei workflow explore $ARGUMENTS --prd ./docs/prd.md',
            '   # 或内联需求：',
            '   sovei workflow explore $ARGUMENTS --brief "需求描述"',
            '   ```',
            '   CLI 会自动 bootstrap Feature + 复制 PRD + 注入提示契约。',
            '2. **阅读提示契约**：按 explore 提示契约读 PRD + business-coverage.md，产出 exploration.md + sub-change-map.md。',
            '3. **完成阶段**：',
            '   ```bash',
            '   sovei workflow explore $ARGUMENTS --complete',
            '   ```',
            '4. **拆分执行**（如 sub-change-map.md 建议拆分）：',
            '   ```bash',
            '   sovei feature split $ARGUMENTS --json  # 获取提议契约',
            '   sovei feature split $ARGUMENTS          # 执行拆分',
            '   ```',
          ].join('\n')
        : [
            '1. **准备阶段**（生成提示契约 + 创建缺失模板，不推进状态）：',
            '   ```bash',
            `   sovei workflow ${stage.name} $ARGUMENTS`,
            '   ```',
            '2. **阅读提示契约**：CLI 输出的 `── 提示契约 ──` 段包含阶段输入/操作/输出/停止条件。',
            '3. **获取上下文包**（可选，获取红线/规则/知识等治理上下文）：',
            '   ```bash',
            `   sovei context build --stage ${stage.name} $ARGUMENTS`,
            '   ```',
            '4. **执行实际工作**：按提示契约填写产物文件（如 spec.md、scope.md 等）。',
            '5. **完成阶段**（校验产物 + 推进状态）：',
            '   ```bash',
            `   sovei workflow ${stage.name} $ARGUMENTS --complete`,
            '   ```',
          ].join('\n'),
      '',
      '## 说明',
      '',
      '- 每次只执行一个阶段，`--complete` 后才能推进到下一阶段。',
      '- 产物文件位于 `specs/<feature>/` 目录下。',
      stage.name === 'explore'
        ? '- explore 是工作流入口阶段，读 PRD + 业务覆盖面，产出需求理解 + 拆分提议。'
        : '',
      stage.name === 'scope'
        ? '- **拆分修正**：完成 scope 后，基于代码影响面修正 explore 的拆分提议。运行 `sovei feature split <feature> --json` 获取提议契约。'
        : '',
      stage.name === 'implement'
        ? '- implement 阶段需要 `--task <id>` 指定任务（如 TASK-001）。'
        : '',
      '',
    ].filter(Boolean).join('\n'),
  }));
}

/**
 * 为 CodeBuddy 生成 13 阶段 slash command 文件列表。
 */
function generateCodebuddyStageSlashCommands(dir: string): Array<{
  dir: string;
  filename: string;
  content: string;
}> {
  return WORKFLOW_STAGES.map((stage) => ({
    dir,
    filename: `sovei-${stage.name}.md`,
    content: [
      `# Sovei ${stage.name} — ${stage.desc}`,
      '',
      `> ${stage.desc}`,
      '',
      '## 参数',
      '',
      stage.name === 'explore'
        ? [
            '- `$ARGUMENTS`：Feature ID（如 001-my-feature）',
            '- 可选 `--prd <path>`：PRD 文件路径（入口模式）',
            '- 可选 `--brief <text>`：内联需求描述',
            '- 可选 `--complete`：校验产物并完成阶段',
          ].join('\n')
        : [
            '- `$ARGUMENTS`：Feature ID（如 001-my-feature）',
            '- 可选 `--sub-change <id>`：对子变更执行此阶段',
            stage.name === 'implement' ? '- 必选 `--task <id>`：指定任务（如 TASK-001）' : '',
          ].join('\n'),
      '',
      '## 执行步骤',
      '',
      stage.name === 'explore'
        ? [
            '1. 入口模式（带 PRD 或 brief）：',
            '   ```bash',
            '   sovei workflow explore $ARGUMENTS --prd ./docs/prd.md',
            '   # 或：sovei workflow explore $ARGUMENTS --brief "需求描述"',
            '   ```',
            '2. 按提示契约读 PRD + business-coverage.md，产出 exploration.md + sub-change-map.md。',
            '3. 完成阶段：',
            '   ```bash',
            '   sovei workflow explore $ARGUMENTS --complete',
            '   ```',
            '4. 如建议拆分：',
            '   ```bash',
            '   sovei feature split $ARGUMENTS --json',
            '   sovei feature split $ARGUMENTS',
            '   ```',
          ].join('\n')
        : [
            '1. 使用 execute_command 工具准备阶段：',
            '   ```bash',
            `   sovei workflow ${stage.name} $ARGUMENTS`,
            '   ```',
            '2. 阅读 CLI 输出的提示契约段，按指引填写产物文件。',
            '3. 获取上下文包（可选）：',
            '   ```bash',
            `   sovei context build --stage ${stage.name} $ARGUMENTS`,
            '   ```',
            '4. 完成实际工作后，完成阶段：',
            '   ```bash',
            `   sovei workflow ${stage.name} $ARGUMENTS --complete`,
            '   ```',
          ].join('\n'),
      '',
      stage.name === 'scope'
        ? '> **拆分修正**：完成 scope 后运行 `sovei feature split <feature> --json` 修正拆分提议。'
        : '',
      stage.name === 'explore'
        ? '> explore 是入口阶段，支持 `--prd`/`--brief` 一条指令完成 Feature 创建 + 需求分析。'
        : '',
      '',
    ].filter(Boolean).join('\n'),
  }));
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
    notes: 'Codex 桌面版不支持 slash command，通过技能包（skillPackage）暴露工作流节点按钮。',
  },
  contextFile: 'AGENTS.md',
  renderSkillDirectives: (bindings) => renderCliSkillDirectives(bindings),
  quickChannelDirective: [
    '',
    '### Sovei Workflow Nodes (Codex)',
    '',
    '13 个工作流阶段节点按钮（按顺序执行，每个节点 `--complete` 推进）：',
    '',
    '> explore 是入口阶段，支持 `--prd`/`--brief` 一条指令完成 Feature 创建 + 需求分析。',
    '',
    '| 节点 | 命令 | 说明 |',
    '|---|---|---|',
    '| explore | `sovei workflow explore <feature> --prd <path>` | 需求探索 + 业务关联 + 拆分提议（入口） |',
    '| load | `sovei workflow load <feature>` | 加载/恢复 Feature 状态 |',
    '| grill | `sovei workflow grill <feature>` | 决策拷问（事实/推断/范围） |',
    '| wayfind | `sovei workflow wayfind <feature>` | 依赖分析与路径选择 |',
    '| spec | `sovei workflow spec <feature>` | 规格定义 + reconciliation |',
    '| scope | `sovei workflow scope <feature>` | 范围确定 + 拆分修正 |',
    '| plan | `sovei workflow plan <feature>` | 实现计划 |',
    '| tasks | `sovei workflow tasks <feature>` | 任务拆分 |',
    '| implement | `sovei workflow implement <feature>` | 代码实现 |',
    '| converge | `sovei workflow converge <feature>` | 收敛检查 |',
    '| verify | `sovei workflow verify <feature>` | 验证 |',
    '| learn | `sovei workflow learn <feature>` | 知识提取 |',
    '| sync | `sovei workflow sync <feature>` | 同步 |',
    '',
    '其他命令：',
    '- `sovei workflow explore <feature> --brief "<描述>"` — 无 PRD 文件时用内联描述进入 explore',
    '- `sovei context build --stage <stage> --feature <feature>` — 获取阶段提示 + 上下文包',
    '- `sovei feature split <feature> --json` — 拆分 Feature 为子变更（scope 后可用）',
    '- `sovei feature sub-change list <feature>` — 列出子变更状态',
    '',
    '### Quick Channel (Codex)',
    '',
    '快速通道与完整 Sovei 工作流是**二选一关系**，不叠加：',
    '',
    '- **快速通道**：低风险、范围明确的临时代码变更（不在正式 Feature 工作流内）。编辑前运行 `sovei quick "<变更描述>" --paths <文件>`（排除路径自动从 .gitignore 读取）→ 完成编辑 → 运行测试。',
    '- **完整工作流**：已注册 Feature 并走 13 阶段流程时，代码在 `implement` 阶段完成，由 converge/verify 门禁治理，**不需要再跑 quick**。',
    '',
  ].join('\n'),
  skillPackage: {
    dir: 'sovei-flow/agents',
    skills: [
      {
        filename: 'sovei-workflow.md',
        content: [
          '---',
          'name: sovei-workflow',
          'description: Sovei 结构化开发工作流。当需要走完整的 13 阶段开发流程（explore→load→grill→wayfind→spec→scope→plan→tasks→implement→converge→verify→learn→sync）时唤起此技能。适用于中大型需求、需要决策拷问和验证的变更。也适用于需要拆分 Feature 为子变更并行开发的场景。',
          '---',
          '',
          '# Sovei Workflow',
          '',
          '## 13 个阶段节点',
          '',
          '按顺序执行，每个节点用 `--complete` 推进：',
          '',
          '```',
          'explore → load → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync',
          '```',
          '',
          '### 核心命令',
          '',
          '- `sovei workflow bootstrap <feature>` — 创建新 Feature',
          '- `sovei workflow explore <feature> --prd <path>` — 入口模式（PRD → 需求分析 + 拆分提议）',
          '- `sovei workflow explore <feature> --brief "<描述>"` — 入口模式（内联需求描述）',
          '- `sovei workflow <stage> <feature>` — 准备阶段（注入提示契约）',
          '- `sovei workflow <stage> <feature> --complete` — 完成阶段并推进',
          '- `sovei context build --stage <stage> --feature <feature>` — 获取阶段提示 + 上下文包',
          '- `sovei feature split <feature> --json` — 拆分提议契约（scope 后可用）',
          '- `sovei feature sub-change list <feature>` — 列出子变更状态',
          '- `sovei quick "<描述>" --paths <文件>` — 快速通道（低风险局部改动）',
          '',
          '### 阶段说明',
          '',
          '| 阶段 | 产物 | 作用 |',
          '|---|---|---|',
          '| explore | exploration.md + sub-change-map.md | 需求探索 + 业务关联 + 拆分提议（入口） |',
          '| load | load-summary.md | 状态校验 + 现状探索 + 风险识别 |',
          '| grill | decision-log.md | 决策拷问（事实核实/可推断/范围性） |',
          '| wayfind | wayfinder.md | 依赖分析 + 路径选择 |',
          '| spec | spec.md + reconciliation.md | 规格定义 + 技术对齐 |',
          '| scope | scope.md + coverage-matrix.md | 范围确定 + 拆分评估 |',
          '| plan | plan.md | 实现计划 |',
          '| tasks | tasks.md | 任务拆分 |',
          '| implement | change-manifest.md | 代码实现 |',
          '| converge | convergence-report.md | 收敛检查 |',
          '| verify | evidence.md | 验证 |',
          '| learn | learning-report.md | 知识提取 |',
          '| sync | sync-report.md | 同步 |',
          '',
          '### 拆分能力（explore 或 scope 后）',
          '',
          'explore 阶段可基于需求功能域提议拆分；scope 阶段可基于代码影响面修正拆分。影响模块 ≥ 4 个且耦合低时，可拆分为子变更并行开发：',
          '',
          '1. `sovei feature split <feature> --json` — 获取拆分提议契约',
          '2. AI 填充 sub-change-map.md',
          '3. 子变更独立推进 plan→verify',
          '4. 全部 merged 后聚合 learn→sync',
          '',
        ].join('\n'),
      },
    ],
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
  contextFile: 'CLAUDE.md',
  renderSkillDirectives: (bindings) => renderClaudeSkillDirectives(bindings),
  quickChannelDirective: [
    '',
    '### Quick Channel (Claude Code)',
    '',
    '快速通道与完整 Sovei 工作流是**二选一关系**，不叠加：',
    '',
    '- **快速通道**：低风险、范围明确的临时代码变更（不在正式 Feature 工作流内）。使用 `/sovei-quick` slash command 或直接运行 `sovei quick "<变更描述>" --paths <文件>`（排除路径自动从 .gitignore 读取）→ 完成编辑 → 运行测试。',
    '- **完整工作流**：已注册 Feature 并走 13 阶段流程时，代码在 `implement` 阶段完成，由 converge/verify 门禁治理，**不需要再跑 quick**。',
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
  // P0-B: 13 阶段 slash command，让 agent 用 /sovei-load、/sovei-spec 等触发工作流节点
  slashCommands: generateClaudeStageSlashCommands('.claude/commands'),
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
    '快速通道与完整 Sovei 工作流是**二选一关系**，不叠加：',
    '',
    '- **快速通道**：低风险、范围明确的临时代码变更（不在正式 Feature 工作流内）。使用 execute_command 运行 `sovei quick "<变更描述>" --paths <文件> --exclude dist/**` → 检查 riskLevel（escalated 需人工确认）→ 完成编辑 → 测试验证。',
    '- **完整工作流**：已注册 Feature 并走 13 阶段流程时，代码在 `implement` 阶段完成，由 converge/verify 门禁治理，**不需要再跑 quick**。',
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
  // P0-B: 13 阶段 slash command
  slashCommands: generateCodebuddyStageSlashCommands('.codebuddy/commands'),
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
    '快速通道与完整 Sovei 工作流是**二选一关系**，不叠加：',
    '',
    '- **快速通道**：低风险、范围明确的临时代码变更（不在正式 Feature 工作流内）。运行 `sovei quick "<变更描述>" --paths <文件> --exclude dist/**` → 完成编辑 → 运行测试。',
    '- **完整工作流**：已注册 Feature 并走 13 阶段流程时，代码在 `implement` 阶段完成，由 converge/verify 门禁治理，**不需要再跑 quick**。',
    '',
    '### Sovei Workflow Nodes (Trae)',
    '',
    '12 个工作流阶段节点（按顺序执行，每个节点 `--complete` 推进）：',
    '',
    '| 节点 | 命令 | 说明 |',
    '|---|---|---|',
    '| load | `sovei workflow load <feature>` | 加载/恢复 Feature 状态 |',
    '| grill | `sovei workflow grill <feature>` | 决策拷问（事实/推断/范围） |',
    '| wayfind | `sovei workflow wayfind <feature>` | 依赖分析与路径选择 |',
    '| spec | `sovei workflow spec <feature>` | 规格定义 + reconciliation |',
    '| scope | `sovei workflow scope <feature>` | 范围确定 + 拆分评估 |',
    '| plan | `sovei workflow plan <feature>` | 实现计划 |',
    '| tasks | `sovei workflow tasks <feature>` | 任务拆分 |',
    '| implement | `sovei workflow implement <feature> --task <id>` | 代码实现 |',
    '| converge | `sovei workflow converge <feature>` | 收敛检查 |',
    '| verify | `sovei workflow verify <feature>` | 验证 |',
    '| learn | `sovei workflow learn <feature>` | 知识提取 |',
    '| sync | `sovei workflow sync <feature>` | 同步 |',
    '',
    '> 完整步骤：`sovei workflow <stage> <feature>` 准备阶段 → 阅读提示契约 → 填写产物 → `sovei workflow <stage> <feature> --complete` 推进。',
    '> scope 完成后可运行 `sovei feature split <feature> --json` 获取拆分提议。',
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
