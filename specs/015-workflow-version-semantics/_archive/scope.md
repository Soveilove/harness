# Feature 015 — Scope

## 范围矩阵

| 需求 | in-scope | out-of-scope |
|---|---|---|
| version mismatch warning | ✅ loadConfig 添加 | — |
| 版本语义 JSDoc | ✅ types.ts + workflow-engine.ts | — |
| version bump | ❌ 保持 2.0.0 | — |
| migration 机制 | — | ❌ 不需要 |
| CLI 命令变更 | — | ❌ 不改 |
| schemaVersion 变更 | — | ❌ 不改 |
| 测试 | ✅ 添加 mismatch warning 测试 | — |

## 覆盖矩阵

| 文件 | 变更 | 测试 |
|---|---|---|
| `config/loader.ts` | +version mismatch warning | ✅ 测 mismatch 触发 warning、match 不触发 |
| `engine/types.ts` | +JSDoc on WorkflowDefinition.version | — |
| `engine/workflow-engine.ts` | +JSDoc on DEFAULT_WORKFLOW | — |
