# Changelog

All notable changes to the Sovei workflow engine are documented in this file.

## [2.6.0] - 2026-08-13

### Added

- **Feature 拆分为子变更**：一个 Feature 可拆分为多个子变更并行开发（`feature split`）。共享前段（load→scope）、分叉后段（plan→verify）、聚合收尾（learn→sync）。子变更间支持依赖声明；聚合门禁确保所有子变更 merged 后父 Feature 才进入 learn。scope 阶段提示契约新增"拆分评估"段，AI 可主动建议拆分。
- **init 产物改名 harness → sovei-flow**：init 产物目录从 `harness/` 改为 `sovei-flow/`。新增 `sovei project migrate` 命令一键迁移已初始化项目。
- **agents 与 skills 分开存放**：init 新增 `sovei-flow/agents/` 目录存放工作流阶段指令，与 `sovei-flow/skills/` 分开。
- **Skills 基座**：init 新增 `sovei-flow/skills/base/` 目录，预置 6 个技能模板（vue2/vue3/react/cli/python/quant），按项目技术栈注入。
- **Codex 技能包适配**：Codex 适配器新增 12 节点按钮 + `skillPackage`（聚合技能文件 `sovei-workflow.md`），让 Codex 桌面版通过技能 description 主动唤起工作流。
- **版本更新提示机制**：CLI 启动时检测 npm 最新版本。两类提示：①提示更新（简单通知）；②建议更新有新能力支持（列出能力清单）。24h 缓存，零运行时依赖，输出到 stderr 不污染 JSON。`SOVEI_NO_UPDATE_CHECK=1` 可关闭。

### Changed

- **开源许可**：从专有许可改为 MIT License，正式开源。
- **README 重写**：npm 发布说明和仓库 README 全面更新，覆盖 sovei-flow 目录结构、Feature 拆分命令、Skills 基座、版本提示等新能力。

## [2.5.6] - 2026-08-07

### Fixed

- **文档适配器不再生成重复规则 id**：`scanProjectRuleCandidates` 此前对同一文档章节内重复出现的相同语句不先去重，导致 `idFor` 对相同输入生成相同 id，写入 `adapted.rules.json` 后违反 id 唯一性，触发 `Duplicate project rule id` 加载错误。现改为返回前按 id 去重（保留首个出现），从源头杜绝重复。
- **重复规则 id 报错信息可诊断**：`repository.load()` 遇到同一文件内重复 id 时，此前打印两个相同路径（误导性）。现区分「同一文件内重复规则 id（附 title）」与「跨文件冲突（保留双路径）」。
- 补充回归测试：同章节重复语句只生成一条候选、同文件重复 id 报错含「同一文件内」提示。`node --test` 109 用例通过。

## [2.3.3] - 2026-08-06

### Fixed

- **`project init` 已存在项目不再抛错**：此前 `project init` 检测到 `project.config.json` 已存在时在第 165 行直接抛 `already exists`，导致 AGENTS.md 存在性保护永远无法触达。现改为检测到已存在项目且非 `--force` 时，输出同步提示并保留现有声明（AGENTS.md 与 config 均不被覆盖）；`--force` 仍强制重新初始化。

## [2.3.2] - 2026-08-06

### Fixed

- **工作流拓扑断链修复**：`spec` 阶段的 `requiredArtifacts` 此前漏了 `wayfinder.md`，导致 wayfind 的决策消歧产物未被 spec 消费。现补齐依赖（`decision-log.md` + `wayfinder.md`），并统一 `index.ts` 与 `workflow-engine.ts` 的 contract 声明：
  - `grill.nextStage` 对齐为 `wayfind`（与 `stageOrder` 一致）。
  - `spec.producesArtifacts` 补上 `reconciliation.md`（此前声明与 `postExecute` 强制校验不一致）。
- **死模板清理**：删除 `harness/templates/sovei/` 下 14 个从未被引擎消费的模板文件（引擎产物模板由 `getArtifactTemplate` 内嵌生成）。同步更新 `harness/index.md` 目录说明。
- **`project init` 覆盖保护**：`project init` 检测到 `AGENTS.md` 已存在且非空时不再无条件覆盖，改为输出提示指令交由用户/AI 决定是否同步最新 Sovei 声明；`--force` 仍强制覆盖。
- **测试回归修复**：删除 `project.test.mjs` 中引用已移除模板文件的失效测试，新增 AGENTS.md 存在性保护断言。

### Changed

- **文档澄清**：`AGENTS.md` 明确确认门禁的依据是阶段产物（`reconciliation.md` / `evidence.md`）而非 review 文件；`review-pack` 是可选的深入对齐工具，`workflow confirm` 与 `review-pack import` 等价。

## [2.3.1] - 2026-08-06

### Added

- **产物版本一致性守卫**：`business-map.json` / `redlines-seed.json` 内嵌的 `scannerVersion`
  此前「只写不读」，升级后旧产物是否过时完全靠人工记忆。现新增：
  - `sovei project rescan`：一等公民的重扫入口，明确「刷新旧产物」，等价于 onboard。
  - 读侧守卫：`project map`、`governance redline list/render` 在旧产物下打印醒目警告并阻断，
    传入 `--force` / `--refresh` 可显式放行读取旧产物。
  - 写侧守卫：`project onboard` / `rescan` 检测到旧产物时明确打印「本次将整体刷新为 vX」。
- **守卫加固**：`project status`、`knowledge list` 为健康检查/只读查询，不消费 onboarding 产物，
  不再被旧产物版本阻断（移除过度守卫）。

### Changed

- **默认扫描深度 10 → 20**：上一版在 2.3.0 把默认深度提到 10，但企业级项目
  （如 `src/views/placement/...` 多层页面嵌套）目录最深可达 11+ 层，深度 10 仍会触发
  「部分覆盖」。提升到 20 后默认即可完整覆盖绝大多数仓库，无需每次手传 `--depth`。

## [2.3.0] - 2026-08-05

### Fixed

- **扫描器过滤构建产物 / 静态资源 / 哈希 chunk**：`server/views`、`vendor`、`public/assets`
  等产物目录整体跳过；哈希命名的构建 chunk（`index-C6asO8Wa.js`）、图片、CSS、`.d.ts`
  声明不再进入目录地图、业务能力图与红线候选。企业级项目不再被几百个哈希 chunk 污染
  业务地图（如 Koa 静态托管的 `server/views/assets/*`）。
- **测试套件误判**：`detectPatterns` 不再用 `path.includes('spec')` 子串匹配，改为
  精确目录名匹配；`specs/` 文档目录、`server/views` 不再被误判为「Test suite present」。
  仅当存在真实测试文件（`*.test.*` / `*.spec.*` / `__tests__` 等）时才判定。

### Changed

- **默认扫描深度 4 → 10，条目上限 20000 → 50000**：适配深层嵌套的企业级业务目录
  （如 `src/views/placement/...` 多层页面），且因构建产物已被过滤，加深不会引入大量噪音。
- **业务地图最大源码读取数 500 → 3000**：企业级项目源码文件多（实测单项目 500+ 候选源
  码文件即触顶），3000 可覆盖更复杂的大型仓库，避免业务能力被截断。
- **`ScanCoverage` 新增 `filteredDiscovered`**：记录被过滤规则排除的条目数，覆盖报告更透明。

### Fixed (from 2.2.3)

- **`sovei project onboard --evidence-only` 真正落盘证据文件**：此前该模式只打印
  AGENT ONBOARDING GUIDE 便返回，从不写入 `business-map.json`、`redlines-seed.json`
  与 `knowledge/*.json`，而指引却宣称这些文件「已生成」，导致 Agent 只能靠读源码硬推。
  现在 evidence-only 与完整 onboard 统一经由 `writeEvidenceFiles()` 写盘三类证据，
  指引中的文件路径为真实存在的落盘产物。

### Changed

- **`sovei governance redline add` 新增 `--origin` 参数**：可标注红线来源
  （`manual` / `scanner-seed` / `pm-confirmed` / `agent-generated`），默认 `manual`。
- **`sovei governance redline list` 显示停用红线**：非激活红线追加 `[INACTIVE]` 标记。
- **`FilesystemStorage` 路径越界防护**：所有读写路径经 `path.resolve` 校验必须落在
  项目根目录内，闭合目录穿越攻击面（`PATH_TRAVERSAL_CONTAINMENT`）。

## [2.2.2] - 2026-08-05

## [2.2.1] - 2026-08-05

## [2.2.0] - 2026-08-05

### Added

- **Agent collaboration layer**: three-layer architecture for agent-assisted
  business analysis (scripts collect evidence, agents make judgments, humans
  make decisions).
- **Reconciliation module** (`src/review/`): structured alignment document
  (`reconciliation.md`) produced during spec stage. Parser extracts typed
  data; renderer produces `tech-review.md` (for tech lead) and
  `product-review.md` (for PM) as two views of the same source.
- **Cross-feature context**: `sovei context build --cross-feature` loads
  other features' `decision-log.md` as suggested context items, so agents
  can reconstruct what prior features did.
- **Confirmation gates**: `STAGE_COMPLETE` auto-blocks based on risk level.
  S2/S3 block after spec; all risk levels block after verify.
  `sovei workflow confirm` records signatures; `sovei workflow override-confirm`
  overrides with audit trail.
- **Review pack CLI**: `sovei governance review-pack generate` renders
  tech/product views from reconciliation; `sovei governance review-pack import`
  imports PM-signed product-review and records the confirmation gate.
- **Onboard evidence mode**: `sovei project onboard --evidence-only` collects
  raw evidence without generating candidates. Prints agent analysis steps.
- **AGENTS.md auto-generation**: `sovei project init` writes a Sovei
  declaration to AGENTS.md — thin pointer with commands and stage order,
  not prompt duplication.
- **Redline origin expansion**: `pm-confirmed` (PM-signed, bypasses evidence
  count) and `agent-generated` (agent-analyzed, still candidate lifecycle).

### Changed

- **Spec stage prompt** enhanced: need translation, current-state restoration
  (reading code + cross-feature decision logs), solutions and costs, question
  extraction ([product]/[tech] roles), acceptance criteria.
- **Spec stage contract** now produces `reconciliation.md` alongside `spec.md`.
- **WorkflowState** adds `pendingConfirmations` field.
- **WorkflowEvent** adds `CONFIRM` and `OVERRIDE_CONFIRM` event types.

### Why (design context)

- Scripts (regex + keyword) produced 34 "capabilities" where half were noise
  (test fixtures as capabilities, DI tokens matched as "authentication").
  Scripts can only find what they're preconfigured to match.
- Rejected OpenSpec-style per-agent skill file generation: Sovei is a runtime
  engine, not a prompt library. Static files would drift on every engine
  evolution. Prompts stay runtime-generated via `context build`.
- Reconciliation is the core insight: PM may not know what the previous
  feature did ("you restored filtering" — but F-002 also changed the API
  and UI). Agent must reconstruct prior context before writing spec.
- Confirmation gates are modeled as blockers, not a 13th stage, to preserve
  the 12-stage contract.

## [2.1.2] - 2026-07-23

### Fixed

- Release script: added post-publish version verification retry to avoid
  false failures from metadata propagation delay.
- Release script: removed OTP input, switched to `npm publish` for
  simplified flow.
- Release script: replaced `pnpm publish` with `npm publish` to avoid git
  checks and skip scripts.

### Changed

- Simplified pnpm-lock: removed unnecessary dependency entries and engine
  version constraints.

## [2.1.0] - 2026-07-22

### Added

- **Redline human-review view** (`redlines.md`): auto-generated read-only
  Markdown view rendering active/inactive redlines, seed candidates, and
  change history. Single source of truth stays in `redlines.json` +
  `redline-events.jsonl`.
- **`sovei governance redline update`**: updates redline content or human
  review fields (reviewer, rationale, scope, examples, owner).
- **`sovei governance redline render`**: regenerates the human-review view.
- **Redline enrichment fields**: `rationale`, `scope`, `examples`, `owner`,
  `origin`, `reviewedBy`, `reviewedAt`.
- **CI workflow**: build verification, license file, dependency inlining
  and concurrency safety checks.
- **`verify-package.mjs`**: encoding guard checking all files in the
  published package are BOM-free valid UTF-8.

### Changed

- Version source unified: single `package.json` version read at runtime via
  `createRequire`, eliminating manual version sync across files.
- All CLI command descriptions localized to Simplified Chinese; missing
  `.description()` calls filled in.
- All source files, test files, and README standardized to UTF-8 without BOM.
- `pnpm-workspace.yaml`: fixed `onlyBuiltDependencies`, removed invalid
  `allowBuilds`.
- `package.json`: removed deprecated pnpm fields, fixed trailing comma.
- Cleaned up dead code in `context.ts` (unused `loadSnapshot` import).

## [2.1.0-dev.2] - 2026-07-20

### Added

- **Governance redlines**: three initial business redlines (authentication
  required, billing approval, silent data loss protection).
- **Multi-source redline scanner**: governance docs, spec files, and code
  surfaces with different confidence levels.
- **Business map scanner**: static-analysis topology map with capabilities,
  dependencies, contracts, and redline associations.
- **IDE adapter registry**: Codex, Claude Code, CodeBuddy, Trae — each with
  capability profiles (nativeCodeSearch, contextDelivery, toolExecution,
  mcp, cli).
- **`sovei agent list/show`**: display registered adapter capabilities.
- **`sovei governance redline import`**: batch import from JSON seed file.
- **`sovei context build`**: assembles versioned context pack with required
  (active redlines, stable rules, feature contracts) and suggested (candidate
  knowledge, advisory rules) items.
- **Chinese localization**: all Sovei templates localized to Simplified
  Chinese.
- **Project rule adaptation**: scans `.cursorrules`, `CLAUDE.md`, `AGENTS.md`
  and adapts as scoped candidate rules.

## [2.1.0-dev.1] - 2026-07-18

### Changed

- Prepared 2.1 development release and documentation.
- Updated Sovei 2.1 docs with evolutionary architecture governance notes.

## [2.0.0] - 2026-07-16

### Added

- **TypeScript rewrite**: migrated from PowerShell/Python scripts to a
  proper TypeScript engine (`sovei-core`).
- **State machine**: pure reducer function + event sourcing. All state
  changes go through `EventStore` append + replay. No direct mutation.
- **12-stage workflow**: load, grill, wayfind, spec, scope, plan, tasks,
  implement, converge, verify, learn, sync. Each stage executes exactly
  one step per invocation.
- **Typed JSON knowledge management**: Zod-validated entries with lifecycle
  (candidate, pending, stable, deprecated). Single observations cannot
  bypass to stable.
- **`defineStage()` plugin system**: lifecycle hooks (preExecute, execute,
  postExecute, cleanup) with typed input/output contracts.
- **DI container**: `providers/container.ts` with `TOKENS` injection.
- **Shell/material separation**: `packages/sovei-core/` is the shell
  (persists across projects), `harness/project/` is the material (cleared
  on project switch).
- **`reopen`**: invalidates a completed stage and its successors, increments
  revision. Archives stale artifacts to `history/`.
- **Wayfinder**: decision map with tickets, fog of war, frontiers, claims,
  and resolution modes.
- **Architecture governance**: scan/status/inspect/accept/dismiss/check
  commands. Automatic scans create candidates and snapshots only; never
  auto-rewrites business code.
- **Change control**: material change requests with redline assessment
  matrix, authorization fields, and dimension-based minimum stage routing.

## [1.1] - 2026-07-14

### Added

- **Reopen**: reopen completed workflow stages.
- **Full 12-stage workflow**: all stages from load to sync implemented.
- **CodeBuddy slash commands**: per-stage command files.
- **Workflow validation scripts**: validate and reopen workflow state.

## [1.0] - 2026-07-10

### Added

- Initial Sovei workflow concept with PowerShell/Python scripts.
- Knowledge distillation skill.
- Knowledge loader with keyword-based matching.
- Basic workflow state tracking via YAML files.
