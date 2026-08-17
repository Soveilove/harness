# Plan：002-workflow-v3-state-core Workflow v3 状态核心

## 目标

以 `workflow-state.json` 取代 Workflow v2 的事件/YAML 双轨，保持单 Feature 12 阶段流程可用，并为后续 split/Quick 提供严格状态底座。

## 架构

`WorkflowStateStore` 负责 JSON schema 校验、锁内读改写、revision/CAS、临时文件原子替换；`workflowReducer` 负责纯状态转移；`WorkflowEngine` 负责业务校验和调用 Store；Markdown 只做投影。R1.1 不实现 split 聚合和 Explore→Quick。

## 数据契约

- `schemaVersion: 3`。
- `featureId/status/currentStage/nextStage/completedStages/reopenedStages/completedTaskIds/activeChangeId/revision/riskLevel/blockers/pendingConfirmations/preparedStages/updatedAt` 保留单 Feature 必要字段。
- `history: WorkflowHistoryEntry[]`，每项包含 `revision/timestamp/actor/action/sourceStage/reason`。
- v3 loader 对缺失字段、未知 schema、重复阶段、非法游标直接失败。
- 本轮不引入 split 的 `mode/aggregation/subChanges` 新协议；若旧类型仍被编译依赖，必须隔离为后续接口或重写为明确非活动字段，不能让旧逻辑驱动状态。

## 数据流

```text
CLI/WorkflowEngine
  → WorkflowStateStore.withLock(featurePath)
    → read workflow-state.json + validate schema
    → reducer(state, command)
    → assert expected revision
    → write temp file in feature dir
    → atomic rename to workflow-state.json
  → return new state
```

## 破坏性策略

- 删除 `workflow-events.jsonl`、`workflow-state.yaml` 常量、解析器、EventStore replay/append API 及旧 fixture。
- `replay` CLI 改为读取 v3 state 并重建/检查 Markdown 投影；若修改范围过大，允许在本 Feature 内将其明确改名为 `diagnose`，但不得保留事件回放假语义。
- 不迁移旧数据；旧文件由发布/重置脚本归档或删除，测试只使用 v3 fixture。

## 实现顺序（TDD）

1. v3 schema 与初始状态：先写 loader/reducer 的合法与非法状态测试。
2. JSON Store：先写原子写、损坏 JSON、unknown schema、CAS 和 lock 测试。
3. Engine bootstrap/status/prepare/complete：先写端到端单阶段和失败场景测试。
4. confirm/override/reopen/task：迁移既有行为测试到 Store API。
5. CLI replay/status 与投影诊断：先写命令输出/不读旧文件测试。
6. 删除旧事件/YAML 实现和 v2 fixture，跑完整检查。

## 约束

- 生产代码前必须有失败测试；每个行为遵循 Red → Green → Refactor。
- 不改 Wayfinder、Quick、split 业务逻辑。
- 每个任务完成后运行定向测试、`check`，最后运行完整 `test`。
