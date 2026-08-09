# Coverage Matrix — 021-quick-json-slim

| 代码表面 | 变更意图 | 测试覆盖 |
|---|---|---|
| `quick/run.ts:QuickEvaluationResult.policy` | 类型从 `ContextPolicyResult` 改为 `QuickPolicySummary` | 新增测试验证精简结构 |
| `quick/run.ts:evaluateQuickRun` | 返回精简后的 policy | 新增测试 + 现有 `quick-cli.test.mjs` |
| `quick/run.ts:QuickPolicySummary`（新增） | 精简 policy 类型定义 | 新增测试 |
| `quick/run.ts:summarizePolicy`（新增） | 从 `ContextPolicyResult` 提取精简结构 | 新增测试 |
