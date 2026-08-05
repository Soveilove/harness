# 决策日志

> 由 Sovei 阶段生成：grill
> Feature：004-artifact-version-guard

## 待决议项清单

- [已决] 读侧守卫的力度：**B（提示 + 需 `--force`/`--refresh` 才继续）**，由用户确认
- [已决] 重扫命令的形态：**C（onboard 自动带版本提示 + 独立 `rescan` 子命令）**，由用户确认

---

## 决议明细

### 1. scannerVersion 目前是"只写不读"

- **类型**：事实核实
- **决策内容**：`business-map.json` 与 `redlines-seed.json` 中的 `scannerVersion` 记录了生成时的 CLI 版本，但全仓库没有任何代码读取它并与当前 `VERSION` 比较。
- **证据**：
  - `src/config/business-map-scanner.ts`：`scan()` 写入 `scannerVersion: this.scannerVersion`，只写。
  - `src/cli/commands/project.ts:105`：写 `redlines-seed.json` 时填 `scannerVersion: VERSION`，只写。
  - `src/change-control/redline-view.ts`：`RedlineSeed.scannerVersion` 仅作为可选字段存在，渲染 `redlines.md` 只消费 `seed.redlines`，从不读取 `scannerVersion`。
  - `src/cli/commands/project.ts` 的 `map` 命令（:634）只解析 `generatedAt/lifecycle/coverage/capabilities`，不读 `scannerVersion`。
  - `src/context/snapshot.ts` 的 `isStale()` 针对 context pack 内容哈希，不覆盖 onboarding 产物；且 `saveSnapshot` 在真实 CLI 流程中未被调用（幽灵逻辑）。
- **结论**：用户对现状的判断准确。升级后旧产物是否过时，目前完全靠人工记忆。

### 2. 读取 onboarding 产物的命令清单

- **类型**：事实核实
- **决策内容**：需要加读侧守卫的命令及其读取的产物文件：
  - `sovei project map` → `harness/project/codegraph/business-map.json`
  - `sovei governance redline list` / `redline view` / `redlines.md` 渲染 → `harness/project/governance/redlines-seed.json`
  - `sovei knowledge list` → 知识索引（不直接读 onboarding 产物，但 onboard 会写入 candidate 知识）
  - `sovei project status` → 聚合状态（可加提示汇总）
- **结论**：读侧守卫的落点主要集中在 `map` 与 `redline` 相关命令；`status` 可作聚合提示。

### 3. 守卫与既有红线的关系

- **类型**：事实核实
- **决策内容**：本 Feature 与红线 `NO_SILENT_DATA_LOSS`（absolute，CLI 升级不得静默重写项目数据）方向一致——守卫是"让重扫显式化、可预期"，而非静默重写。
- **结论**：实现不得在 onboard 时静默覆盖旧产物而不提示；相反，写侧守卫要求"检测到旧版产物时明确告知本次将整体刷新"。

### 4. 版本来源单一事实源

- **类型**：可推断决策
- **决策内容**：当前版本取 `src/config/version.ts` 的 `VERSION`（运行时从 `package.json` 读取）。守卫比较用 `VERSION` 作为"当前 CLI 版本"，产物里的 `scannerVersion` 作为"生成时版本"，二者不等即视为旧产物。
- **理由**：`VERSION` 已是单一事实源，`scannerVersion` 写入时即用 `VERSION`，无需新增版本常量。
- **被拒绝方案**：为产物单独维护 `ARTIFACT_VERSION` 常量——会造成双版本源漂移，违反单一事实源。

### 5. 比较粒度：仅比较 scannerVersion，不做 schema 迁移

- **类型**：可推断决策
- **决策内容**：本 Feature 只做"版本感知 + 提示 + 重扫入口"，不做 `schemaVersion` 迁移框架。schema 兼容问题由红线 `PERSISTED_SCHEMA_COMPAT` 另行约束，不在本 Feature 范围。
- **理由**：用户明确目标是轻量、无侵入的守卫；迁移框架是更大的工程，避免范围膨胀。
- **被拒绝方案**：顺带实现 migration/upgrade 框架——范围过大，且红线已覆盖兼容性要求。

---

## 范围性决策（待用户确认）

### Q1. 读侧守卫的力度

- **类型**：范围性决策
- **决策内容**：**B（提示 + 需 `--force`/`--refresh` 才继续）**，用户已确认。
- **理由**：用户更看重"防止把旧产物当作当前真相"，宁可显式放行也不静默读到旧数据。
- **影响**：`map`、`redline list`/`view`、`status` 等读侧命令需要新增 `--force`/`--refresh` 选项以放行旧产物读取；不放行则命令被阻断并提示重扫。
- **注意**：这触碰 `CLI_CONTRACT_STABILITY`（approval-required）红线——新增选项是向后兼容的（原有调用不带选项仍可读，只是旧产物场景需显式放行），需在验收中确认放行选项的行为与文档。

### Q2. 重扫命令的形态

- **类型**：范围性决策
- **决策内容**：**C（onboard 自动带版本提示 + 独立 `rescan` 子命令）**，用户已确认。
- **理由**：`rescan` 让"升级后刷新旧产物"成为一等公民、可发现可预期；onboard 保留为完整初始化入口并自带写侧提示。二者语义清晰、互不冲突，且新增子命令不破坏既有命令契约（`CLI_CONTRACT_STABILITY` 安全）。
- **影响**：
  - `sovei project rescan`：等价于 `onboard`，但显式表达"刷新旧产物"。
  - `sovei project onboard`：执行前读旧 `business-map.json.scannerVersion`，若与当前 `VERSION` 不同，明确告知"本次将整体刷新为 vX"。
