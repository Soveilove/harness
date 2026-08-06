# Reconciliation: 014-skills-runtime-completion 外部 Skills 运行时完成与治理层

## Need Translation

PM 原话：*"先解决问题一，把 skills 接上来，增强流程后发版再解决。问题一应该做全面，全套 skills 生态包括三层：配置层（已做）、运行时层（没做）、治理层（没做），直接全部上。"*

技术理解：
1. **运行时层**：stage 执行时真正读取外部 skill 的 SKILL.md 内容，组合进 prompt 返回给 AI 代理。当前 stage prompt 硬编码在 `stages/index.ts`，skill-map 的绑定信息不进入执行逻辑。
2. **Vendor 层**：将 Matt Pocock 的 7 个 skill 拉取到本地 `harness/vendor/`，锁定版本和 checksum，更新 skill-map 和 skill-lock。
3. **治理层**：实现 skill 安装器（从 git/本地拉取）、版本升级 SOP（diff/replay/approve）和兼容性回放验证。
4. 三层同时完成，发版后后续 Feature 的执行质量会因为外部 skill 的方法论注入而提升。

## Current State

### 012 已实现的配置层

- `skills/types.ts`：定义了 SkillManifest、SkillBinding、SkillContextPack、SkillRequest、SkillResult、SkillArtifactProposal、SkillExecutionReport、SkillAdapter、SkillResolver 接口。
- `skills/config.ts`：parseSkillMap、parseSkillLock、validateSkillConfiguration、manifestMatchesLock。Zod schema 校验完整。
- `skills/registry.ts`：SkillAdapterRegistry 实现 SkillResolver，能 resolve 非 native 绑定，但 getAdapter 始终返回 null（无 adapter 注册）。
- `skills/manager.ts`：SkillManager 提供 init/status/bind/use/sync/clean 命令。支持全局池 `~/.sovei/skills/` 和项目级 `harness/skills/`。
- `skills/sync.ts`：SkillAgentSync 将绑定渲染进 7 种 IDE 上下文文件（AGENTS.md/CLAUDE.md/.cursorrules/GEMINI.md/.aiderrules/.windsurfrules）。
- `cli/commands/skills.ts`：CLI 命令组完整实现。

### 012 未完成的运行时层

- 012 change-manifest 明确记录 "TASK-007 至 TASK-013：具体 Adapter、只读 Context Pack、回退测试、阶段完成事件约束测试和 Feature 回放" 未完成。
- `SkillAdapter` 接口有 `execute(request: SkillRequest): Promise<SkillResult>` 但无实现类。
- `workflow-engine.ts` 的 `prepareStage` 直接调用 `stageDef.execute(ctx)` 返回硬编码 prompt，不检查 skill binding。
- `providers/bootstrap.ts` 初始化时注册了 binding 到 SkillAdapterRegistry，但没有注册任何 adapter。

### 013 扩展的渲染层

- 新增 gemini/aider/windsurf 适配器，adapterRegistry.list() 返回 7 个。
- skills sync/clean 覆盖全部已注册适配器。
- project init 的 AGENTS.md 补充 skills sync/clean 声明。

### 为什么是这样

012 先建配置层是因为需要先定义"skill 是什么、怎么绑定、怎么锁定"的契约，再建运行时。013 先扩展渲染层是因为 Agent 上下文文件是 skills 价值传导到 AI 代理的管道。但运行时层——skill 内容真正进入 stage prompt 的环节——一直未实现，导致配置层和渲染层都是空转：Agent 上下文文件里写着 "grill 阶段使用 mattpocock/grill-with-docs"，但 `sovei workflow grill` 返回的 prompt 里根本没有 grill-with-docs 的内容。

## Solutions

### Solution A: Prompt 注入（选定）

- **描述**：在 `prepareStage` 中，stage 的 `execute` 返回 prompt 后，检查 SkillResolver 是否有当前阶段的外部 skill 绑定。如果有，读取 vendored SKILL.md 的 body 内容，插入到 prompt 中（权威规则 → skill body → 阶段契约）。
- **cost**：需要修改 `workflow-engine.ts` 的 prepareStage、新增 `MarkdownSkillAdapter` 类、修改 `StageResult` 类型。影响面可控，不改变状态机和门禁逻辑。
- **优势**：利用现有 SkillAdapter 接口和 SkillResolver，不需要新建运行时基础设施。AI 代理（Claude Code/Cursor 等）读取组合后的 prompt 后自行执行。

### Solution B: 子代理执行

- **描述**：为每个外部 skill 启动独立的 AI 代理执行，Sovei 聚合结果。
- **cost**：需要建设 agent runtime（调度、上下文隔离、结果聚合、错误处理）。这是 Sovei 目前不具备的基础设施。
- **拒绝理由**：成本过高，与 "文件协议优先" 的设计原则冲突。Sovei 不是 agent 平台，是工作流治理引擎。

### Solution C: 纯替换

- **描述**：用 skill 的 SKILL.md 内容完全替换 stage 的原生 prompt。
- **cost**：丢失 Sovei 的产物契约（输入/输出/停止条件），门禁校验失效。
- **拒绝理由**：stage prompt 中的产物契约和停止条件是 Sovei 治理框架的核心，不能丢失。

## Questions

### [tech] Q1: spec 阶段绑定两个 skill（domain-modeling + to-spec）时如何组合？

- recommendation: spec 阶段的主 binding 是 `domain-modeling`（model-invoked，提供建模纪律），`to-spec` 作为辅助 binding 提供模板结构。prompt 中先注入 domain-modeling 的 body，再注入 to-spec 的模板，最后是 Sovei 的 reconciliation.md 契约。skill-map 中 spec 阶段可以有多个 binding，按顺序注入。
- options: [多 binding 顺序注入] [仅绑定 domain-modeling，to-spec 作为参考但不注入]

> **决策**：grill 阶段已确认。本 Feature 中 spec 阶段先只绑定 `domain-modeling` 一个 skill，`to-spec` 模板内容已经在 Sovei 的 reconciliation.md 结构中体现。多 binding 支持作为后续迭代。

## Sign-off

- [x] product: by: user date: 2026-08-06 ref: 会话确认"按照你的理解先接入"
- [x] tech: by: agent date: 2026-08-06 ref: decision-log.md Q1 已决
