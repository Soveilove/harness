# Spec: 026-feature-archive

## 验收标准

### 功能行为

1. **`sovei feature archive <id>`** 命令可用
   - 执行后，指定 Feature 目录下的过程产物移动到 `_archive/` 子目录
   - 顶层只保留持久文件（workflow-state.yaml、workflow-events.jsonl、decision-log.md、wayfinder.*、sync-report.md、load-summary.md、history/）
   - 输出归档文件清单和保留文件清单

2. **状态检查**
   - 只有 `status: completed` 的 Feature 才允许归档
   - 非 completed 状态报错并退出，不执行任何文件操作

3. **幂等性**
   - 多次运行不报错
   - 已在 `_archive/` 中的文件跳过，只归档顶层新出现的可归档文件
   - `_archive/` 中已存在同名文件时跳过（不覆盖）

4. **不存在的 Feature**
   - Feature 目录不存在时报错，不创建目录

### 边界

- 不做 `--restore`（第一版）
- 不做批量归档（一次只归档一个 Feature）
- 不做归档后自动 git commit

### 排除项

- `summary` 命令（P1-2，单独 Feature）
- `history/` 目录内的文件不动（属于 reopen/change 机制的产物）
