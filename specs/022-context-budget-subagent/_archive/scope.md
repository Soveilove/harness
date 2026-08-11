# Scope: 022-context-budget-subagent

> 上下文包膨胀治理 + IDE 子 Agent 契约

## 涉及模块

### 1. context/policy.ts — 核心改动

**入口**: `buildContextPolicy(pack, redlines, projectRules, options)`
**当前状态**: 
- `ContextPolicyResult.shadow.actual` 类型为 `'full'`（字面量），硬编码赋值
- 三变体（full/scoped/indexOnDemand）已计算但仅作影子
- 无预算截断逻辑

**变更面**:
- `ContextPolicyResult.shadow.actual` 类型扩展为 `'full' | 'scoped' | 'index+on-demand'`
- 新增 `actualReason: string` 字段
- `buildContextPolicy` 根据 `options.paths` 和 `options.budget` 自动选择 actual
- 新增 `applyBudget()` 函数：按优先级截断超预算项

**消费者**: 
- `cli/commands/context.ts`（context build 命令）
- `quick/run.ts`（`evaluateQuickRun` 调用 `buildContextPolicy`）
- `quick/types.ts`（`QuickPolicySummary` 引用 `ContextShadowSummary`）

**风险**: `quick/run.ts` 的 `summarizePolicy()` 已通过 `summarizeContextShadow()` 剥离 content，类型扩展不影响序列化。但需确认 `QuickPolicySummary` 不引用 `shadow.actual`。

### 2. context/budget.ts — 新增模块

**职责**: 字符预算截断逻辑
**接口**: `applyBudget(pack: ContextPack, budget: number, priorities: PriorityConfig): BudgetResult`
**输出**: 截断后的 required/suggested + 被卸载的项列表

**优先级配置**:
```typescript
const DEFAULT_PRIORITIES = {
  // 不可截断（即使超预算也保留）
  untouchable: ['redline:absolute:global'],
  // 按优先级降序排列（高→低）
  order: [
    'redline',           // 红线
    'project-rule:required', // required 规范
    'feature-artifact',  // Feature 产物
    'rule:stable',       // stable 知识
    'cross-feature',     // cross-feature 决策日志
    'rule:candidate',    // candidate 知识
    'rule:pending',      // pending 知识
    'project-rule:advisory', // advisory 规范
  ],
};
```

### 3. context/cross-feature.ts — 新增模块

**职责**: cross-feature 相关性评分 + Top-N 筛选
**接口**: 
- `scoreCrossFeature(current: FeatureMeta, others: FeatureMeta[]): ScoredFeature[]`
- `extractFeatureMeta(featureId: string, decisionLog: string): FeatureMeta`

**评分算法**: path 重叠 ×3 + tag 重叠 ×2 + domain 重叠 ×1

### 4. cli/commands/context.ts — CLI 改动

**当前入口**: `registerContextCommands(program)`
**变更面**:
- `context build` 新增 `--budget <chars>` 和 `--cross-feature-limit <n>` 选项
- `context build` 传入 `budget` 和 `crossFeatureLimit` 到 policy 构建
- cross-feature 加载逻辑改为调用 `scoreCrossFeature` 后取 Top-N
- 新增 `context cross-feature-index <feature>` 子命令
- 新增 `context expand <feature-id> <artifact-name>` 子命令

### 5. 测试文件 — 新增

- `test/context-budget.test.mjs`: 预算截断测试
- `test/cross-feature-filter.test.mjs`: 相关性过滤测试
- `test/context-subagent-contract.test.mjs`: cross-feature-index + expand 命令测试

## 异步生命周期

无异步生命周期变更。所有新增函数都是同步纯函数（`applyBudget`、`scoreCrossFeature`）。

## 恢复路径

- 预算截断是幂等的——同样输入总产生同样输出
- `actual` 回退逻辑：无 `--paths` 时 `actual='full'`，行为与 v2.5.7 完全一致
- cross-feature 过滤不改变数据——只是选择性地加载 fewer items

## 兼容路径

- `ContextPolicyResult.shadow.actual` 类型扩展是向后兼容的（`'full'` 是 `'full' | 'scoped' | 'index+on-demand'` 的子集）
- 新增字段 `actualReason` 是可选的（消费者不依赖它）
- `--budget` 和 `--cross-feature-limit` 有默认值，不提供时行为不变
