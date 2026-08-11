# 任务清单

> 由 Sovei 阶段生成：tasks
> Feature：006-workflow-topology-fix

- [ ] TASK-001: 对齐 `src/stages/index.ts` 中 grill 的 `nextStage` 与 spec 的 contract 声明
- [ ] TASK-002: 对齐 `src/engine/workflow-engine.ts` 中 spec 的 requiredArtifacts（补 wayfinder.md）
- [ ] TASK-003: 适配 `test/change-control.test.mjs` 的 `002-pivot` fixture（补 wayfinder.md 产物）

---

## TASK-001：对齐 `src/stages/index.ts` contract

- **依赖**：无
- **文件范围**：`packages/sovei-core/src/stages/index.ts`
- **修改内容**：
  - 第 74 行 `grillStage.execute`：`nextStage: 'spec'` → `nextStage: 'wayfind'`（与 `stageOrder` 中 grill 的后继一致）
  - 第 163 行 `specStage.contract.requiredArtifacts`：`['decision-log.md']` → `['decision-log.md', 'wayfinder.md']`
  - 第 164 行 `specStage.contract.producesArtifacts`：`['spec.md']` → `['spec.md', 'reconciliation.md']`
- **验收标准**：`sovei workflow list-stages` 显示 spec 依赖 `decision-log.md, wayfinder.md`、生成 `spec.md, reconciliation.md`；grill 描述与实际顺序一致。
- **验证方式**：`sovei workflow list-stages` 输出核对 + 类型检查（`tsc`）。

## TASK-002：对齐 `src/engine/workflow-engine.ts` spec requiredArtifacts

- **依赖**：无（与 TASK-001 独立，但契约必须最终一致）
- **文件范围**：`packages/sovei-core/src/engine/workflow-engine.ts`
- **修改内容**：第 45 行 `DEFAULT_WORKFLOW.stages.spec` 的 `requiredArtifacts`：`['decision-log.md']` → `['decision-log.md', 'wayfinder.md']`（producesArtifacts 已含 reconciliation.md，不改；grill.next 已正确，不改）
- **验收标准**：`DEFAULT_WORKFLOW.stages.spec` 与 `index.ts` 的 `specStage.contract` 完全一致。
- **验证方式**：单元测试 `workflow.test.mjs` 通过 + 代码核对。

## TASK-003：适配 `test/change-control.test.mjs` fixture

- **依赖**：TASK-001/002（spec.requiredArtifacts 含 wayfinder.md 后触发）
- **文件范围**：`packages/sovei-core/test/change-control.test.mjs`
- **修改内容**：在第 73-78 行 fixture 中补写 `wayfinder.md`（`002-pivot` feature 已通过 STAGE_COMPLETE 事件伪造 wayfind 完成，但缺 wayfinder.md 产物；spec prepare 现在要求它）。
- **验收标准**：`change-control.test.mjs` 全部测试通过。
- **验证方式**：运行 `change-control.test.mjs`。
