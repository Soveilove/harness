# Change Manifest: 026-feature-archive

## TASK-001: 新建 feature.ts 命令文件

**文件**：
- `packages/sovei-core/src/cli/commands/feature.ts`（新建）
  - `archiveFeature(storage, featurePath, featureId)` 核心逻辑
  - `registerFeatureCommands(program)` CLI 注册
  - 持久文件白名单：decision-log.md、sync-report.md、load-summary.md、wayfinder.md
  - 排除法归档：所有顶层 .md 文件，排除白名单后移入 `_archive/`

**行为**：
- 检查 Feature 目录存在（用 `storage.list` + `storage.isDirectory`）
- 检查 `workflow-state.yaml` 的 `status === 'completed'`
- 幂等：`_archive/` 已有同名文件时跳过，不覆盖
- 非 .md 文件不动（.yaml/.jsonl/.json 留顶层）
- 子目录不动（history/、decision-tickets/、_archive/）

## TASK-002: 注册命令

**文件**：
- `packages/sovei-core/src/cli/index.ts`（修改）
  - 添加 `import { registerFeatureCommands }`
  - 添加 `registerFeatureCommands(program);`

## TASK-003: 单元测试

**文件**：
- `packages/sovei-core/test/feature-archive.test.mjs`（新建）
  - 7 个测试场景全部通过

## 验证结果

- tsc 类型检查：✅ 通过
- 构建：✅ 通过
- 全量测试：✅ 186/186 通过（179 原有 + 7 新增，零回归）

## 剩余工作

无。三个 TASK 全部完成。
