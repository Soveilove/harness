# 变更清单

> 由 Sovei 阶段生成：implement
> Feature: 021-quick-json-slim
> 任务: TASK-001, TASK-002, TASK-003, TASK-004

## 变更文件

| 文件 | 行为 | 说明 |
|---|---|---|
| `packages/sovei-core/src/quick/run.ts` | 修改 | 新增 `QuickPolicySummary` 接口 + `summarizePolicy()` 函数；`QuickEvaluationResult.policy` 类型从 `ContextPolicyResult` 改为 `QuickPolicySummary`；两处 return 语句调用 `summarizePolicy()` |
| `packages/sovei-core/test/quick-policy-slim.test.mjs` | 新增 | 2 个测试：验证 policy 不含完整 content、验证 controlPlane 元数据保留 |

## 行为变更

- `sovei quick --json` 输出的 `policy` 字段从完整 `ContextPolicyResult`（含 shadow 三变体的 `ContextItem[]` 全文 content，~117KB）精简为 `QuickPolicySummary`（仅 controlPlane + shadowSummaries + index，预估 < 5KB）
- 内部评估逻辑不变：`evaluateQuickRun` 仍使用完整 `ContextPolicyResult` 做 `needsEscalation` 判定，仅在返回时精简
- 非 JSON 输出路径不受影响

## 测试

- 原有 135 个测试全部通过（不需修改）
- 新增 2 个测试：`quick-policy-slim.test.mjs`
- 总计 137/137 通过

## 剩余工作

无。所有 TASK 已完成。
