# Tasks: 022-context-budget-subagent

> 上下文包膨胀治理 + IDE 子 Agent 契约

## 任务清单

- [ ] TASK-001: 扩展 policy.ts 类型 + 激活 actual 选择
  - **依赖**: 无
  - **文件**: `src/context/policy.ts`
  - **范围**: 
    - `ContextPolicyResult.shadow.actual` 类型从 `'full'` 改为 `'full' | 'scoped' | 'index+on-demand'`
    - 新增 `actualReason: string` 字段
    - `ContextPolicyOptions` 新增 `budget?: number`
    - `buildContextPolicy()` 根据 paths 选择 actual，生成 actualReason
  - **验收**: tsc --noEmit 通过；有 paths 时 actual='scoped'，无 paths 时 actual='full'
  - **验证**: 单元测试

- [ ] TASK-002: 新增 context/budget.ts 预算截断模块
  - **依赖**: TASK-001
  - **文件**: `src/context/budget.ts`（新增）
  - **范围**:
    - `BudgetResult` 接口
    - `applyBudget(items, budget, options)` 函数
    - `DEFAULT_BUDGET_PRIORITIES` 常量
    - 按 type+lifecycle 排序，超预算项降级为 ContextIndexItem
    - 全局不变量红线（untouchableIds）不被截断
  - **验收**: 超预算时项被正确降级；优先级顺序正确；全局不变量保留
  - **验证**: 单元测试

- [ ] TASK-003: 在 buildContextPolicy 中集成 applyBudget
  - **依赖**: TASK-002
  - **文件**: `src/context/policy.ts`
  - **范围**:
    - 当 `options.budget` 提供时，调用 `applyBudget` 对 actual 变体的 required 施加截断
    - 截断结果反映到 `shadow.scoped.unloaded` 和 `controlPlane.unloadedCandidateIds`
    - `controlPlane.status` 在超预算时设为 `'over-budget'`
  - **验收**: 有 budget 时超预算项被卸载；status 正确
  - **验证**: 单元测试

- [ ] TASK-004: 新增 context/cross-feature.ts 相关性评分模块
  - **依赖**: 无
  - **文件**: `src/context/cross-feature.ts`（新增）
  - **范围**:
    - `FeatureMeta` / `ScoredFeature` 接口
    - `extractFeatureMeta(featureId, decisionLogContent, currentPaths)` 函数
    - `scoreCrossFeature(current, others, limit)` 函数
    - 评分: path×3 + tag×2 + domain×1
    - Top-N 筛选（默认 5）
  - **验收**: 评分计算正确；Top-N 按分数降序
  - **验证**: 单元测试

- [ ] TASK-005: context build CLI 集成 budget + cross-feature 过滤
  - **依赖**: TASK-003, TASK-004
  - **文件**: `src/cli/commands/context.ts`
  - **范围**:
    - `context build` 新增 `--budget <chars>` 和 `--cross-feature-limit <n>` 选项
    - cross-feature 加载逻辑重构：调用 extractFeatureMeta + scoreCrossFeature 取 Top-N
    - 传 budget 到 buildContextPolicy
  - **验收**: `--budget 1024` 时输出缩小；`--cross-feature-limit 3` 时只加载 3 个 cross-feature
  - **验证**: CLI 集成测试

- [ ] TASK-006: 新增 context cross-feature-index CLI 命令
  - **依赖**: TASK-004
  - **文件**: `src/cli/commands/context.ts`
  - **范围**:
    - `context cross-feature-index <feature>` 子命令
    - 输出 JSON 数组：featureId + decisionLogPath + title + relevanceScore + tags
    - 不加载 content，仅输出索引
  - **验收**: JSON 输出格式正确；大小远小于全量加载
  - **验证**: CLI 测试

- [ ] TASK-007: 新增 context expand CLI 命令
  - **依赖**: 无
  - **文件**: `src/cli/commands/context.ts`
  - **范围**:
    - `context expand <feature-id> <artifact-name>` 子命令
    - 读取指定 Feature 的指定产物，截断 4000 字符
    - 不存在的 Feature/产物返回明确错误
  - **验收**: 正确展开内容；错误处理正确
  - **验证**: CLI 测试

- [ ] TASK-008: 新增测试
  - **依赖**: TASK-001 ~ TASK-007
  - **文件**: 
    - `test/context-budget.test.mjs`（新增）
    - `test/cross-feature-filter.test.mjs`（新增）
    - `test/context-subagent-contract.test.mjs`（新增）
  - **范围**:
    - 预算截断：超预算降级、优先级顺序、全局不变量保留
    - cross-feature 评分：path/tag/domain 重叠、Top-N
    - cross-feature-index 命令：JSON 格式
    - expand 命令：内容展开 + 错误处理
    - 向后兼容：无 paths/budget 时行为不变
  - **验收**: 所有测试通过
  - **验证**: `node --experimental-vm-modules node_modules/.bin/jest` 或现有测试运行器

- [ ] TASK-009: 构建验证 + 确认现有测试通过
  - **依赖**: TASK-008
  - **文件**: 无（验证任务）
  - **范围**:
    - `pnpm run sovei:build` 通过
    - 全部测试（原 137 + 新增）通过
    - `tsc --noEmit` 通过
  - **验收**: 构建零错误，测试全绿
  - **验证**: 命令行执行
