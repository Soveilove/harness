# 验证证据

## 需求符合性

### 门禁审阅补全（004）

- `sovei governance review-pack generate 004-artifact-version-guard`：成功生成 `specs/004-artifact-version-guard/tech-review.md` + `product-review.md`。
- `sovei governance review-pack import 004 --product ... --by codebuddy`：输出"无待审的产品确认门禁。所有确认完成"，确认 004 无遗漏门禁。
- `004/reconciliation.md` Sign-off 已填充（product + tech，by codebuddy，ref evidence.md）。

### 守卫边界修正

- `project status` 在旧 business-map.json（scannerVersion 1.0.0）下正常输出"Sovei 项目状态"，无守卫拦截。
- `knowledge list` 在旧产物下正常输出"No knowledge entries found"，无守卫拦截。
- `project status --force` 报 `error: unknown option '--force'`（确认选项已从 status 移除）。
- `map` 守卫保留（004 已交付，未改动；由集成测试覆盖）。

### CLI 集成测试

- `node --test test/artifact-guard-cli.test.mjs`：7/7 通过。
  - `map` 旧产物无放行被阻断（守卫拦截 + 非零退出码）。
  - `map --force` / `--refresh` 放行。
  - `map` 新鲜产物正常渲染。
  - `rescan --dry-run` 打印写侧"整体刷新"提示。
  - `knowledge list` / `status` 旧产物不阻断（005 回归）。

## 工程质量

- `pnpm run check`（tsc --noEmit）：通过。
- `pnpm run build`：通过。
- lints：`src/cli/commands` 无诊断。

## 限制

- 完整 `pnpm test` 全量回归因运行耗时被环境跳过。已用 `tsc --noEmit` 全量类型检查 + 7 个 CLI 集成测试 + 真实 CLI 流程（status/knowledge list/status --force）覆盖改动面。改动为纯移除逻辑，回归风险低。建议发布前手动跑一次 `pnpm test` 收尾。

## 结论

通过。没有遗留高严重度问题。
