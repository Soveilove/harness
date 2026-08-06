# 学习报告

> Feature：015-learn-reconcile-verify
> 阶段：learn

## 观察分类

### candidate/pending（跨 Feature 验证）

1. **阶段推进前置校验集中在 workflow-engine，不要绕开**：本 Feature 在 learn 阶段 postExecute 中新增了对账逻辑，同样遵循"校验集中在 workflow-engine"的原则——postExecute 是引擎钩子而非 CLI 层逻辑。这验证了 onboard 阶段记录的规则在 015 中依然适用。

### 仅项目适用

1. **知识对账引擎的匹配策略**：标题相似度 + 标签重叠 + relatedEntryId 三重匹配。对于中文标题需要 normalizeTitle 保留中文字符范围（\u4e00-\u9fff），否则中文标题无法匹配。

### 拒绝模式

1. **子代理执行知识对账**：拒绝。对账是确定性逻辑（解析 + 匹配 + dispatch），不需要 AI 代理执行。AI 的职责是在 learn 阶段产出结构化 knowledge-delta 块，引擎负责对账。

## 知识提取

```yaml:knowledge-delta
observations:
  - title: "阶段推进前置校验集中在 workflow-engine，不要绕开"
    type: rule
    content: "executeStage/completeStage 的守卫顺序固定。新增阶段应把校验挂在这条链上（stageDef.contract / preExecute），不要在 CLI 层各自实现。learn 阶段 postExecute 中的对账逻辑同样遵循此原则。"
    tags: [workflow, validation, rule]
    category: pending-proposal
    evidence: "015 在 learn postExecute 中新增对账逻辑，遵循引擎钩子而非 CLI 层实现的原则"
    relatedEntryId: null
  - title: "Knowledge Reconciliation Pattern"
    type: architecture
    content: "learn 阶段 postExecute 自动解析 learning-report.md 中的 yaml:knowledge-delta 块，通过标题相似度+标签重叠匹配已有知识条目，自动执行 ADD/PROMOTE 操作。新观察→candidate，2证据→pending，3证据→自动stable。"
    tags: [knowledge, reconciliation, learn, architecture]
    category: candidate
    evidence: "015 首次实现知识自动对账引擎，闭合 learn→knowledge 循环"
    relatedEntryId: null
  - title: "Rejected: Sub-agent Execution for Knowledge Reconciliation"
    type: decision
    content: "知识对账是确定性逻辑，不需要 AI 代理执行。AI 负责产出结构化 knowledge-delta 块，引擎负责对账。"
    tags: [rejected, knowledge]
    category: rejected
    evidence: "确认拒绝子代理执行方案"
    relatedEntryId: null
```
