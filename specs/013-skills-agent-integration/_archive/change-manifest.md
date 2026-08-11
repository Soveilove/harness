# 变更清单

> 由 Sovei 阶段生成：implement
> Feature：013-skills-agent-integration

## TASK-001：新增 gemini / aider / windsurf 适配器

### 文件

- `packages/sovei-core/src/adapters/registry.ts`

### 变更

- 新增 `gemini`（GEMINI.md，mcp: true）、`aider`（.aiderrules，mcp: false）、`windsurf`（.windsurfrules，mcp: true）三个 `IDEAdapter`，均复用 `renderCliSkillDirectives`。
- 注册进 `adapterRegistry`，`list()` 现返回 7 个适配器。

## TASK-002：skills sync 覆盖全部已注册适配器

### 文件

- `packages/sovei-core/src/skills/sync.ts`（逻辑未改，验证覆盖）

### 变更

- `SkillAgentSync.sync()` 遍历 `adapterRegistry.list()`，新增适配器自动被覆盖，无逻辑改动。
- 临时项目实测：sync 渲染出 AGENTS.md / CLAUDE.md / .cursorrules / GEMINI.md / .aiderrules / .windsurfrules 六种文件（AGENTS.md 被 codex+codebuddy 共享去重）；每文件仅一段 sentinel；重复 sync 幂等；clean 移除全部段落。

## TASK-003：skills status 展示已注册适配器清单

### 文件

- `packages/sovei-core/src/cli/commands/skills.ts`

### 变更

- `sovei skills status` 新增"已注册 Agent 适配器"区块，列出全部 7 个适配器及其上下文文件。

## TASK-004：project init 的 AGENTS.md 补充 skills sync / clean 声明

### 文件

- `packages/sovei-core/src/cli/commands/project.ts`

### 变更

- init 生成的 AGENTS.md Key Commands 新增 `sovei skills sync` 与 `sovei skills clean` 声明。
- init 的"后续步骤"提示新增"交付给 Agent：sovei skills sync"。

## 验证

- `pnpm run check` 通过。
- 临时项目实测：init（AGENTS.md 含 sync/clean）→ use（接入全局 skill）→ bind --enable → sync（6 文件生成、幂等）→ status（7 适配器）→ clean（全部移除）。
