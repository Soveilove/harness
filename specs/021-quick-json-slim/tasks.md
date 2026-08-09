# Tasks — 021-quick-json-slim

- [x] TASK-001: 在 `quick/run.ts` 中定义 `QuickPolicySummary` 接口和 `summarizePolicy()` 辅助函数
- [x] TASK-002: 修改 `QuickEvaluationResult.policy` 类型从 `ContextPolicyResult` 改为 `QuickPolicySummary`，`evaluateQuickRun` 返回精简后的 policy
- [x] TASK-003: 新增测试 `test/quick-policy-slim.test.mjs`，验证 `QuickEvaluationResult.policy` 不含完整 `ContextItem.content`
- [x] TASK-004: 构建并运行全部测试，确认 135+ 通过
