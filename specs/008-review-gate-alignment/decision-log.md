# 决策日志

> 由 Sovei 阶段生成：grill
> Feature：008-review-gate-alignment
> 目的：修复门禁系统与 review 流程的对齐问题

## 待分析问题清单（已核实事实）

### 事实核实（源码/事件流直接查证）

#### D1. verify 后门禁始终触发，且是后加入的
- **类型**：事实核实
- **内容**：`state-machine.ts:78` `needsVerifyGate = event.stage === 'verify'`，verify 完成后始终置 blocked，需 product+tech 确认。
- **证据**：001 的事件流（`specs/001-monorepo-onboarding/workflow-events.jsonl`）中 verify 后直接到 learn/sync，**无 CONFIRM 事件、未阻塞**；006/007 中 verify 后 blocked 需 confirm。说明门禁逻辑是 001 之后引入的。
- **状态**：已决

#### D2. spec 后门禁仅 S2/S3 触发
- **类型**：事实核实
- **内容**：`state-machine.ts:77` `needsSpecGate = event.stage === 'spec' && (riskLevel === 'S2' || 'S3')`。S1 不触发 spec 门禁。
- **状态**：已决

#### D3. confirmGate 不校验确认依据产物
- **类型**：事实核实
- **内容**：`workflow-engine.ts:332-356` `confirmGate` 只追加 `CONFIRM` 事件，**不校验任何产物**存在。`overrideConfirmation` 同样只追加 `OVERRIDE` 事件。
- **状态**：已决

#### D4. review-pack 是可选治理层，与门禁确认路径重叠
- **类型**：事实核实
- **内容**：`review-pack generate`（`governance.ts:201-225`）从 reconciliation.md 生成 tech-review/product-review；`review-pack import`（`governance.ts:227+`）调用 `confirmGate` 记录产品确认。但 `workflow confirm`（`workflow.ts:204-223`）也可直接确认，**不要求 review 产物**。
- **证据**：001/002/006/007 均无 tech-review/product-review，但都通过了 verify 门禁。004/005 有 review 产物（走了 review-pack）。
- **状态**：已决

#### D5. 阶段产物已由阶段完成强制校验
- **类型**：事实核实
- **内容**：verify 完成时 `completeStage` 校验 evidence.md 存在；spec 完成时校验 spec.md + reconciliation.md（006 修复后）。所以门禁触发时核心依据产物已存在。
- **状态**：已决

### 问题界定（修正后的核心问题）

#### D6. 门禁与 review 的语义混乱（文档误导）
- **类型**：可推断决策
- **内容**：AGENTS.md 描述 "After verify... product + tech confirmation required"，并强调 review-pack（tech-review/product-review）是确认流程。但实际：
  - review-pack 是**可选**的额外评审层，不强制；
  - 门禁的核心确认依据是阶段产物（spec/evidence），非 review 文件；
  - 两条确认路径（`workflow confirm` vs `review-pack import`）并存且语义不清。
- **结论**：这是**文档与实现脱节**问题，而非代码缺陷。强制 review 产物会破坏小 feature（S1 无 spec 门禁，verify 再强制 review 过重）。
- **状态**：已决

## 范围性决策（已由开发者裁决）

#### Q1. verify 门禁确认时，是否要求核心依据产物存在（evidence.md）？
- **决策**：B。不改代码，只做文档澄清。
- **理由**：verify/spec 完成时已由 `completeStage` 强制校验 evidence.md / reconciliation.md，门禁触发时依据必然存在。在 `confirmGate` 加校验是冗余的，且会引入异常路径复杂度（如 override 场景）。这是"文档-实现脱节"问题，代码本身无缺陷。

#### Q2. review-pack 与 confirm 的关系如何界定？
- **决策**：A。文档澄清为可选。
- **理由**：强制走 review-pack 会破坏小 feature（S1 无 spec 门禁，再强制 review 过重）。review-pack 是深入的治理对齐工具，适合 S2/S3 高风险的 reconciliation 评审；`workflow confirm` 是标准门禁确认。保持灵活性，消除 AGENTS.md 误导即可。

## 修复方向汇总
1. 不改 `confirmGate` / `overrideConfirmation` 代码（Q1=B）。
2. 修改 AGENTS.md / harness/index.md，澄清：
   - verify 后（始终）与 spec 后（S2/S3）需 product+tech confirm，confirm 依据是阶段产物（evidence.md / reconciliation.md）。
   - review-pack 是可选的深入对齐工具，不强制；`workflow confirm` 与 `review-pack import` 都是有效的确认入口。
3. 无代码改动，仅文档对齐。
