# 影响范围

> 由 Sovei 阶段生成：scope
> Feature：006-workflow-topology-fix

## 修改入口

本 Feature 修改 `sovei-core` 中阶段定义数据源，以及一处受影响的测试 fixture：

1. `packages/sovei-core/src/stages/index.ts`
   - `grillStage.execute` 的 `nextStage: 'spec'`（第 74 行）
   - `specStage.contract.requiredArtifacts`（第 163 行）
   - `specStage.contract.producesArtifacts`（第 164 行）
2. `packages/sovei-core/src/engine/workflow-engine.ts`
   - `DEFAULT_WORKFLOW.stages.spec.requiredArtifacts`（第 45 行）
   - `DEFAULT_WORKFLOW.stages.spec.producesArtifacts`（第 45 行）
   - `DEFAULT_WORKFLOW.stages.grill.next`（第 43 行，仅注释对齐，不改结构）
3. `packages/sovei-core/test/change-control.test.mjs`
   - 第 61-115 行测试 fixture：`002-pivot` feature 通过 STAGE_COMPLETE 事件伪造了 wayfind 阶段完成，但**未写入 `wayfinder.md` 产物文件**（第 73-78 行只写了 decision-log/spec/scope/plan/tasks）。spec.requiredArtifacts 加入 `wayfinder.md` 后，第 111 行 `prepareStage(featureId, 'spec')` 会抛 `Missing required artifacts: wayfinder.md`。
   - 适配：在第 73-78 行补写 `wayfinder.md` 产物，使 fixture 与真实拓扑一致（wayfind 完成后必有 wayfinder.md）。

## 消费者与影响

### `index.ts` 的 contract 消费方
- **`prepareStage`**（`workflow-engine.ts:137`）：用 `stageDef.contract.requiredArtifacts` 做 `checkRequired`。修改 spec 依赖后，spec 阶段准备时会校验 `wayfinder.md` 存在。
- **`completeStage`**（`workflow-engine.ts:169`）：用 `stageDef.contract.producesArtifacts` 做 `validateProduced`。补上 `reconciliation.md` 后，spec 完成校验会同时检查 reconciliation.md 非模板。
- **`list-stages`**（`workflow.ts:255-266`）：从 `stageRegistry` 读取 contract 展示。补全后 `list-stages` 会正确显示 spec 生成 `reconciliation.md`。
- **`createStageContext`/模板生成**（`workflow-engine.ts:153-159`）：按 producesArtifacts 生成模板。补上 reconciliation.md 后，spec 准备会为其生成模板。

### `workflow-engine.ts` 的 DEFAULT_WORKFLOW 消费方
- **状态机推进**（`state-machine.ts`）：`stageOrder` 决定顺序，`stages[stage].next` 在 `STAGE_COMPLETE` 事件处理中使用。
- **`WorkflowEngine` 构造**（`workflow-engine.ts:72-77`）：以 `config.workflow.stageOrder` 覆盖 `DEFAULT_WORKFLOW.stageOrder`，但 `stages` 契约保留 DEFAULT_WORKFLOW 定义。

### 不涉及的区域
- `state-machine.ts`：不改（`canExecuteStage` 靠 `currentStage === stage` 顺序强制 wayfind）。
- `cli/commands/workflow.ts` 命令行为本身：不改。
- `change-control` / `wayfinder` / `knowledge` / `event-store`：不改。
- 已 completed 的 feature（001/002/003/004/005）：`prepareStage`/`completeStage` 仅对当前阶段校验，它们当前阶段非 spec，不受影响。

## 架构压力记录
- 两套 contract 数据源（`index.ts` vs `workflow-engine.ts`）并存是本 Feature 修复的根因，属既有架构债务。本 Feature 将其对齐，但不引入统一契约管理机制（超出范围）。
- `grill.next` 在 `workflow-engine.ts` 中已是 `['wayfind','spec']`，无需改动；仅 `index.ts` 的 `nextStage` 字段需对齐其语义。

## 兼容路径
- 修改仅新增依赖/产物声明，不删除既有字段。任何已按旧 contract 生成的 feature 产物（spec.md 存在）仍满足新校验（需补 wayfinder.md，对 spec 阶段当前运行生效）。
- 正常路径下 wayfind 是强制顺序阶段（`stageOrder` 必经，`canExecuteStage` 强制），其 `postExecute`（`index.ts:150-153`）校验 wayfinder.md 存在，故 spec 准备时 wayfinder.md 必然已存在。不会阻塞正常工作流。
- change/reopen 旁路重开到 spec 时，wayfind 仍在 completedStages 且 wayfinder.md 不在归档范围（仅归档 target 及后继），故不受影响。
- **唯一受影响测试**：`change-control.test.mjs` 的 `002-pivot` fixture 伪造了 wayfind 完成但缺 wayfinder.md 产物，需补写。这是 fixture 不完整，非真实缺陷。
