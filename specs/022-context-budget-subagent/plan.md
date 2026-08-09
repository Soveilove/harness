# Plan: 022-context-budget-subagent

> 上下文包膨胀治理 + IDE 子 Agent 契约

## 模块边界

### M1: context/policy.ts — 类型扩展 + actual 激活 + budget 集成

**改动范围**:
1. `ContextPolicyResult.shadow.actual` 类型: `'full'` → `'full' | 'scoped' | 'index+on-demand'`
2. 新增 `ContextPolicyResult.shadow.actualReason: string`
3. `ContextPolicyOptions` 新增 `budget?: number`
4. `buildContextPolicy()` 逻辑变更：
   - 有 `paths` → `actual = 'scoped'`
   - 无 `paths` → `actual = 'full'`（向后兼容）
   - 有 `budget` → 在选定 actual 后对 required/suggested 施加预算截断
5. 新增 `applyBudget()` 导出函数

**数据流**:
```
buildContextPolicy(pack, redlines, rules, options)
  → 计算 globalInvariantIds / matchedRedlineIds / index
  → 构建三变体 (full/scoped/indexOnDemand)
  → 选择 actual (有 paths→scoped, 无→full)
  → 若有 budget → applyBudget(actual 变体, budget)
  → 返回 ContextPolicyResult (含 actual + actualReason)
```

### M2: context/budget.ts — 预算截断

**新增文件**。纯函数模块，无副作用。

**接口**:
```typescript
interface BudgetResult {
  retained: ContextItem[];      // 保留在 required 的项
  unloaded: ContextIndexItem[]; // 被截断降级为索引的项
  totalCharacters: number;
  budget: number;
  exceeded: boolean;
}

function applyBudget(
  items: ContextItem[],
  budget: number,
  options?: { untouchableIds?: string[] }
): BudgetResult;
```

**优先级判定**: 按 `ContextItem.type` + `ContextItem.lifecycle` 排序：
1. `redline` (active) — 不可截断（untouchable）
2. `project-rule` (required) — 高
3. `feature-artifact` — 高
4. `rule` (stable) — 中
5. `cross-feature` — 中低
6. `rule` (candidate/pending) — 低
7. `project-rule` (advisory) — 最低

### M3: context/cross-feature.ts — 相关性评分

**新增文件**。纯函数模块。

**接口**:
```typescript
interface FeatureMeta {
  featureId: string;
  decisionLogPath: string;
  title: string;
  tags: string[];
  domains: string[];
  paths: string[];
}

interface ScoredFeature {
  featureId: string;
  decisionLogPath: string;
  title: string;
  relevanceScore: number;
  tags: string[];
}

function extractFeatureMeta(featureId: string, decisionLogContent: string, currentPaths?: string[]): FeatureMeta;
function scoreCrossFeature(current: FeatureMeta, others: FeatureMeta[], limit?: number): ScoredFeature[];
```

**评分算法**:
- path 重叠: 每个重叠 path × 3
- tag 重叠: 每个重叠 tag × 2
- domain 重叠: 每个重叠 domain × 1
- 取 Top-N（默认 5），按 relevanceScore 降序

**tag 提取**: 从 decision-log.md 的 frontmatter 或标题行提取。若无结构化 tag，用标题关键词做 fallback。

### M4: cli/commands/context.ts — CLI 集成

**改动范围**:
1. `context build` 新增选项:
   - `--budget <chars>`: 字符预算（默认不限制，保持向后兼容）
   - `--cross-feature-limit <n>`: cross-feature Top-N（默认 5）
2. `context build` 的 cross-feature 加载逻辑重构:
   - 读取所有 Feature 的 decision-log（现有逻辑）
   - 调用 `extractFeatureMeta` + `scoreCrossFeature` 筛选 Top-N
   - 仅将 Top-N 的 decision-log 加入 crossFeatureArtifacts
3. `context build` 传 budget 到 `buildContextPolicy`
4. 新增子命令 `context cross-feature-index <feature>`:
   - 输出 JSON 数组：所有其他 Feature 的 featureId + decisionLogPath + title + relevanceScore + tags
   - 不加载 decision-log content，仅输出索引
5. 新增子命令 `context expand <feature-id> <artifact-name>`:
   - 读取指定 Feature 的指定产物
   - 截断 4000 字符
   - 输出到 stdout

## 状态/数据流

```
sovei context build --paths src/context --budget 32768 --cross-feature --cross-feature-limit 5
  │
  ├─ 加载知识/红线/规范/产物（现有逻辑不变）
  ├─ cross-feature: 读取所有 decision-log → extractFeatureMeta → scoreCrossFeature → 取 Top-5
  ├─ buildContextPack（现有逻辑，但 crossFeatureArtifacts 只有 Top-5）
  ├─ buildContextPolicy(pack, redlines, rules, { paths, budget: 32768 })
  │    ├─ 选择 actual = 'scoped' (有 paths)
  │    ├─ 构建 scoped 变体
  │    └─ applyBudget(scoped.required, 32768) → 截断超预算项
  └─ 输出 JSON/Markdown
```

## 契约

### 新增导出 (context/policy.ts)
- `applyBudget()` 函数
- `ContextPolicyResult.shadow.actual` 类型扩展
- `ContextPolicyResult.shadow.actualReason` 字段
- `ContextPolicyOptions.budget` 字段

### 新增导出 (context/budget.ts)
- `applyBudget()` 函数
- `BudgetResult` 接口
- `DEFAULT_BUDGET_PRIORITIES` 常量

### 新增导出 (context/cross-feature.ts)
- `extractFeatureMeta()` 函数
- `scoreCrossFeature()` 函数
- `FeatureMeta` / `ScoredFeature` 接口

### 新增 CLI 命令
- `sovei context cross-feature-index <feature>`
- `sovei context expand <feature-id> <artifact-name>`

## 迁移策略

无需数据迁移。所有变更是代码层面的，不涉及持久化数据结构变更。

## 验证方式

1. `tsc --noEmit` 通过
2. 现有 137 条测试全部通过
3. 新增测试覆盖：
   - budget 截断：超预算时项被降级、优先级顺序正确、全局不变量保留
   - cross-feature 评分：path/tag/domain 重叠度计算、Top-N 筛选
   - cross-feature-index 命令：JSON 输出格式
   - expand 命令：内容展开 + 错误处理
   - 向后兼容：无 --paths/--budget 时行为不变
4. 手动验证：`context build --paths src/context --budget 32768` 输出正确
