# 决策日志

> Feature：019-contract-single-source
> 阶段：grill
> 目的：消除 DEV_BACKLOG P1-1 架构债务——`workflow-engine.ts` 的 `DEFAULT_WORKFLOW.stages`（StageConfig）与 `stages/index.ts` 的 `StageDefinition.contract`（StageContract）两套阶段契约数据源并存，改产物声明需同步两处（016 已踩坑）。

---

## 决议 1：Feature 范围（范围性决策，用户已确认）

- **类型**：范围性决策
- **决策**：本次 Feature 只处理 **P1-1**（两套 contract 数据源并存，合并为单一契约源）。**P1-2**（`mcp` 能力字段无消费方）属于"做不做 MCP server"的方向性决策，无消费方、属待人工决策项，单独排期，不并入本次。
- **理由**：P1-1 是目标明确、风险可控的技术重构；P1-2 是产品方向决策，性质不同，混入会扩大 Feature 范围。
- **被拒绝方案**：同时处理 P1-1 + P1-2（范围过大、决策性质混杂）。
- **状态**：✅ 已决（用户确认 2026-08-07）

---

## 决议 2：两套契约数据的真实消费面（事实核实，已查证）

通过 code-explorer 全仓库只读探索，核实两套数据的消费路径：

| 数据源 | 位置 | 真实消费点 |
|---|---|---|
| A. `DEFAULT_WORKFLOW.stages`（`StageConfig`） | `engine/workflow-engine.ts:44-66` | ① 存在性 guard（state-machine 68/125/154/270 行 `workflow.stages[stage]`）② `producesArtifacts` → `archiveInvalidatedArtifacts`（582 行）③ `requiredArtifacts` **未读** ④ `next` **死字段未读** |
| B. `StageDefinition.contract`（`StageContract`） | `stages/index.ts` 12 个 stage + `define-stage.ts:28-34` | ① prepareStage 校验/模板（engine 149/267 行）② completeStage 校验（296/319 行）③ createStageContext 校验（537 行）④ CLI list-stages（workflow.ts:267-271） |

关键结论：
- 引擎**真正消费**产物契约的是 **B（stageRegistry）**；A 的 `requiredArtifacts` 与 `next` 是**死数据**（无人读）。
- `WorkflowDefinition.stages` 的全部"合法阶段 guard"可等价由 `stageOrder` 承担：`config/loader.ts` 校验 `stageOrder` 必须恒等于 `DEFAULT_STAGE_ORDER`（全量 12 阶段），故 `stageOrder` 既是顺序又是合法阶段全集。
- 配置文件（`project.config.json`）只定义 `workflow.version`，不定义 stages 契约；合并不涉及配置改写。
- 测试（workflow/change-control/wayfinder/project.test.mjs）靠**阶段数(12)、阶段名顺序、产物文件名、归档行为**间接依赖，无快照 `stages`/`.contract` 对象结构；保持这些不变则多数测试可继续通过。

- **类型**：事实核实
- **状态**：✅ 已决（证据充分）

---

## 决议 3：契约源合并方向（范围性决策，用户授权决策）

- **类型**：范围性决策（用户授权"你决定吧，用你的理解执行"）
- **决策**：采用**方案 C**——以 `stageRegistry` 的 `StageContract` 为**唯一 SSOT**（Single Source of Truth），**彻底删除 `WorkflowDefinition.stages` 字段与 `StageConfig` 类型**。
- **理由**（专业架构师视角）：
  1. **内聚性**：`requiredArtifacts`/`producesArtifacts` 是 stage 实体的属性（"我需要/产出什么产物"），应内聚在 stage 注册表，而非上提到 workflow 编排层。当前设计把 stage 职责错误地上提到 workflow，属设计气味。
  2. **职责分离**：`WorkflowDefinition` 职责应为纯**编排**（version / stageOrder / maxStagesPerInvocation / allowChaining）；产物契约职责归 stage。二者不应重复维护同一组数据。
  3. **无信息丢失**：`stageOrder` 恒为全量 12 阶段，可同时承担"合法阶段 guard"（`workflow.stages[stage]` → `stageOrder.includes(stage)`），删除 `stages` 不丢任何语义。
  4. **breaking 代价最低时机**：`WorkflowDefinition.stages` 当前内部无调用方；现处 2.x 高速迭代期，趁早修正公共类型，越拖外部消费方（服务端/多端开发者）越多，breaking 代价越大。
  5. **公共 API 更清晰**：消费方要拿 stage 契约从 `sovei workflow list-stages` 或 `stageRegistry` 单点取，不再有歧义两份。
- **被拒绝方案**：
  - 方案 A（保留 A 但瘦身派生）：仍是派生缓存，有构造时序成本，不彻底，未真正消除重复。
  - 方案 B（A 为单一来源，B 反向派生）：改动面最大，且方向违背内聚性（把 stage 职责进一步上提到 workflow）。
- **状态**：✅ 已决（用户授权，2026-08-07）

---

## 决议 4：重构的具体形态（可推断决策，证据明确）

- **类型**：可推断决策
- **决策**：
  1. 删除 `types.ts` 中 `StageConfig` 接口与 `WorkflowDefinition.stages` 字段；`WorkflowDefinition` 保留 `version`/`stageOrder`/`maxStagesPerInvocation`/`allowChaining`。
  2. 删除 `workflow-engine.ts` 中 `DEFAULT_WORKFLOW.stages` 与构造器中对 stages 的拷贝（保留 `version`/`stageOrder` 合并）。
  3. state-machine.ts 的"合法阶段 guard"由 `workflow.stages[stage]` 改为 `workflow.stageOrder.includes(stage)`（语义等价，因 stageOrder 恒全量）。
  4. `archiveInvalidatedArtifacts` 的归档产物列表改从 `stageRegistry.get(stage).contract.producesArtifacts` 取。
  5. 保持 12 阶段名、顺序、产物文件名不变，确保既有测试行为兼容。
  6. `WorkflowDefinition.version` 语义需相应更新（删除 stages 属 major 结构性变更，见 types.ts JSDoc 版本规则），但版本号策略由 spec 阶段定。
- **理由**：最小且彻底的去重；`stageOrder` 承担 guard 无信息丢失；归档从 SSOT 取数。
- **状态**：✅ 已决（可推断，证据充分）

---

## 决议 5：风险等级与升级判断（可推断决策）

- **类型**：可推断决策
- **决策**：本次为**纯内部重构**，不改用户可见行为、不改产物契约内容、不改 CLI 命令。但**删除公共类型字段 `WorkflowDefinition.stages`** 属 breaking API 变更。风险等级维持 **S1**（由 load 阶段判定），但需在 spec 阶段明确"这是 breaking 类型变更"并在 verify 阶段充分回归。
- **状态**：✅ 已决

---

## 未决项清单

| # | 未决项 | 说明 | 处置 |
|---|---|---|---|
| U1 | `WorkflowDefinition.version` 如何 bump | 删除 stages 是 major 结构性变更；但当前 workflow.version 为 '2.0.0' 且从不持久化到事件日志（types.ts JSDoc：event replay 恒用当前定义，无迁移） | 交由 spec 阶段定：是否 bump 到 3.0.0，或因其非持久化而豁免 |
| U2 | 是否同步 bump npm 包版本/发版 | 删除公共类型字段属 breaking，按 semver 应 major bump | 交由 spec 阶段定发版策略（本次是否发版） |

> 其余事实已核实、可推断决策已记录、范围性决策已获用户确认。grill 阶段可推进。
