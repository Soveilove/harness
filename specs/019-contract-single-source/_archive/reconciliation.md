# Reconciliation: 019-contract-single-source 合并阶段契约为单一事实来源

## Need Translation

DEV_BACKLOG §2.2 P1-1 原话："两套 contract 数据源并存，`src/stages/index.ts` 与 `workflow-engine.ts` 各自维护阶段契约，改一个产物声明要同步两处（016 已踩坑）。建议动作：合并为单一契约源。"

技术理解：
- **做什么**：消除 `DEFAULT_WORKFLOW.stages`（StageConfig）与 `StageDefinition.contract`（StageContract）对 `requiredArtifacts`/`producesArtifacts` 的重复维护，确立单一事实来源。
- **不做什么**：不改任何阶段产物内容、不改 CLI 行为、不改持久化数据、不处理 P1-2（mcp 字段）。

## Current State

读源码 + 跨 Feature 决策核实现状：

- `engine/workflow-engine.ts:44-66` 的 `DEFAULT_WORKFLOW.stages` 定义每个 stage 的 `StageConfig`（name/status/requiredArtifacts/producesArtifacts/next）。
- `stages/index.ts` 的 12 个 `defineStage` 各自带 `contract`（requiredArtifacts/producesArtifacts）。
- **为什么是现在这样**：早期 TypeScript 重写时同时建立了"工作流定义"（编排视角）与"stage 注册表"（插件视角）两套模型，二者都顺手带上了产物契约字段，形成重复。`types.ts` JSDoc 自承 `workflow.version` "has not changed since the TypeScript rewrite"，可见 stages 结构自重写后未被清理。
- 关键事实（grill 已核实）：引擎真正消费产物契约的是 stageRegistry（B）；A 的 `requiredArtifacts`/`next` 无人读，`producesArtifacts` 仅 `archiveInvalidatedArtifacts`（582 行）消费。
- 相关历史 Feature：016-skill-verify 曾踩"改一处漏改另一处"的坑；015-workflow-version-semantics 已确立 `workflow.version` 语义与"不持久化、无迁移"原则。

## Solutions

### Solution A: 保留 A 但瘦身派生（非 breaking）

- 保留 `WorkflowDefinition.stages`，瘦身为 `{ name, status }`，`requiredArtifacts`/`producesArtifacts` 在 engine 构造时从 stageRegistry 拷贝；删 `next`/`requiredArtifacts` 死字段。
- cost: 非 breaking、改动小；但仍是派生缓存，有构造时序成本（DEFAULT_WORKFLOW 模块加载时 stageRegistry 尚未填充），未真正消除"两处数据"，债务只是转移而非消除。

### Solution B: A 为单一来源，B 反向派生

- 以 `DEFAULT_WORKFLOW.stages` 为准，`defineStage` 契约改从它生成。
- cost: 改动面最大（需重构 stages/index.ts 与 StageContract 定义）；方向违背内聚性——把 stage 的"我产出什么产物"职责进一步上提到 workflow 编排层，是更差的设计。

### Solution C: 彻底删 A，stageRegistry 为唯一 SSOT（采用）

- 删除 `WorkflowDefinition.stages` 与 `StageConfig`；合法阶段 guard 改由 `stageOrder.includes` 承担；归档逻辑改从 `stageRegistry.contract` 取。
- cost: 类型层 breaking（`WorkflowDefinition.stages` 字段删除）；但经核实 npm 发布的是混淆 CLI 单文件（无类型分发）、本仓库无跨包消费、版本不匹配仅警告不报错，breaking 实际影响面为零。换来职责最清晰、SSOT 唯一、无派生缓存的最终解。

**采用 Solution C。** 理由：①`requiredArtifacts`/`producesArtifacts` 内聚于 stage 实体，属 stage 注册表而非 workflow 编排层；②`stageOrder` 恒为全量 12 阶段，可同时承担合法阶段 guard，`stages` 字段无独立信息；③当前 2.x 高速迭代期，趁早消除 breaking 代价最低，越拖外部消费方越多。

## Questions

### [tech] Q1: 删除 `WorkflowDefinition.stages` 是否真无外部破坏面？

- recommendation: 无破坏面。证据：①npm `files` 仅 `dist/release/sovei.cjs`（混淆 CLI 单文件），类型不随包分发，外部无法 `import WorkflowDefinition`；②本仓库 `WorkflowDefinition`/`StageConfig`/`DEFAULT_WORKFLOW` 仅 sovei-core 内部 src/test 使用，无跨包消费；③`workflow.version` 不匹配仅 stderr 警告（loader.ts:56-63），不 throw。
- options: [采用 C] [退回 A 保底]

### [tech] Q2: `workflow.version` 是否 bump 到 3.0.0？

- recommendation: bump 到 3.0.0（types.ts JSDoc 规则：breaking refactor of the workflow model 属 major）。同时同步 `DEFAULT_CONFIG.workflow.version`。副作用仅为引导用户更新 project.config.json 的版本警告。
- options: [bump 3.0.0] [不 bump（豁免，因字段不持久化）]

> 注：本 Feature 为 S1 内部重构，无用户可见行为变化。Q1/Q2 结论已在 grill/spec 阶段经证据定清，作为 [tech] 决策记录于此。

## Sign-off

- [x] tech: by: agent date: 2026-08-07 ref: specs/019-contract-single-source/decision-log.md
- [ ] product: by: ____ date: ____ ref: ____（S1 内部重构，无用户可见行为变化，按红线 CONFIRMATION_GATE_INTEGRITY 仅 S2/S3 需 product 确认，S1 豁免）
