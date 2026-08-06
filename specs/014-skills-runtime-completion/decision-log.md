# 决策日志

> 由 Sovei 阶段生成：grill
> Feature：014-skills-runtime-completion

---

## 事实核实

### F1：012/013 已实现的配置层范围

**结论**：已确认。

- `skill-map.yaml` 支持 stage → skillId 绑定，含 status 和 fallback 字段
- `skill-lock.yaml` 支持 source/version/ref/commit/checksum/license/status 锁定
- `SkillManager` 提供 init/status/bind/use/sync/clean CLI 命令
- `SkillAgentSync` 将绑定渲染进 7 种 IDE 上下文文件
- `SkillAdapterRegistry` 实现了 `SkillResolver` 接口，能 resolve 非 native 绑定
- `validateSkillConfiguration` 校验 map 与 lock 一致性

### F2：运行时层未实现的具体表现

**结论**：已确认。

- `SkillAdapter` 接口已定义（`execute(request: SkillRequest): Promise<SkillResult>`），但**没有任何实现类**
- `SkillAdapterRegistry.getAdapter()` 返回 null，因为没有任何 adapter 被注册
- `stages/index.ts` 中每个 stage 的 `execute` 方法返回硬编码 prompt 字符串，不检查 skill binding
- `workflow-engine.ts` 的 `prepareStage` 直接调用 `stageDef.execute(ctx)`，不经过 SkillResolver
- 012 的 change-manifest 明确记录 "TASK-007 至 TASK-013：具体 Adapter、只读 Context Pack、回退测试、阶段完成事件约束测试和 Feature 回放" 未完成

### F3：Matt Pocock skills 的实际文件结构

**结论**：已确认。

- 每个 skill 是一个目录，包含 `SKILL.md` 文件
- `SKILL.md` 格式：YAML frontmatter（name, description, 可选 disable-model-invocation）+ markdown body
- 部分技能有附加文件（如 `domain-modeling` 有 `CONTEXT-FORMAT.md` 和 `ADR-FORMAT.md`）
- 技能分两类：user-invoked（`disable-model-invocation: true`）和 model-invoked（无此字段）
- `grill-me` 是 `grilling` 的薄包装（仅一行 `Run a /grilling session`）
- 仓库结构：`skills/engineering/` 和 `skills/productivity/` 两个分类目录
- 许可证：MIT

### F4：各 skill 与 Sovei 阶段的映射关系

**结论**：已确认。

| Matt Pocock Skill | Sovei 阶段 | 调用类型 | 核心价值 |
|---|---|---|---|
| `grill-with-docs` | grill | user-invoked | grilling + domain-modeling 组合：提问 + 术语表/ADR 同步沉淀 |
| `domain-modeling` | spec | model-invoked | 术语表维护 + ADR 判定 + 代码交叉验证 |
| `to-spec` | spec（候选） | user-invoked | spec 模板（Problem/Solution/Stories/Decisions/Testing/Out-of-scope） |
| `to-tickets` | tasks | user-invoked | tracer-bullet 纵向切片 + 阻塞边 + expand-contract 模式 |
| `implement` | implement | user-invoked | TDD 优先 + 定期类型检查 + code-review 收尾 |
| `code-review` | converge + verify | model-invoked | 双轴审查（Standards + Spec）并行子代理 |
| `handoff` | learn | user-invoked | 对话压缩为交接文档 + 建议技能 + 脱敏 |

### F5：Sovei 现有 stage prompt 与 Matt Pocock skill 内容的差异

**结论**：已确认存在显著差异。

- **grill**：Sovei 的三层决策纪律（事实核实/可推断决策/范围性决策）是框架性的。Matt 的 `grilling` 有具体的设计树结构、frontier 计算、问题编号格式、事实查找委派规则和完成条件。
- **converge/verify**：Sovei 的 prompt 是 "将差距分类为 missing/partial/contradicts/unrequested"。Matt 的 `code-review` 有具体的 12 种 Fowler code smells 清单、双轴分离原理和并行子代理聚合规则。
- **spec**：Sovei 有 reconciliation.md 结构。Matt 的 `to-spec` 有不同的模板结构（Problem/Solution/User Stories/Implementation Decisions/Testing Decisions/Out of Scope）。
- **tasks**：Sovei 要求 "纵向任务"。Matt 的 `to-tickets` 有具体的 tracer-bullet 规则、blocking edges、expand-contract 模式和用户确认流程。

---

## 可推断决策

### I1：Adapter 策略——prompt 注入而非子代理执行

**决策**：采用 prompt 注入策略。Stage 执行时读取绑定的外部 skill 的 SKILL.md 内容，将其拼接到原生 stage prompt 前面，形成一个完整的 prompt 返回给 AI 代理。

**理由**：
- Sovei 的运行时是 CLI + AI 代理协作模式，CLI 返回 prompt，AI 代理执行。没有自己的子代理运行时。
- Matt 的 `code-review` 虽然描述了并行子代理，但实际执行时 AI 代理（Claude Code/Cursor 等）会自行决定是否拆分子任务。prompt 注入足够传达意图。
- 子代理执行需要完整的 agent runtime（调度、上下文隔离、结果聚合），这是 Sovei 目前不具备的基础设施，不在本 Feature 范围内。

**被拒绝方案**：
- 子代理执行：需要建设 agent runtime，成本过高，且与 Sovei "文件协议优先" 的设计原则冲突。
- 纯替换（用 skill 内容完全替换 stage prompt）：会丢失 Sovei 的产物契约（输入/输出/停止条件），导致门禁失效。

### I2：Prompt 组合结构

**决策**：组合后的 prompt 结构为：

```
## 权威规则
（Sovei 原生：revision、产物权威性声明）

## 外部 Skill 指令
（Matt Pocock SKILL.md body 内容）
来源：<skill-id> v<version>

## 阶段契约
（Sovei 原生：输入/操作/输出/停止条件）
```

Skill 内容在前提供方法论指导，Sovei 契约在后提供产物和门禁约束。AI 代理先理解"怎么做"（skill），再理解"做什么、做到什么程度"（contract）。

**理由**：
- 方法论指导执行方式，契约约束执行边界。先方法论后契约符合认知顺序。
- 权威规则必须在最前面，因为它定义了整个会话的事实源。

**被拒绝方案**：
- Skill 在后、契约在前：AI 代理可能先按契约的抽象描述行动，忽略 skill 的具体方法论。
- 交替混合：破坏两段内容的完整性，难以维护。

### I3：Vendor 目录结构

**决策**：`harness/vendor/mattpocock/skills/<category>/<skill-name>/SKILL.md`

与 Matt Pocock 仓库原始结构一致，便于 diff 和升级。

**理由**：
- 保持原始目录结构使得 `git diff` 能直接对比 vendor 和上游。
- 设计文档第 10 节已规划 `harness/vendor/` 目录。
- 分类目录（engineering/productivity）保留了 Matt 的组织逻辑。

### I4：Skill 文件解析

**决策**：解析 YAML frontmatter 提取元数据（name, description），使用 markdown body 作为 skill 指令内容。附加文件（如 `CONTEXT-FORMAT.md`）在本 Feature 中不解析，留给后续迭代。

**理由**：
- frontmatter 提供了 skill 的 name 和 description，可用于 CLI 展示和日志。
- body 是实际的指令内容，直接注入 prompt。
- 附加文件（如 domain-modeling 的 CONTEXT-FORMAT.md）是 skill 内部引用的模板，需要在更复杂的 adapter 中处理。本 Feature 先支持单文件注入。

### I5：回退策略

**决策**：外部 skill 加载失败（文件不存在、解析错误、超时）时，回退到 Sovei 原生 stage prompt，并在执行报告中记录 `mode: fallback` 和 `fallbackReason`。

**理由**：
- 012 spec 验收标准明确要求此行为。
- 工作流不应因外部 skill 问题而中断。
- `SkillExecutionReport` 类型已定义 `mode: 'fallback'` 和 `fallbackReason` 字段。

### I6：执行报告

**决策**：`prepareStage` 返回的 `StageResult` 中新增 `skillExecutionReport` 字段，记录实际使用的 skill 来源。CLI 在输出中显示 `使用 Skill：grilling v1.0.0 (mattpocock)` 或 `使用 Skill：native`。

**理由**：
- 012 spec 验收标准要求 "CLI 在每次阶段执行结果中报告实际加载的 Sovei 能力和第三方 Skills"。
- `SkillExecutionReport` 类型已定义，只需填充和展示。

### I7：Skill 安装器范围

**决策**：实现 `sovei skills install <source>` 命令，支持从 git 仓库拉取指定 ref 的 skill 文件到 `harness/vendor/`，计算 checksum，自动更新 `skill-lock.yaml`。同时支持 `--path <local-dir>` 从本地目录安装。

**理由**：
- 用户明确要求治理层 "全部上"。
- 设计文档 Phase 4 要求 "建立 vendor lock 和安装器"。
- git 安装器使得升级 SOP 有实际工具支撑，而不只是文档。

**被拒绝方案**：
- 仅手动 vendor：无法支撑版本升级 diff 和 checksum 验证。
- npx skills add：引入对 Matt Pocock 自己的安装器的运行时依赖。

### I8：版本升级 SOP

**决策**：实现 `sovei skills upgrade <skill-id>` 命令，执行以下流程：
1. 从 lock 中读取当前 ref/commit
2. 拉取上游最新版本到临时目录
3. 对比文件 diff（`sovei skills diff <skill-id>`）
4. 用户审查后确认或拒绝
5. 确认后更新 vendor 文件和 lock 中的 ref/commit/checksum

不自动跟随上游 latest，必须人工审查后才能升级。

**理由**：
- 设计文档第 9.2 节明确要求此 SOP。
- 外部 skill 的 prompt 变化可能影响阶段行为，必须经过审查。

---

## 范围性决策

### Q1：接入哪些 Matt Pocock skills？

**决策**：用户已确认。接入 7 个 skill，覆盖 8 个阶段（code-review 复用于 converge + verify）：

| Sovei 阶段 | Matt Pocock Skill | 调用类型 | 核心价值 |
|---|---|---|---|
| grill | `grill-with-docs` | user-invoked | grilling + domain-modeling 组合：提问同时维护术语表和 ADR |
| spec | `domain-modeling` + `to-spec` | model / user | domain-modeling 提供建模纪律，to-spec 提供 spec 模板 |
| tasks | `to-tickets` | user-invoked | tracer-bullet 纵向切片 + 阻塞边 + expand-contract |
| implement | `implement` | user-invoked | TDD 优先 + 定期类型检查 + code-review 收尾 |
| converge | `code-review` | model-invoked | 双轴审查（Standards + Spec） |
| verify | `code-review`（复用） | model-invoked | 同一 skill 适用于两阶段 |
| learn | `handoff` | user-invoked | 对话压缩为交接文档 + 建议技能 + 脱敏 |

`grill-with-docs` 替换原推荐的 `grilling`：它是 grilling + domain-modeling 的组合，在提问过程中同步沉淀术语和架构决策，避免信息只记在 decision-log 里而不进入知识层。

不接入的 skill：`ask-matt`（路由器）、`triage`（issue 分类）、`setup-matt-pocock-skills`（初始化）、`wayfinder`（已内化）、`grill-me`（grilling 薄包装）、`prototype`/`research`/`diagnosing-bugs`/`tdd`/`codebase-design`/`resolving-merge-conflicts`/`wizard`（无对应阶段）。后续可根据效果量化调整。

---

## 未决项清单

（无未决项）
