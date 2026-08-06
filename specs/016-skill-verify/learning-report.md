# 学习报告

> Feature：016-skill-verify
> 阶段：learn

## 观察分类

### candidate（跨 Feature 验证）

1. **learn 阶段 skill 注入需要 references 内联**：MarkdownSkillAdapter 现在自动加载 references/*.md。lesson-learned 依赖 se-principles/anti-patterns 目录，必须内联才能自包含。这是领域级经验（换任何实现都成立：带 references 的 skill 必须内联）。

### 架构债务

1. **两套 contract 数据源并存**：src/stages/index.ts 与 workflow-engine.ts 各自维护阶段契约，需同步。这再次被 016 验证（改了 learn 的 producesArtifacts 两处都要改）。

## 知识提取

```yaml:knowledge-delta
observations:
  - title: "带 references 目录的三方 skill 必须内联参考文件才能自包含"
    type: rule
    content: "MarkdownSkillAdapter 自动加载 SKILL.md 同目录的 references/*.md 并拼接注入。lesson-learned 依赖 se-principles.md（原则目录）和 anti-patterns.md（反模式），必须内联才能让注入的 prompt 自包含，避免 AI 读到引用却找不到文件。这是领域级经验：任何带 references 的三方 skill 都应内联。"
    tags: [skills, adapter, references, prompt-injection]
    category: candidate
    evidence: "016 验证 learn 阶段注入含 se-principles/anti-patterns/distillation-guide 三份参考，AI 可完整理解 lesson-learned"
    relatedEntryId: null
  - title: "阶段推进前置校验集中在 workflow-engine，不要绕开"
    type: rule
    content: "executeStage/completeStage 的守卫顺序固定。新增阶段应把校验挂在这条链上，不要在 CLI 层各自实现。learn 阶段 postExecute 中的对账逻辑同样遵循此原则。"
    tags: [workflow, validation, rule]
    category: pending-proposal
    evidence: "016 修改 learn 阶段，验证引擎钩子 vs CLI 层逻辑的边界"
    relatedEntryId: rule-workflow-engine-acecf4c6
  - title: "Rejected: 用 Allium DSL 作为 learn 产出物"
    type: decision
    content: "juxt/allium/distill 的产出物是 .allium 行为规格，与 Sovei 知识库的 yaml knowledge-delta 格式不匹配。仅借鉴其蒸馏方法论（Would-we-rebuild、Means vs Ends），不引入其产出物格式。"
    tags: [rejected, distillation, allium]
    category: rejected
    evidence: "确认拒绝 Allium DSL 格式，只吸收方法论"
    relatedEntryId: null
```
