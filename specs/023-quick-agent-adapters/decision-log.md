# Decision Log: 023-quick-agent-adapters

> Feature: IDE 快速通道指令适配（用户交互式选择）

## 事实核实

### F1: `IDEAdapter` 接口无快速通道指令字段
**结论**: 已确认。`registry.ts` 的 `IDEAdapter` 接口有 `invocationFormat`/`reopenFormat`/`capabilities`/`contextFile`/`renderSkillDirectives`，但没有 `quickChannelDirective` 或 `slashCommand` 字段。
**状态**: 已决

### F2: 各 IDE 的指令文件机制不同
**结论**:
- **Claude Code**: `.claude/commands/*.md` 作为 slash command（`/filename`）
- **CodeBuddy**: AGENTS.md 嵌入强指令 + 可选 `.codebuddy/` 目录
- **Trae**: `.cursorrules` 文件嵌入指令
- **Codex**: AGENTS.md 嵌入指令
**状态**: 已决

### F3: `project init` 只写 AGENTS.md，不写其他 adapter 文件
**结论**: 已确认。`project.ts` 只生成 `AGENTS.md`，不生成 `.claude/commands/`、`.cursorrules` 等。
**状态**: 已决

### F4: 现有 4 个适配器已注册
**结论**: `registry.ts` 中 `trae`/`codebuddy`/`claude`/`codex` 均已注册，各有 `id`/`label`/`contextFile`/`capabilities`。
**状态**: 已决

## 可推断决策

### D1: 用户交互式选择适配器
**决策**: `sovei adapters install` 和 `sovei project init` 时，让用户选择要安装哪些适配器。支持：
- `--adapters trae,codebuddy` 指定列表
- `--all-adapters` 全量安装
- 无参数时列出可用适配器让用户选
**理由**: 用户不一定用所有 IDE，按需安装避免生成无用文件。
**状态**: 已决

### D2: `IDEAdapter` 接口新增 `quickChannelDirective` + `slashCommand`
**决策**:
- `quickChannelDirective: string` — 嵌入 contextFile 的快速通道指令文本
- `slashCommand?: { dir: string; filename: string; content: string }` — 可选 slash command 文件（仅 CC 支持）
**状态**: 已决

### D3: 新增 `adapters/installer.ts` 模块
**决策**: 安装器接收选中的 adapter ID 列表，为每个生成对应指令文件：
- `trae` → 追加到 `.cursorrules`
- `codebuddy` → 追加到 `AGENTS.md` + 生成 `.codebuddy/commands/sovei-quick.md`
- `claude` → 生成 `.claude/commands/sovei-quick.md` + 追加到 `CLAUDE.md`
- `codex` → 追加到 `AGENTS.md`（Codex 专用格式）
**状态**: 已决

### D4: 新增 `sovei adapters` CLI 命令组
**决策**:
- `sovei adapters list` — 列出所有已注册适配器及安装状态
- `sovei adapters install [--adapters <ids> | --all]` — 安装选中的适配器指令文件
**状态**: 已决

### D5: `project init` 集成交互式选择
**决策**: `project init` 在写完 AGENTS.md 基础内容后，提示用户选择适配器（可通过 `--adapters` 跳过交互）。
**状态**: 已决
