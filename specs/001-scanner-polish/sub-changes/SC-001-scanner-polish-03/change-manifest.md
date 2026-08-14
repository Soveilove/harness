# 变更清单：SC-001-scanner-polish-03

- TASK-001：rescan 默认增量，新增 `--full` 全量开关。
- TASK-002：changedFiles 已传递到 RedlineScanner 与 BusinessMapScanner。
- TASK-003：M3 增量过滤测试与 git verifier 测试已覆盖。

## 范围

仅涉及 rescan 读取范围，不改变候选和业务地图 schema。
