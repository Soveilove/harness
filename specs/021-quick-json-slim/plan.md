# Plan — 021-quick-json-slim

## 模块边界

修改仅限 `packages/sovei-core/src/quick/run.ts`。不触碰 `context/policy.ts`、`context/builder.ts`、`cli/commands/quick.ts`。

## 数据流

```
evaluateQuickRun(input)
  │
  ├── buildContextPolicy(pack, redlines, rules, opts)  → 完整 ContextPolicyResult（内部用）
  │     │
  │     ├── controlPlane.status → 决定 needsEscalation
  │     └── shadow.{full,scoped,indexOnDemand} → 影子度量（内部用）
  │
  ├── summarizePolicy(policy)  → QuickPolicySummary（新增，输出用）
  │     │
  │     ├── controlPlane（直接引用，小）
  │     ├── shadowSummaries: { full, scoped, indexOnDemand }（用 summarizeContextShadow 提取）
  │     └── index（直接引用，240 字符摘要）
  │
  └── return { run, policy: summary, git, confirmation, report }
```

## 契约变更

### `QuickEvaluationResult`（`quick/run.ts`）

```typescript
// 修改前
export interface QuickEvaluationResult {
  run: QuickRunState;
  policy: ReturnType<typeof buildContextPolicy>;  // 完整 ContextPolicyResult
  git: GitVerifyResult | null;
  confirmation: string;
  report: string[];
}

// 修改后
export interface QuickPolicySummary {
  controlPlane: ContextPolicyControlPlane;
  shadowSummaries: {
    full: ContextShadowSummary;
    scoped: ContextShadowSummary;
    indexOnDemand: ContextShadowSummary;
  };
  index: ContextIndexItem[];
}

export interface QuickEvaluationResult {
  run: QuickRunState;
  policy: QuickPolicySummary;  // 精简结构
  git: GitVerifyResult | null;
  confirmation: string;
  report: string[];
}
```

### 新增函数

```typescript
function summarizePolicy(policy: ContextPolicyResult): QuickPolicySummary {
  return {
    controlPlane: policy.controlPlane,
    shadowSummaries: {
      full: summarizeContextShadow(policy.shadow.full),
      scoped: summarizeContextShadow(policy.shadow.scoped),
      indexOnDemand: summarizeContextShadow(policy.shadow.indexOnDemand),
    },
    index: policy.index,
  };
}
```

## 迁移策略

无需迁移。`QuickEvaluationResult` 是内部类型，不持久化，不通过 schema 导出。`--json` 输出格式变化不影响命令名/子命令/必填选项/退出码（CLI_CONTRACT_STABILITY 红线保护范围）。

## 验证方式

1. 现有测试（`quick-cli.test.mjs` 等）不需修改即通过——它们不断言 `policy` 结构
2. 新增测试 `quick-policy-slim.test.mjs`：验证 `QuickEvaluationResult.policy` 不含 `ContextItem.content` 字段
3. 手动验证：在 harness 仓库运行 `sovei quick <target> --paths <path> --json`，检查输出体积
