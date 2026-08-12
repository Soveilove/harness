# 变更清单

> 由 Sovei 阶段生成：implement
> Feature：030-feature-sub-changes（Feature 拆分为多个子变更）

---

## 目标

为 Sovei 引擎新增"Feature 拆分为子变更"能力：一个 Feature 可在 scope 阶段后拆分为多个独立开发的子变更，各子变更共享 load→scope 上下文，从 plan→verify 独立推进，全部 merged 后父 Feature 聚合进入 learn→sync。

## 任务与文件清单

- [x] TASK-001: `packages/sovei-core/src/engine/types.ts` — 新增 `SubChangeState` 接口；`WorkflowState.subChanges` 字段；4 个子变更事件类型（SUBCHANGE_CREATED / SUBCHANGE_STAGE_PREPARE / SUBCHANGE_STAGE_COMPLETE / SUBCHANGE_MERGED）
- [x] TASK-002: `packages/sovei-core/src/engine/state-machine.ts` — `createInitialState` 初始化 subChanges；reducer 新增 4 个子变更 case；`canExecuteStage` 支持 subChangeId 选项；新增 `aggregationGate()`
- [x] TASK-003: `packages/sovei-core/src/engine/event-store.ts` — `stateToYaml` 序列化 subChanges 段；`parseStateYaml` + `parseSubChangesBlock` 解析嵌套子变更对象
- [x] TASK-004: `packages/sovei-core/src/engine/workflow-engine.ts` — 子变更路由 + 聚合门禁 + splitFeature/listSubChanges 方法
- [x] TASK-005: `packages/sovei-core/src/artifacts/repository.ts` — `getSubChangePath` helper
- [x] TASK-006: `packages/sovei-core/src/cli/commands/feature.ts` — `feature split` + `feature sub-change list` + `sub-change-map.md` 加入 PERSISTENT_FILES
- [x] TASK-007: `packages/sovei-core/src/cli/commands/workflow.ts` — `--sub-change` 选项（12 个阶段命令统一添加，限 plan→verify）
- [x] TASK-008: `packages/sovei-core/src/cli/commands/context.ts` — `--sub-change` 选项（加载父 Feature 共享前段 + 子变更专属后段 + 兄弟子变更摘要）
- [x] TASK-009: 子变更聚焦上下文（在 context.ts 的 artifact 加载层实现，builder.ts 无需额外改动）
- [x] TASK-010: `packages/sovei-core/test/sub-change.test.mjs` — 13 个单元测试覆盖子变更全生命周期
- [x] TASK-011: 回归测试 — 205/205 全部通过（原 192 + 新增 13），零回归
- [x] P0-A: `packages/sovei-core/src/stages/index.ts` — scope 阶段提示契约新增"拆分评估"段，AI 在 scope 完成后主动建议是否拆分

## 行为变更

- **向后兼容**：现有 Feature（001-029）和未 split 的新 Feature 行为完全不变。`WorkflowState.subChanges` 默认 `[]`，旧事件无 `subChangeId` 字段时走顶层 reducer 分支。
- **新增能力**：`feature split` 命令、`feature sub-change list` 命令、`workflow <stage> --sub-change <id>` 选项、`context build --sub-change <id>` 选项。
- **聚合门禁**：含子变更的 Feature 进入 learn 阶段前 `aggregationGate()` 检查全部 merged。
- **自主拆分提示（P0-A）**：scope 阶段提示契约新增"拆分评估"段，AI 在 scope 完成后可根据拆分信号主动建议运行 `feature split --json` 获取提议契约。

## 测试

- 205/205 全部通过（原 192 + 新增 13 个子变更测试），零回归
- 新增 `test/sub-change.test.mjs` 覆盖：SUBCHANGE_CREATED/STAGE_PREPARE/STAGE_COMPLETE/MERGED、依赖约束、聚合门禁、YAML 往返、向后兼容、splitFeature、listSubChanges

## 剩余工作

- 无（全部 TASK 完成）
