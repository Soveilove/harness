# Reconciliation: 021-quick-json-slim Quick JSON 精简

## Need Translation

**PM 原话**：`quick-result.json` 太大了（117KB），宿主 Agent 解析困难。

**技术理解**：`sovei quick --json` 的输出 `QuickEvaluationResult` 包含完整的 `ContextPolicyResult`，其中 `shadow.full`/`shadow.scoped`/`shadow.indexOnDemand` 三个变体各自内联了所有 `ContextItem` 的完整 `content`（每条最多 4000 字符）。这些正文在 JSON 输出中无消费者——非 JSON 输出路径不使用 `policy`，测试不断言 `policy.shadow` 正文。需要将输出中的 `policy` 替换为精简摘要结构，同时保留有用的元数据（控制面决策、索引摘要、影子统计）。

## Current State

**代码现状**（`packages/sovei-core/src/quick/run.ts`）：

```typescript
export interface QuickEvaluationResult {
  run: QuickRunState;
  policy: ReturnType<typeof buildContextPolicy>;  // ← 完整 ContextPolicyResult
  git: GitVerifyResult | null;
  confirmation: string;
  report: string[];
}
```

`buildContextPolicy` 返回 `ContextPolicyResult`（`context/policy.ts:81-91`）：
- `controlPlane`：控制面元数据（小，~1KB）
- `index`：`ContextIndexItem[]`，每条 240 字符摘要（适中，~5-10KB）
- `shadow.full`：`ContextShadowVariant`，含 `required: ContextItem[]` + `expanded: ContextItem[]` 完整 content（巨大，~40KB）
- `shadow.scoped`：同上（~40KB）
- `shadow.indexOnDemand`：同上（~40KB）

三个 shadow 变体是策略分析用的影子度量——计算不同裁剪策略下 required/indexed/expanded/unloaded 的分布，但 `actual` 硬编码为 `'full'`，实际交付的上下文不变。这些影子数据用于观测，不需要在每次 `--json` 输出中携带完整正文。

**为什么是这样**：Feature 020（quick-context-governance）实现时，`QuickEvaluationResult.policy` 直接引用了 `buildContextPolicy` 的返回类型，未区分"内部评估用"和"输出用"——完整 `ContextPolicyResult` 适合内部决策，不适合序列化输出。

## Solutions

### Solution A: 在 quick/run.ts 中定义精简 policy 类型（推荐）

- 定义 `QuickPolicySummary` 接口，包含 `controlPlane` + `shadowSummaries`（三个 `ContextShadowSummary`）+ `index`
- 新增 `summarizePolicy()` 辅助函数，从 `ContextPolicyResult` 提取精简结构
- `QuickEvaluationResult.policy` 类型改为 `QuickPolicySummary`
- `evaluateQuickRun` 内部仍使用完整 `ContextPolicyResult` 做决策，返回时精简
- cost: 修改集中在 `quick/run.ts`，新增 ~20 行代码，不影响其他模块

### Solution B: 在 CLI 层做后处理过滤

- `cli/commands/quick.ts` 的 `--json` 分支中手动删除 `result.policy.shadow` 的 `required`/`expanded` 字段
- cost: 类型不安全（先序列化再删除或用 `Omit`），每个调用点都要记得处理，容易遗漏

### Solution C: 完全移除 policy 字段

- `QuickEvaluationResult` 不返回 `policy`
- cost: 丢失有用的策略元数据（匹配的红线 ID、候选列表、决策理由），宿主 Agent 无法理解为什么被升级

## Questions

无未决疑问。所有决策已在 grill 阶段解决：
- 选择 Solution A（在 quick/run.ts 中精简）
- 不修改 `ContextPolicyResult` 类型本身
- 不需要 schema 迁移（`QuickEvaluationResult` 是内部类型，未导出为 schema）

## Sign-off

- [x] product: by: user date: 2026-08-10 ref: 用户反馈 JSON 太大
- [x] tech: by: AI date: 2026-08-10 ref: 代码分析确认根因在 policy.shadow 完整正文
