# Coverage Matrix：002-workflow-v3-state-core

| 行为 | 入口 | 状态/服务 | 持久化 | 失败边界 | 验证 |
|---|---|---|---|---|---|
| bootstrap | `workflow bootstrap` / `workflow explore` | `WorkflowEngine.bootstrap` | 创建 v3 JSON | 已存在、未知 schema | engine + CLI |
| status | `workflow status` | `WorkflowEngine.getState` | 读取 JSON | 缺失/损坏/未知 schema | engine + CLI |
| prepare | 各阶段 CLI | `prepareStage` | prepared 状态 | 非当前阶段、缺产物 | stage tests |
| complete | `workflow <stage> --complete` | `completeStage` + reducer | 原子 revision/history | 重复、越级、陈旧 CAS | state-machine + engine |
| confirm | `workflow confirm` | `confirmGate` | history + gate 状态 | 无 pending/重复确认 | engine |
| override | `workflow override-confirm` | `overrideConfirmation` | history + gate 状态 | 缺理由/重复覆盖 | engine |
| reopen | `workflow reopen` | `reopen` | 原子状态 + history | 越级目标/陈旧 revision | engine |
| replay/diagnose | `workflow replay` | projection/diagnostic | 只读 JSON + artifacts | 不读旧 event/YAML | CLI |
| 并发更新 | engine API | `withLock` + revision | temp + rename | stale writer rejected | storage/integration |
| old data | 任意入口 | v3 loader | 无迁移 | 旧格式明确拒绝 | negative tests |

## 排除验证

本矩阵不覆盖 split aggregation、Explore→Quick、Quick runner、rescan 和知识阈值。