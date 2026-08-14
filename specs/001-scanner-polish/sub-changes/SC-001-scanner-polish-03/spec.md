# Spec：SC-001-scanner-polish-03 rescan-incremental

## 目标

让 `project rescan` 默认只重扫 git diff 标记的变更源码文件，避免每次全量读取；保留 `--full` 全量兜底。

## 验收标准

- [ ] rescan 默认计算 git diff 变更文件并传入扫描器。
- [ ] RedlineScanner 和 BusinessMapScanner 只重读变更文件内容。
- [ ] 无 git diff、无 git 仓库或显式 `--full` 时安全回退全量路径。
- [ ] M2 稳定 ID 可用于后续候选复用，既有产物 schema 不变。

## 排除项

本轮不做 import 依赖级联失效检测，不做深层候选差异合并。
