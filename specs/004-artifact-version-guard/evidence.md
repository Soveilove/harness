# 验证证据

## 需求符合性

- `node dist/cli/index.js project --help`：本地构建 CLI 已注册 `rescan` 子命令（"刷新旧版 onboarding 产物并重新扫描"）。
- 读侧守卫阻断：临时项目放置 `scannerVersion: 1.0.0` 的旧 `business-map.json`，`sovei project map` 无放行时抛错："旧版产物被守卫拦截。如需继续读取旧产物，请加 --force 或 --refresh；如需刷新产物，请运行 sovei project rescan"。
- 读侧守卫放行：`sovei project map --force` 打印醒目警告（"检测到由旧版 CLI 生成的 onboarding 产物（当前 CLI 为 v2.3.0）… 已放行旧产物读取（--force/--refresh）"）后正常输出业务拓扑。
- 写侧守卫：`sovei project rescan --dry-run` 打印"检测到旧版 onboarding 产物（business-map.json 由 v1.0.0 生成，当前为 v2.3.0）。本次将整体刷新为 v2.3.0"。
- 产物缺失/损坏：守卫静默跳过（`readScannerVersion` 返回 null），不破坏既有命令（单测覆盖）。

## 工程质量

- `pnpm run check`（tsc --noEmit）：通过。
- `pnpm run build`：通过。
- 新增守卫单测 `node --test test/artifact-version-guard.test.mjs`：9/9 通过（新鲜/旧/缺失/损坏/放行 force/放行 refresh/阻断/写侧版本对比）。
- 完整测试套件 `pnpm test`：68/68 通过，无回归。

## 限制

- 验证基于本地构建的 `dist/cli/index.js`（dev CLI）；全局安装的 `sovei` 仍为旧版，需发布后方可全局生效（与用户预期一致，随深度 20 打 2.3.1）。
- 未执行 npm publish。
- 守卫的阻断/放行/写侧提示已通过真实 CLI 流程验证；`knowledge list`/`status` 的守卫行为由共享模块单测覆盖（相同函数路径）。

## 结论

通过。没有遗留高严重度问题。
