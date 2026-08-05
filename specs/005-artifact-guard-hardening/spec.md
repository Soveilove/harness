# 功能规格

> 由 Sovei 阶段生成：spec
> Feature：005-artifact-guard-hardening

## 目标

对 004（产物版本一致性守卫）做三处加固：补齐门禁审阅流程、修正过度阻断、补 CLI 集成测试。004 已交付的核心守卫逻辑保持不变。

## 用户可见行为

### 1. 门禁审阅补全（为 004）

- `sovei governance review-pack generate 004-artifact-version-guard` 生成 `tech-review.md` 与 `product-review.md`（从 `reconciliation.md` 渲染）。
- 导入 product 确认：`sovei governance review-pack import 004-artifact-version-guard --product <product-review.md> --by <name> --reference <ref>`。
- `reconciliation.md` 的 Sign-off 表格被填充（product/tech 签字信息）。

### 2. 守卫边界修正

- `sovei knowledge list`：**移除** onboarding 产物版本守卫（不再因旧 business-map/redlines-seed 阻断或提示）；保留 `--force`/`--refresh` 选项但不再触发守卫（或移除）。
- `sovei project status`：从硬阻断**降级为不阻断**（健康检查命令不被旧产物卡住）。
- `sovei project map`、`governance redline list`/`render`：守卫**保留不变**（这些命令真实消费 onboarding 产物）。

### 3. CLI 集成测试

- 新增命令级测试：`map` 旧产物无放行被阻断、带 `--force`/`--refresh` 放行；`rescan` 写侧打印"本次将整体刷新"提示。
- 复用 `project.test.mjs` 的 `execFile` + 临时目录 + `--root` 模式。

## 边界 / 排除项

- 不改动 004 已交付的守卫模块 `artifact-version-guard.ts` 核心函数（readScannerVersion/findStaleArtifacts/assertArtifactsCurrent/getStaleArtifactVersion）。
- 不做 schemaVersion 迁移、不改命令名（红线 CLI_CONTRACT_STABILITY 安全）。
- 004 的工作流状态不被 reopen/失效，仅作为已交付基线被 005 补齐流程缺口。

## 验收场景

- [ ] `review-pack generate 004-artifact-version-guard` 生成 `tech-review.md` 与 `product-review.md`。
- [ ] `review-pack import` 导入 product 确认后，004 的 product 门禁被确认（若其仍在 blocked 则解除）。
- [ ] `knowledge list` 在旧 onboarding 产物下**不再阻断**，正常列出知识。
- [ ] `project status` 在旧产物下**不再阻断**，正常显示状态。
- [ ] `project map` 在旧产物下仍阻断（无放行时），带 `--force` 放行——**保留 004 行为**。
- [ ] 新增 CLI 集成测试通过（map 阻断/放行、rescan 写侧提示）。
- [ ] `pnpm run check` + `pnpm test` 全绿。
