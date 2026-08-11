# Learning Report — 021-quick-json-slim

## 观察分类

### 观察 1：内部评估类型与输出序列化类型应分离

**来源 Feature**：021-quick-json-slim

**证据**：`QuickEvaluationResult.policy` 直接引用了 `ReturnType<typeof buildContextPolicy>` = 完整 `ContextPolicyResult`，其中 `shadow` 三变体内联了所有 `ContextItem` 的完整 `content`（每条最多 4000 字符）。`--json` 输出时 `JSON.stringify(result)` 序列化了整个 result，导致输出 117KB。修复方式：新增 `QuickPolicySummary` 精简类型 + `summarizePolicy()` 转换函数，内部评估仍用完整类型做决策，返回时精简。

**适用范围**：所有将内部评估结果序列化输出的场景（CLI `--json`、事件日志、API 响应等）

**建议目标**：candidate（首次观察此模式）

**蒸馏判断**：
- Would we rebuild it? 是——重写系统时仍会区分"评估用类型"和"输出用类型"
- Why? 后续 Feature 在新增 `--json` 输出或事件记录时会遇到同样问题
- Could it be different? 是——无论用什么序列化格式，原则都成立
- Means vs Ends：沉淀"分离原则"，不沉淀具体的 `QuickPolicySummary` 类型定义

### 观察 2：已有摘要工具未被输出路径使用

**来源 Feature**：021-quick-json-slim

**证据**：`context/policy.ts` 已有 `summarizeContextShadow()` 函数（返回 `ContextShadowSummary`，仅 ID/计数/字符数），但 `quick/run.ts` 的 `QuickEvaluationResult.policy` 直接引用了完整 `ContextPolicyResult` 类型，未在输出边界调用摘要函数。基础设施就位但未被消费。

**适用范围**：所有已有摘要/投影工具但未在输出路径使用的场景

**建议目标**：rejected（一次性实现细节，不沉淀为知识——"已有工具但没用"太泛化，无法指导后续决策）

## 知识提取

```yaml:knowledge-delta
observations:
  - title: "内部评估类型与输出序列化类型应在边界分离"
    type: rule
    content: "当函数返回包含大型内部数据结构的评估结果时，应在序列化边界提供精简摘要类型，而非直接序列化完整内部类型。内部类型服务于计算决策（如策略评估、状态判定），输出类型服务于通信（如 CLI --json、事件日志、API 响应）。两者的关注点不同：内部类型需要完整数据做精确决策，输出类型需要足够元数据做可读通信。在返回点做 summarize 转换，而非在每个消费者处做后处理过滤。"
    tags: [type-design, serialization, output-boundary]
    category: candidate
    evidence: "021-quick-json-slim: QuickEvaluationResult.policy 从完整 ContextPolicyResult 改为 QuickPolicySummary，输出从 117KB 降至 37KB"
    relatedEntryId: null
```
