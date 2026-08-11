# 变更清单

> Feature：019-contract-single-source
> 阶段：implement
> 性质：纯内部架构重构——合并两套阶段契约为 stageRegistry 单一 SSOT，删除 `WorkflowDefinition.stages` 与 `StageConfig`。

## 改动文件

| 文件 | 改动 |
|---|---|
| `src/engine/types.ts` | 删除 `StageConfig` 接口；`WorkflowDefinition` 删除 `stages` 字段（回归纯编排）；更新 JSDoc（产物契约归 stage 注册表 SSOT，合法阶段集由 stageOrder 承载） |
| `src/engine/state-machine.ts` | 5 处合法阶段 guard 由 `workflow.stages[...]` 改 `workflow.stageOrder.includes(...)`（STAGE_COMPLETE/CHANGE_DECLARED/REOPEN/canExecuteStage），reducer 保持纯函数 |
| `src/engine/workflow-engine.ts` | `DEFAULT_WORKFLOW` 删除 `stages`、version bump 3.0.0、更新注释；`archiveInvalidatedArtifacts` 归档产物列表改从 `stageRegistry.get(stage).contract.producesArtifacts` 取 |
| `src/config/loader.ts` | `DEFAULT_CONFIG.workflow.version` '2.0.0'→'3.0.0' |
| `test/project.test.mjs` | 版本断言随引擎版本同步（'2.0.0'→'3.0.0'） |
| `harness/project/project.config.json` | 本仓库 workflow.version '2.0.0'→'3.0.0'（消除版本警告，对齐新模型） |

## 任务完成

- [x] TASK-001 删除 StageConfig/WorkflowDefinition.stages（types.ts）
- [x] TASK-002 state-machine 5 处 guard 改 stageOrder.includes
- [x] TASK-003 DEFAULT_WORKFLOW 删 stages + archiveInvalidatedArtifacts 改从 stageRegistry 取
- [x] TASK-004 loader version bump 3.0.0
- [x] TASK-005 编译清理（tsc --noEmit 通过，无 StageConfig/.stages[ 残留）
- [x] TASK-006 构建 + 全量测试回归

## 验证证据

- `pnpm run check`（tsc --noEmit）：通过，零残留引用。
- 全仓库搜索 `StageConfig`/`.stages[`/`workflow.stages`：0 匹配。
- 构建 `pnpm run sovei:build`：成功。
- 全量测试 `node --test test/*.test.mjs`：**109/109 通过，0 失败**。
- `sovei workflow list-stages`：12 阶段依赖/生成产物输出与改造前完全一致（验证从 stageRegistry SSOT 读取正常）。
- 版本警告：config 2.0.0 时仅 stderr 警告不阻断（EXIT 0）；更新 config 到 3.0.0 后警告消失。

## 行为不变确认

12 阶段名、顺序、各阶段产物内容、CLI 命令、持久化格式（事件日志/状态文件）全部未变。归档行为由 change-control.test.mjs 既有断言覆盖并通过。

## 剩余工作

无。所有 6 个 TASK 完成。本 Feature 为内部重构，verify 阶段将做最终回归与确认门。
