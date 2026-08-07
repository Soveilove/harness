# 功能规格

> Feature：019-contract-single-source
> 阶段：spec
> 目的：消除 DEV_BACKLOG P1-1 架构债务——合并 `workflow-engine.ts` 的 `DEFAULT_WORKFLOW.stages`（StageConfig）与 `stages/index.ts` 的 `StageDefinition.contract`（StageContract）两套阶段契约数据源为单一事实来源（SSOT）。

---

## 问题定义

阶段产物契约（`requiredArtifacts`/`producesArtifacts`）在两处手工维护：

- **A**：`packages/sovei-core/src/engine/workflow-engine.ts` 的 `DEFAULT_WORKFLOW.stages`（`StageConfig`：name/status/requiredArtifacts/producesArtifacts/next）
- **B**：`packages/sovei-core/src/stages/index.ts` 的 12 个 `defineStage` 的 `contract`（`StageContract`：requiredArtifacts/producesArtifacts）

改一个阶段的产物声明需同步两处，漏改即不一致（016 已踩坑）。经核实，引擎真正消费产物契约的是 **B**，A 的 `requiredArtifacts`/`next` 是无人读的死数据，A 的 `producesArtifacts` 仅被归档逻辑消费。

## 目标（用户/开发者可见行为）

本 Feature 为**纯内部架构重构**，对外用户可见行为**完全不变**：

- `sovei workflow` 全部命令行为不变。
- 12 阶段名称、顺序、各阶段产物文件名不变。
- 各阶段产物的 `requiredArtifacts`/`producesArtifacts` **内容**不变（只是单源化，不改数据）。
- 现有 Feature 的 `workflow-events.jsonl` / `workflow-state.yaml` 无需迁移（`workflow.version` 不持久化到事件日志，event replay 恒用当前定义）。

## 技术目标

1. **SSOT**：`stageRegistry` 的 `StageContract` 成为 `requiredArtifacts`/`producesArtifacts` 的唯一事实来源。
2. **删除冗余**：删除 `WorkflowDefinition.stages` 字段与 `StageConfig` 类型；`WorkflowDefinition` 回归纯编排语义（version/stageOrder/maxStagesPerInvocation/allowChaining）。
3. **合法阶段 guard 等价迁移**：state-machine 中 `workflow.stages[stage]` 存在性判断改为 `workflow.stageOrder.includes(stage)`（语义等价，因 `stageOrder` 恒为全量 12 阶段，config/loader.ts:44-54 强制校验）。
4. **归档逻辑改从 SSOT 取数**：`archiveInvalidatedArtifacts` 的归档产物列表改从 `stageRegistry.get(stage).contract.producesArtifacts` 取。

## 验收标准

| # | 验收标准 | 验证方式 |
|---|---|---|
| AC1 | `WorkflowDefinition` 类型不再含 `stages` 字段；`StageConfig` 类型已删除 | `pnpm run check`（tsc --noEmit）通过，且搜索 `StageConfig`/`.stages[` 无源码引用残留 |
| AC2 | `DEFAULT_WORKFLOW` 不再含 `stages`；构造器不再拷贝 stages | 代码审查 + tsc 通过 |
| AC3 | state-machine 的合法阶段判断改用 `stageOrder.includes(...)`，对非法阶段仍抛 `Unknown stage` | 现有 workflow/change-control/wayfinder 测试通过 |
| AC4 | `archiveInvalidatedArtifacts` 从 `stageRegistry` 取 `producesArtifacts`，change/reopen 归档行为不变 | change-control.test.mjs 归档断言（spec.md/scope.md 移除、decision-log.md 保留）通过 |
| AC5 | 全部既有测试通过（构建后 node --test） | `pnpm run sovei:build` + `pnpm test`，109/109 通过 |
| AC6 | 12 阶段 CLI 行为回归：`sovei workflow load/grill/...` 可正常 prepare/complete | 测试 + 抽验一个 Feature 全链路 |
| AC7 | `sovei workflow list-stages` 输出的依赖/生成产物与改造前一致 | 比对 list-stages 输出 |
| AC8 | `workflow.version` bump 决策落地：project.config.json 版本不匹配仅警告不报错 | 构造版本不匹配场景验证仅警告（loader.ts:56-63） |

## 边界与排除项

- **不做**：P1-2（`mcp` 能力字段去留）——属待人工决策的产品方向项，单独排期。
- **不改**：任何阶段的产物**内容**、阶段数量、阶段顺序、CLI 命令、持久化数据格式（事件日志/状态文件 schema）。
- **不改**：`StageContract`（B 侧）本身的字段结构——它保持为 SSOT，不变。
- **不处理**：`workflow.version` 的持久化迁移（该字段本就不持久化）。

## 未决项处置（来自 grill）

- **U1**：`WorkflowDefinition.version` 与 `DEFAULT_CONFIG.workflow.version` bump '2.0.0' → '3.0.0'。理由：删除 `stages` 属 workflow 模型 breaking 重构。副作用仅为版本不匹配**警告**（loader.ts:56-63，非 throw），引导用户更新 project.config.json。✅ 已决（本 spec）
- **U2**：本次**不强制发版**。`WorkflowDefinition` 类型不进 npm 混淆产物（发布的是 `dist/release/sovei.cjs` CLI 单文件，无类型分发），删除 stages 对 npm 外部用户零影响。本次内部重构随下一次正常发版即可。✅ 已决（本 spec）

## 风险

- 风险等级 S1（内部重构，无用户可见行为变化）。
- 主要回归风险：state-machine guard 语义是否真等价、归档产物列表是否完整。靠 AC3/AC4/AC5 既有测试兜底。
