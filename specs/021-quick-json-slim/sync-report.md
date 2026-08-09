# Sync Report — 021-quick-json-slim

## 同步目标

| 目标 | 授权 | 说明 |
|---|---|---|
| `packages/sovei-core/src/quick/run.ts` | ✅ 已授权 | 修改 `QuickEvaluationResult.policy` 类型 + 新增 `QuickPolicySummary` + `summarizePolicy()` |
| `packages/sovei-core/test/quick-policy-slim.test.mjs` | ✅ 已授权 | 新增测试文件 |
| `specs/021-quick-json-slim/` | ✅ 已授权 | Feature 产物（决策日志、规格、计划等） |

## 受保护文件

| 文件 | 状态 |
|---|---|
| `context/policy.ts` | ✅ 未修改 |
| `context/builder.ts` | ✅ 未修改 |
| `cli/commands/quick.ts` | ✅ 未修改 |
| `quick/types.ts` | ✅ 未修改 |

## 同步前后差异

### 同步前

- `quick --json` 输出 117KB，`policy.shadow` 三变体内联完整 `ContextItem.content`
- 135 个测试

### 同步后

- `quick --json` 输出 37KB（68% 缩减），`policy` 精简为 `QuickPolicySummary`
- 137 个测试（+2 新增）
- 知识库新增 1 条 candidate：`rule-内部评估类型与输出序列化类型应在边界分离`

## 命令结果

```
pnpm run build         → ✅ tsc + build-release 成功
node --test test/**/*.mjs  → ✅ 137/137 通过
sovei quick --json     → ✅ 输出 37KB（原 117KB）
```

## 跳过目标

无。

## 结论

Feature 021-quick-json-slim 已完成全部 12 阶段工作流。代码修改集中在 `quick/run.ts`，不涉及受保护文件。测试全量通过。输出体积显著缩减。
