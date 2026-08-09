# Change Manifest: 023-quick-agent-adapters

## 完成的任务

### TASK-001: IDEAdapter 接口扩展 + 4 适配器补充指令
- `IDEAdapter` 新增 `quickChannelDirective: string` + `slashCommand?: { dir, filename, content }`
- trae/codebuddy/claude/codex 各补充中文快速通道指令
- claude 和 codebuddy 各有 slash command 文件
- gemini/aider/windsurf 补空 `quickChannelDirective`（暂不支持）

### TASK-002: adapters/installer.ts 安装器
- `installAdapters(adapterIds, storage)` — 批量安装
- `checkAdapterInstalled(adapter, storage)` — 检查安装状态
- 幂等：通过 `<!-- sovei-adapter-installed -->` 标记检测

### TASK-003: cli/commands/adapters.ts CLI
- `sovei adapters list` — 表格 + `--json`
- `sovei adapters install [--adapters <ids> | --all]` — 无参数列出可选项

### TASK-004: project init 集成
- `--adapters <ids>` 参数（或 `--adapters all`）
- 无参数时提示用户运行 `sovei adapters install`

### TASK-005: 测试
- 7 条测试覆盖：单适配器安装、slash command 生成、幂等、多适配器、检查状态、跳过无指令适配器

### TASK-006: 构建验证
- tsc --noEmit 通过
- 164/164 测试通过

## 修改的文件

| 文件 | 变更 |
|---|---|
| `src/adapters/registry.ts` | 修改：接口扩展 + 7 适配器补充字段 |
| `src/adapters/installer.ts` | 新增：安装器 |
| `src/cli/commands/adapters.ts` | 新增：CLI 命令组 |
| `src/cli/commands/project.ts` | 修改：--adapters 参数 + 集成安装 |
| `src/cli/index.ts` | 修改：注册 adapters 命令 |
| `src/index.ts` | 修改：导出 installer |
| `test/adapters-install.test.mjs` | 新增：7 条测试 |
