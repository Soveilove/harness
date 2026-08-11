# 学习报告

> 由 Sovei 阶段生成：learn
> Feature：007-template-remediation

## 观察分类

### O1：产物正文提及模板占位符字面量会被 validateProduced 误判（candidate 晋级提案）
- **来源 Feature**：007-template-remediation
- **证据**：在 decision-log.md 正文中描述 `getArtifactTemplate` 时写到了模板占位符字面量，导致 `validateProduced`（`artifacts/repository.ts:59` 用 `content.includes(占位符)` 判断）误判"仍是模板"，`completeStage` 拒绝通过 grill。清除正文中的精确字面量后才通过。
- **适用范围**：通用（sovei 产物校验边界）。
- **建议目标**：candidate（rule 类）：产物正文中避免出现模板占位符字面量；或改进 `validateProduced` 的检测逻辑（如仅检测模板头部标记而非全文 includes）。
- **状态**：candidate（不直接晋级 stable）。

### O2：删除死代码需同步文档（仅项目适用）
- **来源 Feature**：007-template-remediation
- **证据**：删除 `harness/templates/sovei/` 死模板后，`harness/index.md` 目录说明仍声称"壳（文档模板）"，需同步更新为"引擎内嵌生成"。死代码清理必须连带文档引用清理，否则文档-实现脱节。
- **适用范围**：项目专用（harness 维护规范）。
- **建议目标**：记录为维护规则。
- **状态**：仅项目适用。

### O3：历史遗留死模板根因（架构债务观察）
- **来源 Feature**：007-template-remediation
- **证据**：commit `0728305` 引入外部模板，后引擎演进为内嵌 `getArtifactTemplate`，但未清理旧模板，形成死代码。提示：功能演进时需同步清理被替代的旧实现。
- **适用范围**：通用。
- **建议目标**：candidate（pitfall 类）：引入新实现替代旧实现时，应同步清理被替代路径，避免死代码堆积。
- **状态**：candidate（不直接晋级 stable）。

## 未决/拒绝模式
- 无。

## 结论
本 Feature 沉淀 3 条观察：模板占位符误判边界、死代码清理需同步文档、历史遗留死模板根因。均标注 candidate/仅项目适用，需后续 Feature 更多证据后经人工审查方可晋级 stable。
