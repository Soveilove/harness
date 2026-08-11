# Scope — 021-quick-json-slim

## 入口

| 入口 | 路径 | 说明 |
|---|---|---|
| CLI 命令 | `sovei quick <target> --json` | `cli/commands/quick.ts:85-87`，`--json` 时 `JSON.stringify(result, null, 2)` |

## 涉及模块

| 模块 | 文件 | 变更类型 | 架构压力 |
|---|---|---|---|
| Quick Run | `quick/run.ts` | 修改 `QuickEvaluationResult.policy` 类型 + 新增 `QuickPolicySummary` + `summarizePolicy()` | 低，模块职责不变 |
| Quick Types | `quick/types.ts` | 无变更（`QuickRunState` 等不受影响） | 无 |
| Context Policy | `context/policy.ts` | 无变更（`ContextPolicyResult` / `summarizeContextShadow` 保持原样） | 无 |
| CLI Quick | `cli/commands/quick.ts` | 无变更（`JSON.stringify(result)` 自动序列化精简后的结构） | 无 |

## 消费者

| 消费者 | 对 `policy` 的使用 | 影响 |
|---|---|---|
| CLI 非 JSON 输出 | 不使用 `policy` | 无影响 |
| CLI JSON 输出 | 序列化整个 result | 输出体积缩减 |
| `quick-cli.test.mjs` | 不检查 `policy` | 无影响 |
| `quick-contract.test.mjs` | 不检查 `policy` | 无影响 |
| `evaluateQuickRun` 内部 | 使用完整 `policy.controlPlane.status` 判定 `needsEscalation` | 内部仍用完整 policy，仅返回时精简 |

## 验证面

| 面 | 覆盖 |
|---|---|
| 单元测试 | 新增 `quick-policy-slim.test.mjs`，验证 `QuickEvaluationResult.policy` 不含完整 content |
| CLI 集成测试 | 现有 `quick-cli.test.mjs` 不需修改 |
| 手动验证 | 在 harness 仓库运行 `sovei quick <target> --paths <path> --json`，检查输出体积 |
