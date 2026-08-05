# 任务清单

> 由 Sovei 阶段生成：tasks
> Feature：005-artifact-guard-hardening

- [ ] TASK-001: 修正 `knowledge list` 与 `status` 过度阻断
  - 依赖：无
  - 文件/契约范围：`src/cli/commands/knowledge.ts`、`src/cli/commands/project.ts`
  - 内容：`knowledge list` 移除守卫调用及 `--force`/`--refresh` 选项、清理无用 import/函数；`status` 移除守卫调用及选项
  - 验收：`knowledge list`/`status` 在旧 onboarding 产物下不阻断
  - 验证：`pnpm run check`

- [ ] TASK-002: 补 004 门禁审阅流程
  - 依赖：无
  - 文件/契约范围：`specs/004-artifact-version-guard/`（tech-review.md、product-review.md、reconciliation.md）
  - 内容：`review-pack generate 004` 生成两个审阅视图；`review-pack import 004 --product ... --by <name> --reference <ref>` 补 product 确认；必要时 `workflow confirm 004 --role tech` 补齐 tech；更新 `004/reconciliation.md` Sign-off
  - 验收：`tech-review.md`/`product-review.md` 存在；004 的 verify 门禁被 product+tech 双确认
  - 验证：文件存在 + `workflow status 004`

- [ ] TASK-003: 新增 CLI 集成测试
  - 依赖：TASK-001
  - 文件/契约范围：`test/artifact-guard-cli.test.mjs`（新）
  - 内容：`map` 旧产物无放行阻断/`--force`/`--refresh` 放行；`rescan --dry-run` 写侧提示；`knowledge list`/`status` 不阻断回归
  - 验收：新测试通过；`pnpm test` 全绿
  - 验证：`node --test test/artifact-guard-cli.test.mjs` + `pnpm test`
