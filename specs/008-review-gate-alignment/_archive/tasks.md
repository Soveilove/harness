# 任务清单

> 由 Sovei 阶段生成：tasks
> Feature：008-review-gate-alignment

- [ ] TASK-001: 更新 AGENTS.md 澄清门禁确认与 review-pack 关系

---

## TASK-001：更新 AGENTS.md 澄清门禁与 review 关系

- **依赖**：无
- **文件范围**：`AGENTS.md`
- **修改内容**：
  1. 在"Confirmation Gates"段落（第 24-28 行）追加：
     - 确认依据是阶段产物（spec 确认基于 reconciliation.md，verify 确认基于 evidence.md），**不是** review 文件。
     - `workflow confirm` 是标准确认路径；`review-pack import` 是便捷的产品确认入口（等价，不强制）。
  2. 在"Reconciliation"段落末尾（第 38 行后）追加：
     - review-pack 是**可选**的深入对齐工具，不是门禁强制前置。
- **验收标准**：阅读 AGENTS.md 能明确：确认依据是阶段产物、review-pack 可选、confirm 与 review-pack import 均为有效入口。
- **验证方式**：读取 AGENTS.md 核对修改内容；无代码改动。
