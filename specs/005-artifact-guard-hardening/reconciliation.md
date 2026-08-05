# Reconciliation: 005-artifact-guard-hardening 守卫加固

## Need Translation

PM 原话 → 技术理解：

- "整个流程跑完了，你觉得有什么不足和缺陷" → 对 004 的三处缺口加固：
  1. 门禁审阅文件缺失（`tech-review.md`/`product-review.md` 未生成、reconciliation Sign-off 未填）。
  2. `knowledge list` 过度阻断（不消费 onboarding 产物却被旧产物版本卡住）。
  3. CLI 命令级行为只靠手动验证，未沉淀成自动化测试。
- "不先发布了，先处理完" → 优先完成 005，再考虑发布。
- "这个不是一个新的东西吗？" → 005 是独立增量，004 已交付的核心保持不动。

## Current State

- 004 已 completed：`artifact-version-guard.ts`（守卫模块）+ `project rescan` + 9 个单测已交付。
- 004 缺口：
  - `governance.ts` 有完整 `review-pack` 命令（generate/import），但 004 走的是 `workflow confirm --role product`，未生成 `tech-review.md`/`product-review.md`，`reconciliation.md` 的 Sign-off 未填。
  - `knowledge.ts` 的 `knowledge list` 在 004 被加了 businessMap+redlineSeed 守卫（过度阻断）。
  - `project.ts` 的 `status` 在 004 被设为硬阻断（健康检查命令不应被卡）。
  - 命令级守卫行为（map 阻断/放行、rescan 写侧提示）只靠 004 的 verify 手动验证，未沉淀自动化测试。
- 既有测试先例：`project.test.mjs` 用 `execFileAsync(process.execPath, [cli, '--root', root, ...])` + 临时目录，适合补 CLI 集成测试。

## Solutions

### Solution A: 三件事在 005 内一次补齐

- 门禁审阅：对 004 跑 `review-pack generate` 生成两个审阅视图，`review-pack import` 补 product 确认，并填充 reconciliation Sign-off。
- 守卫修正：`knowledge list` 完全移除守卫；`status` 降级为不阻断；`map`/`redline list`/`render` 保留。
- 集成测试：新增 CLI 命令级测试（map 阻断/放行、rescan 写侧提示）。
- cost：改动集中在 knowledge.ts、project.ts 的守卫调用点 + 1 个新测试文件 + 004 的门禁审阅产物。低风险，S1。

### Solution B: 仅补门禁审阅，代码缺陷延后

- 只生成 tech-review/product-review 并补 product 确认，`knowledge list`/`status` 过度阻断和集成测试延后到发布后。
- cost：无法在本次闭环"守卫加固"，留下已知缺陷。不推荐。

### Solution C: 重新打开 004 修补

- 用 reopen 返工 004 处理所有问题。
- cost：004 已 completed，reopen 会失效其全部后继并加 revision，污染已交付的审计历史；与"这是新的东西"的判断冲突。不推荐。

**选定**：Solution A。

## Questions

### [product] Q1: `status` 过度阻断的降级方式

- decision: 降级为不阻断（健康检查命令不被卡住），已按可推断决策确认
- recommendation: 不阻断
- options: [不阻断 ✓] [仅提示不阻断] [维持硬阻断]

### [tech] Q2: `knowledge list` 是否保留 `--force`/`--refresh` 空选项

- decision: 移除守卫后，同时移除该命令上无用的 `--force`/`--refresh` 选项，避免误导（这些选项语义是"放行旧产物"，不再适用）
- recommendation: 移除
- options: [移除选项 ✓] [保留空选项]

## Sign-off

- [x] product: by: codebuddy date: 2026-08-06 ref: specs/005-artifact-guard-hardening/product-review.md
- [x] tech: by: codebuddy date: 2026-08-06 ref: specs/005-artifact-guard-hardening/tech-review.md
