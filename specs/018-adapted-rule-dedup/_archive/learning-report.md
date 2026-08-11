# 学习报告

> 由 Sovei 阶段生成：learn
> Feature: 018-adapted-rule-dedup

## 观察分类

| 观察 | 来源 Feature | 证据 | 适用范围 | 建议目标 |
|------|--------------|------|----------|----------|
| 规则 id 由内容 hash 派生，必须保证输入唯一 | 018-adapted-rule-dedup | `project-rule-scanner.ts` `idFor` + 去重修复 | 所有基于内容哈希生成 id 的适配器 | rule |
| 规则集 id 唯一性是硬约束（fail-closed） | 018-adapted-rule-dedup | `repository.ts` `load()` 抛错 | 规则仓库加载层 | rule |

## 蒸馏判断

- **Would we rebuild it?**：会。任何"从文档/规则来源自动提取候选规则"的适配器都必须保证生成的 id 不重复，否则加载即失败。该原则应在后续适配器设计中复用。
- **Why**：后续 Feature 若新增 doc/规则适配或改动 idFor，需知此约束，避免重蹈重复 id 覆辙。
- **Could it be different?**：是。无论 id 如何派生（hash/序号/uuid），唯一性约束不变。
- **Means vs Ends**：沉淀"适配器生成的规则 id 必须唯一，同一章节重复语句应去重"，而非具体去重代码实现。
- **排除**：不记录具体 hash 算法、文件行号、`Set` 去重代码片段等实现细节。

## 知识提取

```yaml:knowledge-delta
observations:
  - title: "规则适配器生成的规则 id 必须唯一"
    type: rule
    content: "从 Agent Rules / 团队文档自动适配项目规则时，规则 id 由内容派生；当同一文档章节内出现重复语句时，必须去重，保证生成的规则 id 唯一。规则集的 id 唯一性是加载层的硬约束（fail-closed），重复 id 会导致加载失败。"
    tags: [rules, adaptation, id-uniqueness, project-rules]
    category: candidate
    evidence: "018-adapted-rule-dedup：scanProjectRuleCandidates 未对同章节重复语句去重，导致重复 id 触发 repository.load() 报错；修复为返回前按 id 去重，并在 ad-materials-frontend 复跑验证 492 条规则 0 重复。"
    relatedEntryId: null
```
