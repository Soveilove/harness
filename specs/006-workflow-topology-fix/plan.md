# 实施计划

> 由 Sovei 阶段生成：plan
> Feature：006-workflow-topology-fix

## 模块边界

修改面封闭在 3 个文件：

| 文件 | 改动 |
|---|---|
| `src/stages/index.ts` | 对齐 `grill.nextStage`、`spec.producesArtifacts`、`spec.requiredArtifacts` |
| `src/engine/workflow-engine.ts` | 对齐 `DEFAULT_WORKFLOW.stages.spec` 的 requiredArtifacts/producesArtifacts（grill.next 已正确，不动） |
| `test/change-control.test.mjs` | 补 `002-pivot` fixture 的 `wayfinder.md` 产物 |

不涉及：`state-machine.ts`、`change-control/`、`wayfinder/`、`knowledge/`、`event-store.ts`、`workflow.ts`。

## 数据流

- 阶段定义从 `index.ts`（`stageRegistry`）与 `workflow-engine.ts`（`DEFAULT_WORKFLOW`）进入：
  - `prepareStage`：读 `requiredArtifacts` → `checkRequired` 校验前置产物。
  - `completeStage`：读 `producesArtifacts` → `validateProduced` 校验产出。
  - `list-stages`：读 `requiredArtifacts`/`producesArtifacts` 展示。
- 修改后：spec 阶段**准备时**要求 `decision-log.md` + `wayfinder.md`；**完成时**要求 `spec.md` + `reconciliation.md`。

## 契约修改（具体字段值）

### `src/stages/index.ts`
1. `grillStage.execute` 返回的 `nextStage`：`'spec'` → 改为与 `workflow-engine.ts` 语义一致。由于 `execute` 的 `nextStage` 是字符串，而 `DEFAULT_WORKFLOW.stages.grill.next` 是 `['wayfind','spec']`，实际状态机走 `stageOrder`（`grill→wayfind→spec`）。故 `nextStage` 应为 `'wayfind'`（当前阶段的后继），与状态机一致。
   - 第 74 行：`nextStage: 'spec'` → `nextStage: 'wayfind'`
2. `specStage.contract.requiredArtifacts`（第 163 行）：`['decision-log.md']` → `['decision-log.md', 'wayfinder.md']`
3. `specStage.contract.producesArtifacts`（第 164 行）：`['spec.md']` → `['spec.md', 'reconciliation.md']`

### `src/engine/workflow-engine.ts`
- 第 45 行 `stages.spec`：`requiredArtifacts: ['decision-log.md']` → `['decision-log.md', 'wayfinder.md']`；`producesArtifacts: ['spec.md', 'reconciliation.md']` 已正确，无需改。
  - 实际只需把 requiredArtifacts 补上 `wayfinder.md`。
- `grill.next`（第 43 行）已是 `['wayfind','spec']`，正确，不动。

### `test/change-control.test.mjs`
- 第 73-78 行 fixture，补写一行 `wayfinder.md`（在 `decision-log.md` 附近）：
  ```js
  await storage.write(`${featurePath}/wayfinder.md`, '# 决策地图\n\nDestination accepted.');
  ```

## 迁移策略
- 修改对已 completed 的 feature（001-005）无影响（当前阶段非 spec，不重跑 prepare/complete）。
- 对进行中的 feature：若当前阶段在 spec 之前，则新契约生效时 spec 准备会要求 wayfinder.md——但正常路径 wayfind 已完成并产出 wayfinder.md，无迁移负担。
- 无需数据迁移或事件回放变更（事件记录 stage 名与 artifacts，不含 contract 副本）。

## 验证方式
1. **单元测试**：运行 `sovei-core` 全部测试，确认 `change-control.test.mjs` 适配后通过，其余测试无回归。
2. **运行时展示**：`sovei workflow list-stages`，确认 spec 阶段显示"生成产物：spec.md, reconciliation.md"和"依赖产物：decision-log.md, wayfinder.md"。
3. **真实 spec 准备**：对 `006-workflow-topology-fix` 当前 feature，若重走 spec prepare 应通过（本 feature 已有 wayfinder.md）。
