# Changelog

All notable changes to the Sovei workflow engine are documented in this file.

## [Unreleased]

_No changes yet._

## [2.2.3] - 2026-08-05

### Fixed

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
