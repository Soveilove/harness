# Scope: 019-contract-single-source

> 阶段：scope
> 范围：纯内部重构，影响面限于 `packages/sovei-core` 内部源码与测试，无跨包、无 npm 外部破坏面。

## 影响面（真实代码位置）

### 修改文件 1：`src/engine/types.ts`
- 删除 `StageConfig` 接口（82-98 行）。
- `WorkflowDefinition` 删除 `stages: Record<string, StageConfig>` 字段（108-116 行），保留 version/stageOrder/maxStagesPerInvocation/allowChaining。
- `getWorkflowVersion()`（407-410 行）改返回 `'3.0.0'`（U1）。

### 修改文件 2：`src/engine/workflow-engine.ts`
- 删除 `DEFAULT_WORKFLOW.stages`（44-66 行），保留其余编排字段。
- 构造器 `this.#workflow` 删除 `stages: {...DEFAULT_WORKFLOW.stages}`（86-91 行）。
- `archiveInvalidatedArtifacts`（约 582 行）的归档产物列表改从 `stageRegistry.get(stage).contract.producesArtifacts` 取（engine 已 import stageRegistry，见 295/319 行）。

### 修改文件 3：`src/engine/state-machine.ts`（5 处 guard 等价迁移）
- `STAGE_COMPLETE`（68 行）：`if (!workflow.stages[event.stage])` → `if (!workflow.stageOrder.includes(event.stage))`
- `CHANGE_DECLARED`（125 行）：同上，对 `event.target`
- `REOPEN`（154 行）：同上，对 `event.target`
- `canExecuteStage`（270 行）：`if (!workflow.stages[stage])` → `if (!workflow.stageOrder.includes(stage))`

### 修改文件 4：`src/config/loader.ts`
- `DEFAULT_CONFIG.workflow.version` '2.0.0' → '3.0.0'（19-24 行，U1）。版本不匹配仅 stderr 警告（56-63 行），非 throw。

### 无需修改（确认）
- `src/index.ts`：`export type * from './engine/types.js'` 自动跟随，无需改。
- `src/stages/*`（define-stage.ts / registry.ts / index.ts）：StageContract 为 SSOT，结构不变。
- 各测试 `.mjs`：仅用 `DEFAULT_WORKFLOW.stageOrder`（保留），未引用 `.stages`/`StageConfig`；mock config 的 `version:'2.0.0'` 为 mock 值，不触发 loader 校验，不受影响。
- `project.config.json`：用户侧 workflow.version 可后续手动更新到 3.0.0（仅消除警告），本次不强制改（避免触碰用户数据，守 NO_SILENT_DATA_LOSS）。

## 状态机 reducer 纯度说明

state-machine.ts 是纯函数（仅依赖传入的 `workflow`），不引入 stageRegistry 单例——保持纯度与可测试性。合法阶段判断改用 `workflow.stageOrder.includes`（`stageOrder` 恒为全量 12 阶段，loader.ts:44-54 强制校验），语义与 `workflow.stages[stage]` 等价。

归档逻辑位于 engine（非 reducer），可安全使用已注入的 stageRegistry 单例。

## 架构压力记录

- `workflow-engine.ts` 体量大（500+ 行）且承载多职责（prepare/complete/change/reopen/audit/wayfinder/skill-runtime）。本次仅做最小去重，**不顺势扩大重构**（守 scope 纪律：多信号叠加才升级治理，本次仅单一契约去重信号）。
- 重复契约属"耦合 + 双写不一致风险"信号，已通过本 Feature 消除。

## 证据充分性

所有改动点均已定位到具体文件行号；消费面无遗漏（全仓库搜索 `workflow.stages`/`.stages[`/`StageConfig`/`DEFAULT_WORKFLOW` 确认仅上述位置）。无 candidate 判断（证据充分，无需标记 candidate）。
