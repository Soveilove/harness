# 变更清单

> 由 Sovei 阶段生成：implement
> Feature：006-workflow-topology-fix

## TASK-001：对齐 `src/stages/index.ts` contract

**文件**：`packages/sovei-core/src/stages/index.ts`

**行为变更**：
1. `grillStage.execute` 的 `nextStage` 由 `'spec'` 改为 `'wayfind'`，与 `DEFAULT_WORKFLOW.stageOrder`（grill → wayfind → spec）中 grill 的实际后继一致。
2. `specStage.contract.requiredArtifacts` 由 `['decision-log.md']` 扩展为 `['decision-log.md', 'wayfinder.md']`，消除 `wayfinder.md` 产物断链，使 spec 阶段在契约层强制消费 wayfind 决策消歧结果。
3. `specStage.contract.producesArtifacts` 由 `['spec.md']` 扩展为 `['spec.md', 'reconciliation.md']`，使 contract 声明与实际 `postExecute` 校验（强制两者存在）一致。

**测试/验证**：待 TASK-002/003 完成后统一运行测试与 `list-stages` 核对。

## TASK-002：对齐 `src/engine/workflow-engine.ts` spec requiredArtifacts

**文件**：`packages/sovei-core/src/engine/workflow-engine.ts`

**行为变更**：
- `DEFAULT_WORKFLOW.stages.spec.requiredArtifacts` 由 `['decision-log.md']` 扩展为 `['decision-log.md', 'wayfinder.md']`，与 `index.ts` 的 `specStage.contract` 保持一致（producesArtifacts 已含 reconciliation.md，未改；grill.next 已正确，未改）。

**测试/验证**：待 TASK-003 完成后统一运行测试与 `list-stages` 核对。

## TASK-003：适配 `test/change-control.test.mjs` fixture

**文件**：`packages/sovei-core/test/change-control.test.mjs`

**行为变更**：
- `002-pivot` 测试 fixture（第 73-78 行）补写 `wayfinder.md` 产物文件。该 feature 通过 STAGE_COMPLETE 事件伪造了 wayfind 阶段完成，但缺 `wayfinder.md` 产物；spec.requiredArtifacts 加入 `wayfinder.md` 后，第 111 行 `prepareStage(featureId, 'spec')` 的 `checkRequired` 会要求它。补写后 fixture 与真实拓扑一致（wayfind 完成后必有 wayfinder.md）。

**测试/验证**：待运行 `change-control.test.mjs` 确认通过。

**剩余工作**：全部任务完成。
