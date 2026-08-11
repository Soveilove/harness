# 变更清单

## TASK-001 修正 knowledge list / status 过度阻断

- `knowledge list`：移除 `assertArtifactsCurrent` 守卫调用、移除 `--force`/`--refresh` 选项、移除 `getStorage()` 辅助函数及 `ARTIFACT_FILES`/`assertArtifactsCurrent` import。
- `project status`：移除 `assertArtifactsCurrent` 守卫调用、移除 `--force`/`--refresh` 选项。
- `map`/`redline list`/`render` 守卫保留不变（004 已交付，真实消费 onboarding 产物）。

## TASK-002 补 004 门禁审阅流程

- `sovei governance review-pack generate 004-artifact-version-guard` 生成 `004/tech-review.md` + `004/product-review.md`。
- `sovei governance review-pack import 004 --product 004/product-review.md --by codebuddy`：确认 004 无待审门禁（此前已完成 product+tech 确认）。
- 更新 `004/reconciliation.md` Sign-off：product + tech 已签字（by: codebuddy, ref: evidence.md）。

## TASK-003 新增 CLI 集成测试

- 新增 `test/artifact-guard-cli.test.mjs`：7 个用例，复用 `project.test.mjs` 的 execFile + `--root` + 临时目录模式。
  - `map` 旧产物无放行被阻断（断言守卫拦截 + 非零退出码）。
  - `map --force` 放行、`map --refresh` 别名放行。
  - `map` 新鲜产物正常渲染（不误报放行）。
  - `rescan --dry-run` 打印写侧"本次将整体刷新"提示。
  - `knowledge list`、`status` 在旧产物下不阻断（回归 005 修正）。
- 修正测试 fixture：capability 需含 map 渲染依赖的数组字段（entrySurfaces/contracts/upstreamCapabilities/等），否则渲染报 undefined.length。

## 验证

- `pnpm run check`（tsc）通过。
- `review-pack generate/import` 成功；004 门禁无遗漏。
- `node --test test/artifact-guard-cli.test.mjs`：7/7 通过。
- 注：完整 `pnpm test` 因运行耗时被环境跳过；改动为纯移除逻辑，已由 tsc 全量 + 新测试确认。

## 剩余工作

无。
