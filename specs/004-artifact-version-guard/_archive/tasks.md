# 任务清单

> 由 Sovei 阶段生成：tasks
> Feature：004-artifact-version-guard

- [ ] TASK-001: 新建共享守卫模块 `src/config/artifact-version-guard.ts`
  - 依赖：无
  - 文件/契约范围：`src/config/artifact-version-guard.ts`（新）
  - 内容：`ARTIFACT_FILES`、`readScannerVersion`、`findStaleArtifacts`、`assertArtifactsCurrent`、`getStaleArtifactVersion`
  - 验收：函数存在且行为符合 plan.md 契约（旧/新/缺失/损坏/放行/阻断）
  - 验证：`pnpm run check`

- [ ] TASK-002: `project map` 与 `project status` 接入读侧守卫
  - 依赖：TASK-001
  - 文件/契约范围：`src/cli/commands/project.ts`
  - 内容：`map`/`status` 新增 `--force, --refresh` 别名选项，action 开头调用 `assertArtifactsCurrent`（map 检查 businessMap；status 检查 businessMap+redlineSeed）
  - 验收：旧产物无放行时阻断并打印警告；带 `--force`/`--refresh` 时打印放行提示并正常执行
  - 验证：`pnpm run check` + `project.test.mjs` 新增场景

- [ ] TASK-003: `redline list`/`render` 与 `knowledge list` 接入读侧守卫
  - 依赖：TASK-001
  - 文件/契约范围：`src/cli/commands/governance.ts`、`src/cli/commands/knowledge.ts`
  - 内容：三命令新增 `--force, --refresh` 选项并调用守卫
  - 验收：旧 redlines-seed.json 场景行为与 TASK-002 一致
  - 验证：`pnpm run check` + `redline-view.test.mjs`/`knowledge.test.mjs` 场景

- [ ] TASK-004: `onboard` 写侧版本提示 + 新增 `rescan` 子命令
  - 依赖：TASK-001
  - 文件/契约范围：`src/cli/commands/project.ts`
  - 内容：`onboard` action 开头调 `getStaleArtifactVersion` 打印"本次将整体刷新为 vY"；新增 `rescan` 子命令复用 onboard 逻辑
  - 验收：onboard 在旧业务地图时打印刷新提示；rescan 可运行且产物 scannerVersion 更新
  - 验证：`pnpm run check` + `project.test.mjs` 场景

- [ ] TASK-005: 新增守卫模块单元测试
  - 依赖：TASK-001
  - 文件/契约范围：`test/artifact-version-guard.test.mjs`（新）
  - 内容：覆盖新鲜/旧/缺失/损坏/放行/阻断六类场景
  - 验收：新测试通过；`pnpm test` 全绿
  - 验证：`pnpm test`
