# 变更清单

> Feature: 022-context-budget-subagent
> 阶段: implement | 所有任务已完成

## 完成的任务

### TASK-001: 扩展 policy.ts 类型 + 激活 actual 选择
- `ContextPolicyResult.shadow.actual` 类型从 `'full'` 扩展为 `'full' | 'scoped' | 'index+on-demand'`
- 新增 `actualReason: string` 字段
- `ContextPolicyOptions` 新增 `budget?: number`
- `buildContextPolicy()` 根据 paths 自动选择 actual，生成 actualReason

### TASK-002: 新增 context/budget.ts 预算截断模块
- `BudgetResult` 接口
- `applyBudget(items, budget, options)` 函数——按优先级截断，超预算项降级为 240 字符索引摘要
- `DEFAULT_BUDGET_PRIORITIES` 常量——优先级权重表
- 全局不变量红线（untouchableIds）不被截断

### TASK-003: 在 buildContextPolicy 中集成 applyBudget
- 有 budget 时调用 applyBudget 对 actual 变体的 required 施加截断
- 截断结果反映到 shadow.scoped.unloaded
- controlPlane.status 在超预算时设为 'over-budget'

### TASK-004: 新增 context/cross-feature.ts 相关性评分模块
- `FeatureMeta` / `ScoredFeature` 接口
- `extractFeatureMeta()` —— 从 decision-log 提取标题、标签、路径、领域
- `scoreCrossFeature()` —— path×3 + tag×2 + domain×1 评分，Top-N 筛选

### TASK-005: context build CLI 集成 budget + cross-feature 过滤
- 新增 `--budget <chars>` 和 `--cross-feature-limit <n>` 选项
- cross-feature 加载重构：extractFeatureMeta + scoreCrossFeature 取 Top-N
- 修复预存 bug：FilesystemStorage.list() 只返回文件不返回目录，改用 listEntries()

### TASK-006: 新增 context cross-feature-index CLI 命令
- 输出 JSON 数组：featureId + decisionLogPath + title + relevanceScore + tags
- 供宿主 AI（CodeBuddy Task / CC Task）分派子 Agent 并行读取

### TASK-007: 新增 context expand CLI 命令
- 按需展开指定 Feature 的指定产物（截断 4000 字符）
- 供宿主 AI 在 index+on-demand 模式下按需读取

### TASK-008: 新增测试
- `test/context-budget.test.mjs`：5 条（预算截断、优先级、untouchable、摘要格式）
- `test/cross-feature-filter.test.mjs`：8 条（元数据提取、评分、Top-N、排序）
- `test/context-subagent-contract.test.mjs`：6 条（cross-feature-index 逻辑、expand 逻辑、budget 集成、向后兼容）
- 更新 `test/context-policy.test.mjs`：actual 从 'full' 改为 'scoped'

### TASK-009: 构建验证
- `tsc --noEmit` 通过
- `pnpm run sovei:build` 通过
- 全部 156 条测试通过（原 137 + 新增 19）

## 修改的文件

| 文件 | 变更类型 |
|---|---|
| `src/context/policy.ts` | 修改：类型扩展 + actual 激活 + budget 集成 |
| `src/context/budget.ts` | 新增：预算截断模块 |
| `src/context/cross-feature.ts` | 新增：相关性评分模块 |
| `src/cli/commands/context.ts` | 修改：CLI 集成 + 新增 2 个子命令 + 修复 listEntries bug |
| `src/index.ts` | 修改：导出新模块 |
| `test/context-budget.test.mjs` | 新增 |
| `test/cross-feature-filter.test.mjs` | 新增 |
| `test/context-subagent-contract.test.mjs` | 新增 |
| `test/context-policy.test.mjs` | 修改：actual 期望值更新 |

## 预存 bug 修复

- `context.ts` 的 cross-feature 加载原使用 `storage.list()` 获取 Feature 目录列表，但 `FilesystemStorage.list()` 只返回文件不返回目录，导致 cross-feature 加载在文件系统存储下静默失败。已改用 `storage.listEntries()` 并过滤 `isDirectory`。

## 剩余工作

无。所有 TASK-001 ~ TASK-009 已完成。
