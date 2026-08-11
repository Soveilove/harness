# 学习报告

> 由 Sovei 阶段生成：learn
> Feature：008-review-gate-alignment

## 观察分类

### O1：AGENTS.md 由 project init 硬编码生成，手动修改会被覆盖（candidate 晋级提案）
- **来源 Feature**：008-review-gate-alignment
- **证据**：`project.ts:182-214` 硬编码生成 AGENTS.md。本 Feature 手动修改 AGENTS.md 澄清门禁语义后，若重新运行 `project init`，修改会被硬编码版本覆盖，澄清内容丢失。
- **适用范围**：通用（sovei 维护）。
- **建议目标**：candidate（pitfall 类）：修改 AGENTS.md 这类由命令生成的文档时，需同步更新其生成模板（`project.ts`），否则手动改动在 `project init` 重跑时丢失。或考虑让 AGENTS.md 从单一事实源派生。
- **状态**：candidate（不直接晋级 stable）。

### O2：文档-实现脱节类问题优先文档澄清而非加代码校验（candidate 晋级提案）
- **来源 Feature**：008-review-gate-alignment
- **证据**：门禁"缺口"初判为代码缺陷（confirm 不校验 review 产物），但深入分析后确认是文档误导——阶段产物已由 completeStage 强制校验，confirm 校验是冗余的。最终仅文档澄清解决，避免了过度设计（加冗余校验 + 破坏小 feature 流程）。
- **适用范围**：通用（工程决策）。
- **建议目标**：candidate（rule 类）：遇到"流程缺口"时，先确认是否已有其他环节强校验该依据，避免在确认入口重复校验；文档-实现脱节优先澄清文档。
- **状态**：candidate（不直接晋级 stable）。

## 未决/拒绝模式
- 无。

## 结论
本 Feature 沉淀 2 条观察：AGENTS.md 需同步 project.ts 模板、文档澄清优先于代码校验。均标注 candidate，需后续 Feature 证据后经人工审查方可晋级 stable。
