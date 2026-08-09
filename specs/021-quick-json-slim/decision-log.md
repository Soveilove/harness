# Decision Log — 021-quick-json-slim

## 问题陈述

`sovei quick <target> --json` 输出的 JSON 达 117KB（1980 行），宿主 Agent 解析困难。根因是 `QuickEvaluationResult.policy` 携带完整 `ContextPolicyResult`，其中 `shadow.full`/`shadow.scoped`/`shadow.indexOnDemand` 三个变体各自内联了所有 `ContextItem` 的完整 `content` 字段（每条最多 4000 字符），30+ 条目重复三遍导致膨胀。

## 决策

### D1 — 膨胀根因定位（事实核实，已决）

**结论**：`quick/run.ts:30` 的 `QuickEvaluationResult.policy` 类型为 `ReturnType<typeof buildContextPolicy>` = 完整 `ContextPolicyResult`。`context/policy.ts:82-91` 的 `ContextPolicyResult.shadow` 包含三个 `ContextShadowVariant`，每个持有 `required: ContextItem[]` + `expanded: ContextItem[]`（完整 `content` 字段）。

**证据**：
- `cli/commands/quick.ts:86`：`console.log(JSON.stringify(result, null, 2))` 序列化整个 result
- `quick-result.json` 实测 117777 字符，其中 `policy.shadow` 三变体占绝大部分
- 非 JSON 输出路径（`quick.ts:89-96`）完全不使用 `policy` 字段
- 测试（`quick-cli.test.mjs`、`quick-contract.test.mjs`）从不断言 `result.policy` 的 shadow 正文

### D2 — 修复方案：policy 精简化（可推断决策，已决）

**决策**：将 `QuickEvaluationResult.policy` 从完整 `ContextPolicyResult` 替换为精简结构 `QuickPolicySummary`，仅保留：
- `controlPlane`：控制面元数据（ID 列表、决策描述、状态）——小，有用
- `shadowSummaries`：三个 `ContextShadowSummary`（仅 ID/计数/字符数）——用已有 `summarizeContextShadow()` 生成
- `index`：`ContextIndexItem[]`（240 字符摘要）——适中，保留索引能力

**理由**：完整 shadow 正文只在策略评估内部使用（决定 `needsEscalation`），序列化到 JSON 输出无消费者。`controlPlane` 和 `index` 提供足够的元信息供宿主 Agent 理解策略决策。

**被拒绝方案**：
- ❌ 完全移除 `policy` 字段：丢失有用的策略元数据（匹配的红线 ID、候选列表、决策理由）
- ❌ 在 CLI 层做后处理过滤：类型不安全，每个调用点都要记得处理
- ❌ 修改 `ContextPolicyResult` 本身：它是内部评估类型，不应为输出格式耦合

### D3 — 实现位置（可推断决策，已决）

**决策**：在 `quick/run.ts` 中定义 `QuickPolicySummary` 类型 + `summarizePolicy()` 辅助函数，`evaluateQuickRun` 返回精简后的 policy。

**理由**：修改集中在 quick 模块内部，不触碰 `context/policy.ts`（保持内部分析能力完整），不触碰 CLI 层（类型安全）。

### D4 — 向后兼容（可推断决策，已决）

**决策**：`--json` 输出结构变化属于快速通道的输出格式调整。快速通道（Feature 020）尚未发布到 npm（仍在本仓库内部使用），无外部消费者依赖 `policy.shadow` 的完整正文结构。`QuickEvaluationResult` 是内部类型（非导出 schema），不需要 schemaVersion 迁移。

**理由**：CLI_CONTRACT_STABILITY 红线保护的是已发布的命令名/子命令/必填选项/退出码，不保护 `--json` 输出的内部字段结构。

## 未决项

无。所有决策均为事实核实或可推断决策，无需用户确认。
