# Spec: 023-quick-agent-adapters

> IDE 快速通道指令适配（用户交互式选择）

## 问题

`sovei project init` 只生成 AGENTS.md，不为任何 IDE 生成快速通道指令文件。用户每次开发时不知道要走 `sovei quick`，因为没有 IDE 层面的触发机制。需要让用户在初始化时选择要安装哪些 IDE 适配器，并生成对应的指令文件。

## 用户可见行为

### U1: `sovei adapters list` — 列出可用适配器
输出表格：适配器 ID、标签、安装状态（已安装/未安装）、指令文件路径。

### U2: `sovei adapters install` — 交互式选择并安装
无参数时列出所有适配器让用户选择（多选）。`--adapters trae,codebuddy` 指定列表跳过交互。`--all` 全量安装。

### U3: 各 IDE 生成对应指令文件
- **Trae**: `.cursorrules` 追加快速通道指令段落
- **CodeBuddy**: `AGENTS.md` 追加强指令 + 生成 `.codebuddy/commands/sovei-quick.md`
- **Claude Code**: 生成 `.claude/commands/sovei-quick.md` slash command + `CLAUDE.md` 追加提示
- **Codex**: `AGENTS.md` 追加 Codex 专用格式指令

### U4: `sovei project init` 集成适配器选择
`project init` 在写完基础 AGENTS.md 后，提示用户选择适配器（可通过 `--adapters` 跳过交互）。

## 验收标准

### AC1: adapters list
- 列出 4 个已注册适配器
- 显示安装状态（检查指令文件是否存在）
- JSON 模式输出结构化数据

### AC2: adapters install --adapters
- `--adapters trae,codebuddy` 只安装这两个
- 生成的文件内容包含快速通道指令
- 重复安装幂等（不重复追加）

### AC3: adapters install --all
- 安装全部 4 个适配器

### AC4: adapters install（无参数）
- 列出适配器列表
- 支持多选

### AC5: project init 集成
- `project init <name>` 后提示选择适配器
- `project init <name> --adapters cc` 跳过交互

### AC6: 指令文件内容
- 每个适配器的指令包含：何时触发快速通道、具体命令、验证步骤
- CC 的 slash command 可被 `/sovei-quick` 触发
- CodeBuddy 的 `.codebuddy/commands/sovei-quick.md` 含可执行指令

## 边界
- 不做适配器版本管理/升级
- 不做适配器内容国际化（暂时只中文）
- 不修改现有 `adapters/registry.ts` 的适配器注册逻辑，只扩展接口

## 排除项
- IDE 特定的高级集成（如 CodeBuddy 的 use_skill 自动绑定）
- 适配器在线模板下载
