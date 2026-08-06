# 功能规格

> 由 Sovei 阶段生成：spec
> Feature：013-skills-agent-integration

## 需求翻译

PM 原话：*"然后还需要分析一下，参考 openspec 或者 speckit 等怎么接入开发 agent 的起来，比如 codex、cursor、claude code 等。所以我们应该怎么接入这个，当做一个需求来解决吧。"*

技术理解：用户希望把"已接入 Sovei 的第三方 Skills"真正交付到各开发 Agent（Codex、Cursor、Claude Code 等）手中。参照 OpenSpec（单源规则 → sync 多格式上下文文件）与 SpecKit（斜杠命令驱动），让 Agent 在运行时能够：1) 知道自己应该为哪个阶段调用哪个 skill；2) 通过 `sovei workflow <stage> <feature>` 统一入口执行；3) skills 保持只读、产候选、由 Sovei 校验与完成阶段。

## 目标（做什么）

1. **扩展 Agent 上下文文件覆盖**：在现有 `AGENTS.md` / `CLAUDE.md` / `.cursorrules` 基础上，新增对 `GEMINI.md`（Gemini CLI）、`.aiderrules`（Aider）、`.windsurfrules`（Windsurf）等常用 Agent 上下文文件的支持。
2. **可插拔适配器体系**：每个 Agent 上下文文件通过注册适配器扩展，新增 Agent 接入零侵入；适配器声明其上下文文件路径、调用格式与能力画像。
3. **`sovei skills sync` 覆盖全部已注册适配器**：一次性把 skill-map 绑定渲染进所有已注册 Agent 上下文文件，保持 sentinel 段落 upsert（不覆盖用户已有内容）、幂等、可 `clean`。
4. **预留 MCP 协议边界**：在适配器能力画像中明确标注支持 MCP 的 Agent（codex/claude 已标 `mcp: true`），并定义未来把 skill 暴露为 MCP 工具的协议契约点，本次不实现 MCP server。
5. **补齐项目自身接入**：`sovei project init` 生成的 AGENTS.md 声明 skills sync 命令，让新项目用户知道如何把 skills 交付给 Agent。

## 非目标（不做什么）

- **不实现 MCP server**：本次仅定义 MCP 扩展边界，不写 MCP 协议实现、不暴露 skill 为可调用工具。
- **不引入 SpecKit 式斜杠命令**：Sovei 已有完整阶段命令与门禁，斜杠命令会绕过阶段完成判定，违背"外部 Skill 只读、不拥有工作流状态"的核心契约。
- **不覆盖用户已有的 Agent 上下文文件内容**：仅通过 sentinel 段落 upsert，保留用户已有 Sovei/其他声明（011 约束）。
- **不改动 012 已确认的 SkillRuntime 契约**：渲染只是把绑定信息写进上下文，不改变 Skill 执行、锁定、校验、回退机制。

## 验收标准

### 功能

1. 新增 3 个适配器：`gemini`（GEMINI.md）、`aider`（.aiderrules）、`windsurf`（.windsurfrules），注册进 `adapterRegistry`。
2. `sovei skills sync` 默认覆盖所有已注册适配器（AGENTS.md、CLAUDE.md、.cursorrules、GEMINI.md、.aiderrules、.windsurfrules），且 `--adapter` 过滤生效。
3. 每个 Agent 上下文文件只含一段 `<!-- sovei-skills:start -->`...`<!-- sovei-skills:end -->`；重复 sync 不重复添加（幂等）。
4. `sovei skills clean` 移除所有 Agent 上下文文件中的 sovei skills 段落，保留其余内容。
5. 渲染内容区分 native 与 external skill，标注 `ENABLED`/`candidate`，并提示 `sovei workflow <stage> <feature>` 调用方式。
6. `sovei skills status` 显示全部已注册适配器及其上下文文件。

### 边界与排除

7. 渲染不改变 Skill 的执行、锁定、校验、回退行为（仅写入上下文文件）。
8. 未接入任何 external skill 时，sync 仍正常生成"使用 native"的提示，不报错。
9. 目标文件存在非 sovei 内容时，sync 保留之；文件不存在时新建（含最小头）。

## 风险等级

- **S1**：范围明确、无跨模块契约破坏、无外部依赖变更。

## 不验收（明确排除）

- MCP server 实现。
- 斜杠命令注入。
- 覆盖用户已存在的 Agent 上下文文件。
- 修改 012 的 SkillRuntime / lock / 校验机制。
