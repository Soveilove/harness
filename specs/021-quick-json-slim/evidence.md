# Evidence — 021-quick-json-slim

## 验证命令与结果

### 1. TypeScript 编译

```
cd packages/sovei-core && pnpm run build
```

结果：✅ 通过（`tsc` + `build-release.mjs` 均成功）

### 2. 全量测试

```
cd packages/sovei-core && node --test "test/**/*.mjs"
```

结果：✅ 137/137 通过（原 135 + 新增 2）

### 3. 实际 `--json` 输出体积

```
sovei quick preflight-checker --paths packages/sovei-core/src/preflight/checker.ts --json
```

| 版本 | 输出大小 | 说明 |
|---|---|---|
| 修改前 | 117,777 字符（~117KB） | `policy.shadow` 三变体内联完整 `ContextItem.content` |
| 修改后 | 37,002 字节（~37KB） | `policy` 精简为 `QuickPolicySummary`（controlPlane + shadowSummaries + index） |
| 缩减幅度 | 68% | 主要剩余体积来自 `policy.index`（35 条 × 240 字符 summary ≈ 15KB）+ `shadowSummaries.*.ids`（3 变体 × 30+ ID 列表） |

### 4. policy 结构验证

- ✅ `policy.controlPlane` 完整保留（policyVersion、baselineRevision、globalInvariantIds、matchedRedlineIds、selectionDecision、unloadedCandidateIds、status）
- ✅ `policy.shadowSummaries` 包含三个 `ContextShadowSummary`（full/scoped/indexOnDemand，各含 name/ids/counts/sizes/characters）
- ✅ `policy.index` 包含 `ContextIndexItem[]`（id/type/title/source/summary/expandable）
- ✅ 不含任何 `ContextItem.content` 字段（测试 `quick-policy-slim.test.mjs` 验证）

### 5. 内部评估逻辑不受影响

- ✅ `needsEscalation` 判定不变（仍使用完整 `policy.controlPlane.status`）
- ✅ `run` 状态转换逻辑不变
- ✅ `git` 验证逻辑不变
- ✅ 现有 4 个 quick 测试不需修改即通过

## 限制

- 37KB 仍超过 spec 中 < 10KB 的预估目标。剩余体积主要来自 `policy.index` 的 240 字符摘要（35 条 × ~430 字节/条 ≈ 15KB）和 `shadowSummaries` 中重复的 ID 列表。如需进一步缩减，可考虑：移除 `index` 字段（仅保留 controlPlane + shadowSummaries），或将 `summary` 从 240 字符缩减到 120 字符。这属于 P1-3 上下文包膨胀治理的范畴。

## 结论

- AC-1（输出体积大幅缩减）：✅ 从 117KB 降至 37KB（68% 缩减），但未达 < 10KB 预估
- AC-2（保留有用元数据）：✅ controlPlane + shadowSummaries + index 均保留
- AC-3（不含完整 content）：✅ 无任何 `content` 字段
- AC-4（内部评估逻辑不变）：✅ 测试验证
- AC-5（现有测试通过）：✅ 137/137
