# Load Summary — 029-feature-summary

> Feature：`sovei feature summary <id>` — 从 Feature 事件流 + 各阶段产物生成聚合人可读视图（P1-2）
> 阶段：load（已完成探索）

## 1. 代码库现状摘要

Sovei 引擎位于 `packages/sovei-core/`，CommonJS 单文件产物 `dist/release/sovei.cjs`，零运行时依赖。相关模块：

- **CLI 层** `src/cli/commands/`：每个命令族一个文件，`src/cli/index.ts` 统一 `registerXxxCommands(program)` 注册。已有 `feature.ts` 实现 `feature archive <id>`（Feature 026，P1-1）。
- **存储抽象** `src/storage/types.ts`：`StorageBackend` 接口（`read/write/list/listRecursive/exists/isDirectory/delete`），文件系统实现 + 内存实现（测试用 `MemoryStorage`）。**红线**要求写治理数据必须走 `StorageBackend`（原子写 + 锁），禁止裸 `node:fs` 覆盖写。
- **配置加载** `src/config/loader.ts`：`getFeaturePath(config, featureId)` 返回 `specs/<featureId>`。
- **Feature 数据目录** `specs/<featureId>/`：含 `workflow-state.yaml`（状态机）、`workflow-events.jsonl`（追加式事件流）、各阶段产物 `.md` 文件。
- **测试** `test/*.test.mjs`：node:test + MemoryStorage 构造 fixture，直接 import `dist/` 产物测试。已有 `feature-archive.test.mjs` 是最近的同族测试范式。

## 2. 与当前 Feature 相关的已有实现

- **P1-1 `feature archive`**（`feature.ts`）：已完成，`archiveFeature(storage, featurePath, featureId)` 将过程产物折叠到 `_archive/`。是 summary 的"兄弟"命令，共享 `getFeaturePath` / StorageBackend / CLI 注册模式。
- **工作流事件流** `workflow-events.jsonl`（每行一个 JSON）：事件类型含 `BOOTSTRAP`、`STAGE_PREPARED`、`STAGE_COMPLETE`（带 `artifacts[]`）、`TASK_COMPLETE`（带 `taskId`+`artifact`）、`OVERRIDE_CONFIRM`（带 `stage`/`role`/`reason`）。是 summary 重建"需求→决策→变更→验证→经验"故事线的核心数据源。
- **工作流状态** `workflow-state.yaml`：`status`、`completedStages[]`、`completedTaskIds[]`、`riskLevel`、`featureId`。
- **阶段产物 → 文件映射**（12 阶段）：load→`load-summary.md`；grill→`decision-log.md`；wayfind→`wayfinder.md`；spec→`spec.md`+`reconciliation.md`；scope→`scope.md`+`coverage-matrix.md`；plan→`plan.md`；tasks→`tasks.md`；implement→`change-manifest.md`；converge→`convergence-report.md`；verify→`evidence.md`；learn→`learning-report.md`；sync→`sync-report.md`。
- **决策日志格式** `decision-log.md`：`## D1: <问题>` + `**决策:**` / `**理由:**` / `**被拒绝方案:**` / `**状态:** ✅ 已决`。可解析提取"关键决策"。
- **同步报告格式** `sync-report.md`：`## 目标` + `## 同步状态`（表格）+ `## 结论`。

## 3. 潜在风险点

- **产品文件不存在时降级**：Feature 可能尚未 complete（summary 应能对 in_progress 也生成部分视图），且某些阶段产物可能缺失（如 reopen 后归档）。需对缺失产物做防御性处理，不能崩溃。
- **归档后的产物读取**：archive 后过程产物在 `_archive/` 子目录，summary 需能同时读取顶层持久文件 + `_archive/` 内的过程产物，否则归档后的 Feature 无法生成完整视图。
- **零运行时依赖约束**：不能引入 yaml/jsonl 解析库。`workflow-state.yaml` 需用轻量正则解析（`archiveFeature` 已用 `match(/^status:\s*(\S+)/m)` 先例）；`workflow-events.jsonl` 逐行 `JSON.parse`。
- **红线 STORAGE_WRITE_DISCIPLINE**：summary 生成的 `summary.md` 是 Feature 产物，须通过 `StorageBackend.write` 写入（或直接复用引擎的写路径），不得裸 `node:fs`。
- **输出定位**：`summary.md` 应放 Feature 目录顶层（与 archive 白名单持久文件并列），还是 `_archive/`？需在 grill/spec 决策。倾向放顶层（它是跨阶段聚合的人可读产物，非单阶段过程产物），但可能影响 archive 白名单判断。

## 4. 与 P1-2 目标对齐

DEV_BACKLOG §2 P1-2 明确：`sovei feature summary <id>` 从事件流 + 各阶段产物生成聚合 `summary.md`，包含需求→决策→变更→验证→经验的完整故事线；替代"独立 docs 系统"思路，先做 CLI 生成静态 .md，零运行时依赖。本 Feature 即实现此命令。
