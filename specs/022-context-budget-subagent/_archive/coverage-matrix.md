# Coverage Matrix: 022-context-budget-subagent

| 代码表面 | 变更类型 | 验证方式 | 状态 |
|---|---|---|---|
| `context/policy.ts` → `ContextPolicyResult.shadow.actual` | 类型扩展 | tsc --noEmit + 单元测试 | ✅ |
| `context/policy.ts` → `buildContextPolicy()` | 逻辑变更（actual 选择 + actualReason） | 单元测试：有 paths→scoped、无 paths→full | ✅ |
| `context/policy.ts` → `applyBudget()` | 新增函数 | 单元测试：超预算截断、优先级顺序、全局不变量保留 | ✅ |
| `context/policy.ts` → `ContextPolicyResult.shadow` 新增 `actualReason` | 新增字段 | tsc --noEmit | ✅ |
| `context/budget.ts` | 新增模块 | 单元测试：各优先级截断顺序 | ✅ |
| `context/cross-feature.ts` | 新增模块 | 单元测试：评分计算、Top-N 筛选 | ✅ |
| `cli/commands/context.ts` → `context build` | 新增 --budget/--cross-feature-limit | CLI 集成测试 | ✅ |
| `cli/commands/context.ts` → cross-feature 加载逻辑 | 重构为 Top-N 筛选 | 单元测试：默认 5 条、--cross-feature-limit 调整 | ✅ |
| `cli/commands/context.ts` → `context cross-feature-index` | 新增子命令 | CLI 测试：JSON 输出格式 | ✅ |
| `cli/commands/context.ts` → `context expand` | 新增子命令 | CLI 测试：展开内容 + 错误处理 | ✅ |
| `quick/run.ts` → `summarizePolicy()` | 无变更（确认兼容） | 现有测试通过 | ✅ |
| `test/context-budget.test.mjs` | 新增测试 | 运行测试 | ✅ |
| `test/cross-feature-filter.test.mjs` | 新增测试 | 运行测试 | ✅ |
| `test/context-subagent-contract.test.mjs` | 新增测试 | 运行测试 | ✅ |
