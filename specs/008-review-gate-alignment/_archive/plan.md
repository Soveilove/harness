# 实施计划

> 由 Sovei 阶段生成：plan
> Feature：008-review-gate-alignment

## 模块边界

修改面封闭在 1 个文件：`AGENTS.md`。无代码改动。

## 数据流

文档澄清不涉及运行时数据流。修改后的 AGENTS.md 将准确指导使用者理解门禁确认与 review-pack 关系。

## 契约修改（AGENTS.md 具体改动）

### 第 24-28 行（Confirmation Gates）追加澄清
在现有 3 条说明后，追加：
- 确认依据是阶段产物（spec 确认基于 reconciliation.md，verify 确认基于 evidence.md），**不是** review 文件。
- `sovei workflow confirm` 是标准确认路径；`sovei governance review-pack import` 是便捷的产品确认入口（等价，不强制）。

### 第 38 行（Reconciliation 末尾）追加
- review-pack 是**可选**的深入对齐工具（tech-review/product-review 用于 reconciliation 的跨角色评审），不是门禁强制前置。

## 迁移策略
- 无数据迁移。文档修改对已完成 feature 无影响。

## 验证方式
1. 阅读 AGENTS.md，确认门禁段落准确反映：
   - verify 后始终确认、spec 后仅 S2/S3 确认
   - 确认依据是阶段产物
   - review-pack 可选
2. 运行时：`workflow confirm` 行为不变（无需验证，未改代码）。
