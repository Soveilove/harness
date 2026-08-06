# 决策日志

> 生成阶段：grill
> Feature：013-skills-agent-integration

## 决策类型说明

- 事实核实：能从代码/文档/调研查证的，直接记录结论。
- 可推断决策：项目约定或证据指向明确最优解的，自行决策并记录理由。
- 范围性决策：无法从证据推断且会实质改变 Feature 范围的，向用户提问并附推荐答案。

## 事实核实

### F1: 项目现有 Agent 适配器清单

- **类型**：事实核实
- **结论**：`packages/sovei-core/src/adapters/registry.ts` 已注册 4 个内置适配器：`codex`、`claude`、`codebuddy`、`trae`，每个声明调用格式、重开格式和宿主能力画像。
- **依据**：读 `adapters/registry.ts`。

### F2: 012 已实现的 skills 接入能力

- **类型**：事实核实
- **结论**：012 已完成 CLI 接入（`sovei skills use/bind/status`）与 `sovei skills sync`（渲染 skills 进 `AGENTS.md`/`CLAUDE.md`/`.cursorrules`，sentinel 段落 upsert，幂等，可 clean）。
- **依据**：读 `specs/012-external-skills-runtime/` 与 `packages/sovei-core/src/skills/{manager,sync}.ts`。

### F3: OpenSpec / SpecKit 的 Agent 接入机制

- **类型**：事实核实
- **结论**：
  - OpenSpec：单源规则模块 → `sync` 编译出 `CLAUDE.md`/`.cursorrules`/`AGENTS.md`/`GEMINI.md` 等 7+ 种上下文文件；Agent 读取对应文件即获得能力与调用方式。
  - SpecKit：初始化骨架注入 `/speckit.*` 斜杠命令，通过斜杠命令驱动流程；也可通过 subagent 按序自动执行。
- **依据**：调研 OpenSpec（GitHub）与 SpecKit 接入文档。

## 可推断决策

### D1: 渲染方式采用"sentinel 段落 upsert"，不覆盖用户文件

- **类型**：可推断决策
- **决策**：沿用 012 已验证的 `<!-- sovei-skills:start -->`...`<!-- sovei-skills:end -->` upsert 机制，保留用户已有内容。
- **理由**：011 明确"不覆盖已存在 AGENTS.md"，OpenSpec 也强调"零手工维护"但不得破坏用户内容；sentinel 可幂等可清理。
- **被拒绝方案**：整体覆盖目标文件——会破坏用户已有 Sovei 声明。

### D2: Agent 统一通过 `sovei workflow <stage> <feature>` 调用 skill

- **类型**：可推断决策
- **决策**：Agent 读到"该阶段绑定哪个 skill"后，仍通过 Sovei CLI 执行；不引入 SpecKit 式斜杠命令。
- **理由**：斜杠命令会绕过 Sovei 的阶段完成判定，违背"外部 Skill 只读、不拥有工作流状态"的核心契约（012 已确认）。Sovei 已有完整阶段命令与门禁。

## 范围性决策

### Q1: 013 的核心范围——Agent 接入深度

- **类型**：范围性决策
- **问题**：Agent 接入应该做到哪种深度？
- **选项**：
  1. 上下文文件（轻）：只让 agent 读 AGENTS.md/CLAUDE.md/.cursorrules 后按规矩跑 CLI。
  2. MCP 工具（重）：把 skills 暴露为 MCP server 工具，agent 直接调用。
  3. 文件为主 + 预留 MCP 协议（推荐）。
- **决策**：采用 **选项 3（文件为主 + 预留 MCP 协议）**。
- **理由**：上下文文件接入成本低、立即可用（012 已有基础）；MCP server 是重工程，scope 大、风险高，不适合本次。但项目 `adapters/registry.ts` 已预留 `mcp: boolean` 能力维度，本次在设计渲染协议时定义清晰的 MCP 扩展边界，后续可平滑接入。
- **状态**：已决。

### Q2: 是否在本次实现 MCP server

- **类型**：范围性决策
- **问题**：本次是否实现 MCP server 让 skills 暴露为工具？
- **选项**：实现 / 不实现只预留接口（推荐）
- **决策**：**本次不实现 MCP server**，仅在设计上预留协议边界（明确哪些 skill/能力未来可暴露为 MCP 工具、agent 如何通过 MCP 调用并保持只读约束）。
- **理由**：控制 scope 与风险，符合 Sovei"先 spec 后实现"原则；避免未经验证就引入 MCP 重依赖。

### Q3: Agent 上下文文件扩展范围

- **类型**：范围性决策
- **问题**：支持的 Agent 上下文文件是否扩展？
- **选项**：
  1. 保持 AGENTS.md / CLAUDE.md / .cursorrules 三种（当前 012 状态）。
  2. 扩展 GEMINI.md、.aiderrules、Windsurf 等（推荐）。
  3. 做成完全可插拔的适配器体系。
- **决策**：**采用选项 3 的合理收敛——保持适配器可插拔，但首批注册更多常用 agent 上下文文件（GEMINI.md、.aiderrules、.windsurfrules 等）**，渲染逻辑通用化，新增 agent 只需注册适配器。
- **理由**：OpenSpec 证明"一份规则多格式输出"的价值；可插拔适配器让新 agent 接入零侵入，符合项目已有 `adapters/registry.ts` 的架构。

## 未决项

- 无。范围性决策已收敛，进入 wayfind / spec。
