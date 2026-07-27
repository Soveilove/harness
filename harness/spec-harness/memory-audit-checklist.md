# 记忆审计清单（Memory Audit Checklist）

> 定期审计 harness 知识库，发现过时、矛盾、冗余条目。
> 建议频率：每月 1 次，或大版本合并后触发。

## 审计维度

### A1: 时效性 — 条目是否还有效

逐条检查以下文件中的条目，判断是否已过时：

- [ ] `project/memory/vue-pitfalls.md` — 每个 pitfall 是否仍然存在（代码是否已重构/删除）
- [ ] `project/memory/design-decisions.md` — ADR 状态是否需更新（试运行→已采纳 / 已采纳→已废弃）
- [ ] `project/rules/implementation-rules.md` — staging 规则是否够 3 次命中可转 stable；deprecated 规则是否需补充
- [ ] `project/rules/rejected-patterns.md` — 被拒绝的模式是否已被采纳（需转 staging）
- [ ] `codegraph/*.md` — 代码地图引用的文件路径是否还存在（重构/重命名后容易失效）

**判断标准**：
- 条目引用的文件已删除/重命名 → 标记 `stale`，更新路径或删除条目
- 条目描述的行为已不存在 → 标记 `resolved`，移到文件底部「已解决」区或删除
- 条目状态与实际不符 → 更新状态字段

### A2: 一致性 — 条目之间是否矛盾

- [ ] `MEMORY.md`（长期记忆）与 `project/memory/MEMORY.md`（harness 内）是否有同一决策的不同描述
- [ ] `design-decisions.md` 的 ADR 与 `implementation-rules.md` 的规则是否对齐（ADR 采纳但规则未建，或规则引用了已废弃 ADR）
- [ ] `vue-pitfalls.md` 的踩坑记录与 `failure-taxonomy.md` 的分类是否对得上
- [ ] `.codebuddy/memory/` 中的多条理论记忆是否互相矛盾（例：同一模块 ID 列表在不同记忆条目中范围不同）

**判断标准**：
- 同一决策两种说法 → 保留更新的，删除或合并旧的
- 规则引用了不存在的 ADR → 补 ADR 或删除规则引用
- 模块 ID / 枚举值等硬数据不一致 → 以依赖包导出为准，统一修正

### A3: 冗余性 — 是否有重复/分散信息

- [ ] 同一知识点是否分散在多个文件（例：Seedance 模块 ID 在 vue-pitfalls、design-decisions、implementation-rules 各有一份）
- [ ] `project/memory/MEMORY.md`（harness 内）与 `.codebuddy/project/memory/MEMORY.md` 是否有重复内容
- [ ] `codegraph/` 下多个地图文件是否有重叠的链路描述

**判断标准**：
- 同一知识点 3+ 处描述 → 收敛到单一源文件，其他处改为引用
- 跨文件重复的硬数据（ID、枚举） → 只在 `design-decisions.md` 或 `implementation-rules.md` 保留一处，其他引用

### A4: 蒸馏状态 — 30 天以上日志是否已处理

- [ ] `.codebuddy/memory/` 下是否有 30 天以上的 `YYYY-MM-DD.md` 文件未蒸馏
- [ ] 蒸馏后的日志文件是否已删除
- [ ] 蒸馏到 `MEMORY.md` 的内容是否精简（非逐条搬运，而是提炼结论）

**判断标准**：
- 30 天以上日志文件存在 → 提取有长期价值的信息到 `MEMORY.md`，然后删除日志文件
- 蒸馏后的 `MEMORY.md` 过长（> 200 行） → 考虑拆分或进一步精简

### A5: CodeBuddy 适配 — Rules/Skills 是否生效

- [ ] `.codebuddy/rules/core-constraints/RULE.mdc` 的 `alwaysApply` 是否为 `true`
- [ ] `.codebuddy/skills/knowledge-loader/SKILL.md` 中的文件路径是否指向 `harness/` 下真实存在的文件
- [ ] `.codebuddy/skills/knowledge-loader/SKILL.md` 中的文件路径是否指向 harness 根下真实存在的文件
- [ ] SKILL.md 的关键词触发表是否覆盖了新增的 harness 文件

## 审计流程

```
1. 通读每个文件的条目，逐条标注 ✅有效 / ⚠️过时 / ❌矛盾 / 🔁冗余
2. 收集所有标注项，按类型分类
3. 批量处理：
   - 过时条目 → 更新或删除，记录变更原因
   - 矛盾条目 → 确认正确版本，删除错误版本
   - 冗余条目 → 收敛到单一源，其他改引用
   - 未蒸馏日志 → 提取后删除
4. 审计结果记录到当日 working memory 日志
```

## 审计产出

每次审计后，在 `.codebuddy/memory/YYYY-MM-DD.md` 追加：

```markdown
## 记忆审计 [日期]

- 审计范围：[列出检查的文件]
- 过时条目：[N] 条已处理
- 矛盾条目：[N] 条已修正
- 冗余条目：[N] 条已收敛
- 蒸馏日志：[N] 个文件已处理
- 变更摘要：[简述本次主要变更]
```
