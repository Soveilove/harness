# 变更清单：SC-001-scanner-polish-01

## TASK-001
- 文件：`src/config/redline-scanner.ts`
- 行为：代码面扫描按 pattern 聚合命中文件。
- 结果：同一 pattern 只生成一条候选，候选 ID 不再依赖文件名。

## TASK-002
- 文件：`src/config/redline-scanner.ts`
- 行为：候选标题使用固定 pattern 标题，source 聚合命中文件。
- 结果：业务地图和红线候选的关联数量稳定收敛。

## TASK-003
- 文件：`test/scanner-polish.test.mjs`
- 验证：M2 多文件聚合、source 聚合、ID 稳定性测试通过；全量测试待 converge/verify 阶段复核。

## 变更范围

本子变更只涉及红线扫描聚合逻辑及其回归验证，不包含 workspace 包检测和增量 rescan。
