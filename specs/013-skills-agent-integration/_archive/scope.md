# 影响范围

> 由 Sovei 阶段生成：scope
> Feature：013-skills-agent-integration

## 概览

本 Feature 把已接入 Sovei 的 Skills 渲染进各开发 Agent 的上下文文件（AGENTS.md、CLAUDE.md、.cursorrules、GEMINI.md、.aiderrules、.windsurfrules），扩展适配器覆盖、支持可插拔注册，并预留 MCP 协议边界。影响面局限在 adapters/skills/CLI 四个模块，无跨模块契约破坏。

## 影响模块与证据

### 1. `packages/sovei-core/src/adapters/registry.ts`（改动）

- **现状**：已有 `IDEAdapter` 接口（id/name/invocationFormat/reopenFormat/capabilities/contextFile/renderSkillDirectives），注册 codex/claude/codebuddy/trae 4 个适配器。
- **改动**：新增 `gemini`（GEMINI.md）、`aider`（.aiderrules）、`windsurf`（.windsurfrules）3 个适配器；能力画像保留 `mcp` 维度作为未来 MCP 扩展边界。
- **消费者**：`skills/sync.ts`（SkillAgentSync）通过 `adapterRegistry.list()/get()` 遍历渲染。
- **压力**：无。接口已稳定，新增适配器仅追加注册。

### 2. `packages/sovei-core/src/skills/sync.ts`（改动）

- **现状**：`SkillAgentSync.sync()` 已实现 sentinel upsert、幂等、去重、clean、dry-run、--adapter 过滤。
- **改动**：默认覆盖范围随 registry 扩展自动增加（新适配器注册后即被渲染）；无逻辑改动，仅依赖 registry。
- **消费者**：`cli/commands/skills.ts` 的 `sync`/`clean` 命令。
- **压力**：无。同步逻辑已泛化，新增文件只是目标变多。

### 3. `packages/sovei-core/src/cli/commands/skills.ts`（改动）

- **现状**：`skills status` 展示局部/全局状态、绑定、锁定。
- **改动**：`skills status` 增加"已注册 Agent 适配器"清单；`sync`/`clean` 提示覆盖文件数随之增加。
- **消费者**：CLI 用户。
- **压力**：无。

### 4. `packages/sovei-core/src/cli/commands/project.ts`（改动）

- **现状**：`project init` 生成 `harness/skills/` 骨架 + AGENTS.md 声明 `skills status/use/bind`。
- **改动**：AGENTS.md 补充 `skills sync`（把 skills 交付给 Agent）与 `skills clean` 声明。
- **消费者**：新初始化项目的用户。
- **压力**：无。

## 兼容入口

- 已有 `AGENTS.md`/`CLAUDE.md`/`.cursorrules` 内容通过 sentinel 段落保留，不覆盖（011 约束）。
- 012 已确认的 SkillRuntime/lock/校验/回退机制不受影响。

## 异步 / 失败 / 清理路径

- sync 为纯文件写操作，无异步生命周期；同一上下文文件被多适配器共享时去重，避免重复段落。
- 目标文件不存在时新建（含最小头）；存在时仅替换 sentinel 段。
- `clean` 幂等：无 sentinel 段时返回空操作。

## 验证面

- 临时项目实测：init → use → bind --enable → sync → 六种上下文文件生成、幂等、clean 恢复。
- `pnpm run check` 类型检查。

## 未覆盖 / candidate

- MCP server 实现（明确排除，仅预留边界）。
- 斜杠命令注入（明确排除）。
- 更多 Agent 格式（如 `.codex/rules`、Windsurf 插件）按需后续注册，本次不扩。
