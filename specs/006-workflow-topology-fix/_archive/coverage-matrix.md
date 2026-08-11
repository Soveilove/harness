# 覆盖矩阵

> 由 Sovei 阶段生成：scope
> Feature：006-workflow-topology-fix

| 必需覆盖 | 证据 | 状态 |
|---|---|---|
| **入口/路由** | 修改点位于阶段定义数据源 `src/stages/index.ts` 与 `src/engine/workflow-engine.ts`；由 `stageRegistry.register` 与 `DEFAULT_WORKFLOW` 消费，无独立路由入口。 | 已覆盖 |
| **UI 状态** | 不涉及 UI。CLI `list-stages` 从 `stageRegistry` 读取 contract 展示（`workflow.ts:255-266`），是唯一用户可见输出。 | 已覆盖 |
| **store/service** | contract 经 `stageRegistry`（`define-stage.ts`）与 `WorkflowEngine`（`workflow-engine.ts:72-77`）注入；无持久化 store 变更。 | 已覆盖 |
| **参数** | `requiredArtifacts`/`producesArtifacts` 字段；修改仅新增条目，无参数签名变化。 | 已覆盖 |
| **API** | `prepareStage`（`checkRequired`）与 `completeStage`（`validateProduced`）消费 contract；修改后 spec 准备多校验 `wayfinder.md`、完成多校验 `reconciliation.md`。 | 已覆盖 |
| **鉴权/计费** | 不涉及。 | N/A |
| **异步回调** | 阶段事件为 append-only 事件流（`event-store.ts`）；contract 变更不影响事件回放（事件记录 stage 名与 artifacts，不含 contract 副本）。 | 已覆盖 |
| **成功/失败/清理** | 成功：spec 准备/完成校验通过。失败：spec 缺 `wayfinder.md` 时 `checkRequired` 抛错（预期行为）。清理：`cleanup` 钩子不涉及。 | 已覆盖 |
| **历史/详情/重试** | 已 completed 的 feature（001-005）当前阶段非 spec，`prepareStage`/`completeStage` 不重跑，不受影响。change/reopen 归档逻辑不变。 | 已覆盖 |
| **兼容入口** | `change-control.test.mjs:111` 的 `prepareStage('spec')` 是唯一受影响路径，需补 fixture。 | 已覆盖（需修 fixture） |
| **测试/文档/运行时证据** | 测试：`workflow.test.mjs`（grill/implement）与 `wayfinder.test.mjs`（wayfind）不受 spec contract 变更影响；`change-control.test.mjs` 需适配。运行时：`sovei workflow list-stages` 验证展示。 | 已覆盖（1 处待修） |

## 明确不覆盖
- `state-machine.ts` 顺序推进逻辑
- `change-control` / `wayfinder` / `knowledge` / `event-store` 实现
- 已生成的历史 feature 产物
- `workflow.ts` CLI 命令行为

## 结论
影响面封闭在 2 个源码文件 + 1 个测试 fixture，无未确定边界。
