# 功能规格 — 021-quick-json-slim

> 由 Sovei 阶段生成：spec

## 验收标准

### AC-1：`quick --json` 输出体积大幅缩减

- 修改前：在有 30+ 红线/规则/知识条目的项目中，`quick --json` 输出约 117KB
- 修改后：同样条件下输出 < 10KB（预估 3-5KB）
- 验证方式：在 harness 仓库自身运行 `sovei quick <target> --paths <path> --json`，检查 stdout 字符数

### AC-2：`policy` 字段保留有用元数据

- `result.policy.controlPlane` 完整保留（policyVersion、baselineRevision、globalInvariantIds、matchedRedlineIds、selectionDecision、unloadedCandidateIds、status）
- `result.policy.shadowSummaries` 包含三个变体的 `ContextShadowSummary`（name、ids、counts、sizes、characters）
- `result.policy.index` 保留 `ContextIndexItem[]`（id、type、title、source、summary、expandable）

### AC-3：`policy` 字段不包含完整 ContextItem content

- `result.policy` 中不应出现任何 `content` 字段值超过 240 字符的条目
- `shadow` 变体的 `required`/`expanded` 不以 `ContextItem[]` 形式出现，只以 summary 形式

### AC-4：内部评估逻辑不受影响

- `needsEscalation` 判定逻辑不变（仍使用完整 `ContextPolicyResult.controlPlane.status`）
- `run` 状态转换逻辑不变
- `git` 验证逻辑不变

### AC-5：现有测试全部通过

- `quick-cli.test.mjs`、`quick-contract.test.mjs`、`usage-git.test.mjs`、`context-policy.test.mjs` 不需修改即通过
- 新增测试验证精简后的 policy 结构

### 排除项

- 不修改 `context/policy.ts` 的 `ContextPolicyResult` 类型定义
- 不修改 `context/builder.ts` 的 `buildContextPack`
- 不激活 shadow policy 的 scoped 变体（属 P1-3 独立 Feature）
- 不修改 usage 事件 schema
