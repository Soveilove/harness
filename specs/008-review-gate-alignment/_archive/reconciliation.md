# Reconciliation: 008-review-gate-alignment 澄清门禁确认与 review-pack 关系

## Need Translation

**需求来源**（开发者）："门禁与 review 存在语义混乱——AGENTS.md 把 review-pack 描述成确认流程，但实际 confirm 不要求 review 产物，review-pack 是可选的。"

**技术理解**：确认门禁（spec 后 S2/S3、verify 后始终）由 `state-machine.ts:77-78` 触发并置 blocked，`confirmGate`（`workflow-engine.ts:332-356`）记录 CONFIRM 事件解除。门禁的确认依据是阶段产物（spec 完成强校验 reconciliation.md、verify 完成强校验 evidence.md），而非 review 文件。review-pack（tech-review/product-review）是 `governance.ts:201-237` 提供的可选治理工具。文档（AGENTS.md）把 review-pack 描述成确认流程必需，与实际不符。

## Current State

- 门禁触发：spec 后仅 S2/S3（`state-machine.ts:77`），verify 后始终（`:78`）。verify 后门禁是 001 之后引入的（001 事件流无 CONFIRM）。
- `confirmGate`：只追加 `CONFIRM` 事件，不校验 review 产物（`workflow-engine.ts:332-356`）。
- `review-pack generate`：从 reconciliation.md 生成 tech-review.md + product-review.md（`governance.ts:201-225`）。
- `review-pack import`：调用 confirmGate 记录产品确认（`governance.ts:227-237`）。
- 现状：001/002/006/007 无 review 产物但也通过了 verify 门禁；004/005 走了 review-pack。两条路径并存。
- AGENTS.md 第 27-29 行强调 review-pack 是确认流程，第 33-38 行描述 reconciliation 与 review-pack，未明确其可选性。

## Solutions

### Solution A: 文档澄清（选定）
- 在 AGENTS.md 确认门禁段落明确：确认依据是阶段产物；review-pack 可选；confirm 与 review-pack import 都是有效入口。
- 在 harness/index.md 对齐同样说明。
- **优点**：消除误导，零代码风险，不破坏小 feature 流程。
- **代价**：低。仅文档改动。

### Solution B: 强制 review 产物
- confirm verify/spec 时要求 tech-review/product-review 存在。
- **优点**：强制深入评审。
- **代价**：高。破坏小 feature（S1 无 spec 门禁，verify 强制 review 过重）；需改代码 + 迁移历史；与"review 可选"的现状冲突。已拒绝。

### Solution C: 不改
- **优点**：零改动。
- **代价**：文档误导仍在，开发者/使用者会误以为必须走 review-pack。已拒绝。

**选定**：Solution A。

## Questions

### [tech] Q1: confirm 是否校验依据产物？
- recommendation: 否（B）。阶段完成已强校验 reconciliation.md/evidence.md，confirm 无需重复校验。避免异常路径复杂度。
- options: [否，不改代码] [是，加轻量校验]

### [product] Q2: review-pack 是否作为门禁强制项？
- recommendation: 否（A）。review-pack 是可选深入对齐工具，`workflow confirm` 是标准确认路径。
- options: [否，可选] [是，强制]

## Sign-off
- [x] product: by: developer date: 2026-08-06 ref: 用户授权开发者裁决 Q1/Q2
- [x] tech: by: developer date: 2026-08-06 ref: 源码/事件流事实 D1-D6 已核实
