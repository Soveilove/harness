# Reconciliation: 023-quick-agent-adapters

## Need Translation
**PM 原话**：codebuddy 这里补充一个快速通道的指令，初始化的时候需要补充一个 agent 的适配，先开发四个吧，trae, codebuddy, cc, codex，走标准工作流。不是四个 IDE 都适配，是让用户选择，类似于勾选 agent 适配能力这种。
**技术理解**：新增 `sovei adapters` CLI 命令组，支持交互式选择要安装的 IDE 适配器。每个适配器生成对应的快速通道指令文件（slash command / context file 段落）。`project init` 集成适配器选择步骤。

## Current State
- `adapters/registry.ts` 注册了 4 个适配器（trae/codebuddy/claude/codex），各有 `contextFile`/`capabilities`/`invocationFormat`
- `IDEAdapter` 接口无快速通道指令字段
- `project init` 只写 AGENTS.md，不生成任何 IDE 特定指令文件
- AGENTS.md 模板提到 `/sovei-quick` 但项目中不存在 `.claude/commands/sovei-quick.md`

## Solutions
### Solution A: 扩展 IDEAdapter + 新增 installer + CLI（推荐）
- IDEAdapter 新增 `quickChannelDirective` + `slashCommand`
- 新增 `adapters/installer.ts` 安装器
- 新增 `sovei adapters list/install` CLI
- `project init` 集成
- cost: 中等，~4 个文件改动 + 2 个新增 + 测试

### Solution B: 仅在 AGENTS.md 中嵌入通用指令
- 不生成 IDE 特定文件，只在 AGENTS.md 写一段通用快速通道指令
- cost: 小，但 CodeBuddy/CC 用户无法通过 slash command 触发

## Questions
无未决事项。

## Sign-off
- [x] product: by: user date: 2026-08-10 ref: chat-confirmation
- [x] tech: by: ai-agent date: 2026-08-10 ref: decision-log D1-D5
