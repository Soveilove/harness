# Reconciliation: 013-skills-agent-integration

## Need Translation

PM 原话：*"参考 openspec 或者 speckit 等怎么接入开发 agent 的起来，比如 codex、cursor、claude code 等。所以我们应该怎么接入这个，当做一个需求来解决吧。"*

技术理解：把"已接入 Sovei 的 Skills"交付给各开发 Agent，参照 OpenSpec/SpecKit 的接入机制，让 Agent 在运行时知道为哪个阶段调用哪个 skill，并通过 `sovei workflow` 统一执行。skills 保持只读、产候选、由 Sovei 校验。

## Current State

- `adapters/registry.ts` 已有 4 个内置适配器：`codex`（AGENTS.md）、`claude`（CLAUDE.md）、`codebuddy`（AGENTS.md）、`trae`（.cursorrules），每个声明 `contextFile` + `renderSkillDirectives` + 能力画像（含 `mcp` 布尔）。缺 `gemini`/`aider`/`windsurf` 等更多格式。
- `skills/sync.ts` 已实现：`SkillAgentSync.sync()` 把 skill-map 绑定渲染进所有已注册适配器的上下文文件，用 sentinel 段落 upsert，幂等、可 `clean`、`--dry-run`、`--adapter` 过滤。同一上下文文件被多适配器共享时去重。
- `skills/manager.ts` 实现全局（`~/.sovei/skills`）+ 局部（`harness/skills/`）接入；`sovei skills use/bind/status` 已可用。
- `project init` 已生成 `harness/skills/` 骨架并在 AGENTS.md 声明部分 skills 命令（`skills status`/`use`/`bind`），但未声明 `skills sync`。
- 012 已确认 SkillRuntime 契约：外部 Skill 只读、产候选、由 Sovei 完成判定，失败回退 native。渲染 skills 进上下文不改变该契约。

## Solutions

### Solution A: 扩展适配器 + 可插拔注册（推荐）

- 在 `adapters/registry.ts` 新增 `gemini`（GEMINI.md）、`aider`（.aiderrules）、`windsurf`（.windsurfrules）适配器，全部走共享 `renderCliSkillDirectives` 或各自风格；`skills sync` 默认覆盖全部已注册适配器；`skills status` 列出全部适配器；`project init` 的 AGENTS.md 补充 `skills sync` 声明。
- cost: 低。仅新增适配器注册 + 渲染覆盖 + 文档声明，改动集中在 registry/sync 与命令输出，无契约破坏。

### Solution B: 引入 MCP server 暴露 skill 为工具

- 把 skill 能力暴露为 MCP 工具，支持 MCP 的 Agent（codex/claude）直接调用而非读文件。
- cost: 高。需实现 MCP server、工具协议映射、生命周期与只读约束，scope 大、风险高，且需验证 Sovei 完成判定边界。
- 结论：本次不实现（纳入非目标），仅在适配器能力画像与文档中预留 MCP 扩展边界。

### Solution C: 保持现状（仅完善 012）

- 只完善 012 已做的三种文件，不新增格式。
- cost: 最低，但不满足"参考 openspec 接入更多 agent"的诉求，覆盖不全。

## Questions

### [product] Q1: 需要覆盖哪些 Agent 上下文文件？

- recommendation: 新增 `gemini`（GEMINI.md）、`aider`（.aiderrules）、`windsurf`（.windsurfrules），与现有三种共六种，覆盖主流 Agent。
- options: [仅现有三种] [新增六种（推荐）] [可插拔、按需注册]

### [tech] Q2: 本次是否实现 MCP server？

- recommendation: 不实现，仅预留协议边界。
- options: [不实现，预留边界（推荐）] [实现]

## Sign-off

- [ ] product: by: ____ date: ____ ref: ____
- [ ] tech: by: ____ date: ____ ref: ____
