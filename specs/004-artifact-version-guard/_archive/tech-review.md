# 技术确认: 004-artifact-version-guard 产物版本一致性守卫

> 本文件由 reconciliation.md 渲染，仅供技术负责人审阅。
> 事实来源是 reconciliation.md；修改请回源头，再重新生成。

## 需求翻译

PM 原话 → 技术理解：

- "升级后自动处理旧产物"的机制完全缺失 → 需要引入"产物版本一致性守卫"，让旧产物被显式感知，而不是靠人肉记忆重跑 onboard。
- "读侧守卫" → 在读取 onboarding 产物（map、redline list、redline render、knowledge list、status）时，若产物 `scannerVersion != 当前 VERSION`，提示并需 `--force`/`--refresh` 放行（用户已确认 B 方案）。
- "写侧守卫" → onboard/rescan 执行前对比旧产物版本，明确告知"本次将整体刷新为 vX"。
- "让重扫成为一等公民" → 新增 `sovei project rescan`，同时 onboard 自动带版本提示（用户已确认 C 方案）。

## 现状还原

- `business-map.json`（经 `BusinessMapScanner.scan` 写入）与 `redlines-seed.json`（`project.ts:105` 写入）都记录了 `scannerVersion`，但**全仓库无任何代码读取/比较它**（grill 阶段事实核实确认）。
- 读取产物命令现状：
  - `sovei project map`（project.ts:634）：只解析 generatedAt/lifecycle/coverage/capabilities，不读 scannerVersion。
  - `sovei governance redline list`（governance.ts:54）：只读 `redlines.json`，不读 seed 版本。
  - `sovei governance redline render`（redline-view.ts）：只消费 `seed.redlines`，不读 seed 版本。
  - `sovei knowledge list`（knowledge.ts:29）：只列知识索引，不涉及 onboarding 产物版本。
  - `sovei project status`（project.ts:530）：聚合状态，不涉及版本。
- `sovei project onboard` 是无条件重扫覆盖，不检测旧产物版本。
- `context/snapshot.ts` 的 `isStale()` 针对 context pack 内容哈希，不覆盖 onboarding 产物；`saveSnapshot` 在真实 CLI 中未被调用（幽灵逻辑）。
- 无 migration/upgrade 框架。
- 既有红线约束：`NO_SILENT_DATA_LOSS`（absolute，不得静默重写）、`CLI_CONTRACT_STABILITY`（approval-required，命令契约稳定）、`PERSISTED_SCHEMA_COMPAT`（approval-required，schema 兼容）。

## 方案与代价

### Solution A: 独立共享守卫模块 + 各命令接入
- 新建 `src/config/artifact-version-guard.ts`： `readScannerVersion(storage, path)`：读取产物 JSON 的 `scannerVersion`。 `assertArtifactsCurrent(storage, paths, { force, refresh })`：对一组产物做版本检查；任一旧产物且未放行则抛错并附醒目警告与建议重扫命令。 `map` / `redline list` / `redline render` / `knowledge list` / `status` 接入读侧守卫，新增 `--force`/`--refresh` 选项。 `onboard` 接入写侧守卫（刷新前提示）；新增 `rescan` 子命令复用 onboard action。
- 代价: 改动集中在 project.ts、governance.ts、knowledge.ts 三个命令文件 + 1 个新模块；需为共享守卫写单测。侵入可控，符合"轻量无侵入"目标。

### Solution B: 仅 onboard 内联提示，不新增独立守卫模块
- 只在 onboard 内联对比版本提示，各读侧命令各自内联判断，不抽取共享模块。
- 代价: 代码重复在 5 个读侧命令中蔓延，违背单一职责与 DRY；守卫逻辑难复用、难单测。不推荐。

### Solution C: 实现完整 schemaVersion 迁移框架
- 不只做版本提示，还实现 migration/upgrade 框架以自动升级旧产物。 *选定**：Solution A。
- 代价: 范围远超"轻量守卫"；`PERSISTED_SCHEMA_COMPAT` 已覆盖兼容性，且 onboarding 产物本身是 `lifecycle: candidate`，由人工审核后转正，自动迁移风险高。本轮排除。

## 技术疑问

### Q2: `--force` 与 `--refresh` 是否为同一语义的别名？
- 推荐: 是别名（二者都表示"放行旧产物读取"）
- 选项: 别名 ✓ / 仅 --force / 仅 --refresh

## 签字

- [ ] 产品确认  签字: ____  日期: ____  参考: ____
- [ ] 技术确认  签字: ____  日期: ____  参考: ____
