# 决策日志

> 由 Sovei 阶段生成：grill
> Feature：009-artifact-contract-alignment
> 目的：评估历史产物契约回填与 spec 颗粒度统一

## 待分析问题清单（已核实事实）

### 事实核实（源码/仓库直接查证）

#### D1. 引擎 spec 模板是唯一事实源，无固定章节结构
- **类型**：事实核实
- **内容**：`workflow-engine.ts:485-508` `getArtifactTemplate` 对 spec.md 生成标题"功能规格"（`:489`）+ 提示契约 + 占位符，**不强制章节结构**。产物结构由 spec 阶段 prompt 决定（`index.ts:182-190`），该 prompt 已明确定义：需求翻译、还原现状、方案与代价、疑问提取、定义验收标准。
- **证据**：`workflow-engine.ts:489`、`index.ts:182-190`
- **状态**：已决

#### D2. spec 颗粒度不一致的根源（harness 死模板）已被 007 消除
- **类型**：事实核实
- **内容**：此前"spec 模板/产物结构不一致"源于 `harness/templates/sovei/spec-template.md`（结构为"问题/用户故事/功能需求"），与引擎模板/prompt 不一致。007-template-remediation 已删除该死模板。当前引擎模板 + prompt 是唯一事实源，结构由 prompt 定义，**无双重不一致源**。
- **状态**：已决

#### D3. 历史 feature（001/002）缺 reconciliation.md
- **类型**：事实核实
- **内容**：001/002 目录无 reconciliation.md（spec 阶段产出物契约 006 才引入 reconciliation.md）。001/002 已 completed（事件流确认），不受运行时校验。
- **状态**：已决

#### D4. 历史 feature 已 completed，回填不影响运行时
- **类型**：事实核实
- **内容**：回填 reconciliation.md 到 001/002 是**纯文档补充**，不改变已 completed 状态，不触发任何校验。价值仅在于：跨 feature 对齐分析（`context build`）可读取 reconciliation。
- **状态**：已决

### 工程判断（问题界定）

#### D5. "spec 颗粒度问题"已不存在（被 007 解决）
- **类型**：可推断决策
- **内容**：最初分析所指的"spec 颗粒度不一致"是指 harness 模板 vs 引擎模板/prompt 的矛盾。该矛盾已随 007 删除死模板而消除。当前 spec 产物结构由 prompt 明确定义，无新的颗粒度问题。
- **结论**：**不再需要修复**。若强制统一"AI 产出的章节措辞"，属于输出风格规范而非契约缺陷，收益低且可能过度约束。
- **状态**：已决

#### D6. 历史 reconciliation 回填的价值评估
- **类型**：可推断决策
- **内容**：给 001/002 补 reconciliation.md：
  - **价值**：跨 feature 对齐分析更完整；历史 feature 与新契约语义一致。
  - **风险**：001/002 的原始需求决策背景不完整掌握，AI 补写可能**编造**不准确的"还原现状/方案代价"，反而污染历史记录。违反 reconcile.md 的"还原现状"真实性原则。
  - **收益**：低。已 completed feature 不受任何运行时影响，跨 feature 对齐通常基于 decision-log（001/002 有）。
- **结论**：**不建议回填**。为已完成的历史 feature 补 reconciliation 是低价值且有编造风险的操作。正确做法是通过后续 feature 的 `context build` 自然覆盖，而非回改历史。
- **状态**：已决

## 结论

009 的两个候选问题经深入核实后：
1. **spec 颗粒度问题**——已被 007 解决，无需再修（D5）。
2. **历史 reconciliation 回填**——低价值且有编造风险，不建议做（D6）。

**因此，本 Feature 无实际可执行修复项。建议终止本 Feature（cancel），不产出无价值的改动。**

这与工作流"不做无价值的事"的原则一致。已通过 007/008 完成真实修复，009 的两个伪问题不应再消耗工作流资源。

## 未决项清单
- 无。D1-D6 均已核实，结论明确：本 Feature 应终止。
