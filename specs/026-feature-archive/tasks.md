# Tasks: 026-feature-archive

## 任务清单

- [ ] TASK-001: 新建 `feature.ts` 命令文件，实现 `archiveFeature` 核心逻辑
  - 依赖：无
  - 文件：`packages/sovei-core/src/cli/commands/feature.ts`
  - 验收：`archiveFeature` 函数能正确归档 completed Feature 的过程产物到 `_archive/`，幂等，状态检查
  - 验证：单元测试 7 个场景

- [ ] TASK-002: 在 `cli/index.ts` 注册 `registerFeatureCommands`
  - 依赖：TASK-001
  - 文件：`packages/sovei-core/src/cli/index.ts`
  - 验收：`sovei feature archive <id>` 命令可用
  - 验证：tsc 通过 + CLI 手动验证

- [ ] TASK-003: 编写单元测试
  - 依赖：TASK-001
  - 文件：`packages/sovei-core/test/feature-archive.test.ts`
  - 验收：7 个测试场景全部通过
  - 验证：`pnpm test`

## 验证方式

- `pnpm --dir packages/sovei-core run check`（tsc 类型检查）
- `pnpm --dir packages/sovei-core test`（全部测试通过，无回归）
