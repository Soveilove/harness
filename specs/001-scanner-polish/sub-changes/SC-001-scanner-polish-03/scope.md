# 影响范围：SC-001-scanner-polish-03

## 影响模块

- `src/cli/commands/project.ts`：rescan 增量入口和 `--full` 兜底。
- `src/config/scanner.ts`：传递 changedFiles。
- `src/config/redline-scanner.ts`：代码面只重扫变更文件。
- `src/config/business-map-scanner.ts`：内容证据只重读变更文件。

## 数据流

rescan → `verifyGitChanges` → changedFiles → `ProjectScanner.scan` → 两个内容扫描器过滤读取；目录结构和 manifest 发现仍保留。

## 边界与恢复

无 git 仓库、baseline 不可用、diff 无源码变更或 `--full` 时使用全量路径；不改变产物 schema。
