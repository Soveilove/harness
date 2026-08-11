# Convergence Report: 022-context-budget-subagent

> 收敛检查：实现与 Spec/Plan 契约对比

## 检查方法

逐项核对 spec.md 的验收标准（AC1~AC6）与 change-manifest.md 的实际实现，分类差距。

## 收敛结果

### AC1: shadow policy actual 激活 — ✅ 满足

**证据**: 
- `policy.ts`: `actual` 类型已扩展为 `'full' | 'scoped' | 'index+on-demand'`
- 有 paths 时 `actual = 'scoped'`，无 paths 时 `actual = 'full'`
- `actualReason` 字段非空，描述选择理由
- 测试 `context-policy.test.mjs` 验证 `actual === 'scoped'` 和 `actualReason.length > 0`

**差距**: 无

### AC2: 字符预算截断 — ✅ 满足

**证据**:
- `budget.ts`: `applyBudget()` 按优先级截断，超预算项降级为 240 字符索引摘要
- `policy.ts`: 有 budget 时调用 `applyBudget`，超预算设 `status = 'over-budget'`
- 全局不变量红线（untouchableIds）不被截断
- 测试 `context-budget.test.mjs` 5 条全部通过

**差距**: 无

### AC3: cross-feature 过滤 — ✅ 满足

**证据**:
- `context.ts`: `--cross-feature` 使用 `extractFeatureMeta` + `scoreCrossFeature` 取 Top-N
- 默认 limit=5，`--cross-feature-limit` 可调整
- 按 relevanceScore 降序排列
- 当前 Feature 自身不出现在列表中
- 测试 `cross-feature-filter.test.mjs` 验证评分和 Top-N

**差距**: 无

### AC4: cross-feature-index 命令 — ✅ 满足

**证据**:
- `context.ts`: 新增 `context cross-feature-index <feature>` 子命令
- 输出 JSON 数组：featureId + decisionLogPath + title + relevanceScore + tags
- 不加载 content，仅输出索引
- 测试 `context-subagent-contract.test.mjs` 验证输出格式

**差距**: 无

### AC5: context expand 命令 — ✅ 满足

**证据**:
- `context.ts`: 新增 `context expand <feature-id> <artifact-name>` 子命令
- 读取指定 Feature 的指定产物，截断 4000 字符
- 不存在的 Feature/产物返回明确错误
- 测试 `context-subagent-contract.test.mjs` 验证展开和错误处理

**差距**: 无

### AC6: 向后兼容 — ✅ 满足

**证据**:
- 无 `--paths`、无 `--budget` 时，`actual = 'full'`，行为与 v2.5.7 一致
- 全部 156 条测试通过（原 137 + 新增 19）
- `quick/run.ts` 的 `QuickPolicySummary` 不受影响（`summarizePolicy` 不引用 `shadow.actual`）

**差距**: 无

## 额外发现

### 预存 bug 修复：FilesystemStorage.list() 不返回目录

**严重度**: 中（影响 cross-feature 加载在生产环境的正确性）
**分类**: missing（预存缺陷，非本 Feature 引入）
**处置**: 已在本 Feature 中修复——`context.ts` 的 cross-feature 加载从 `storage.list()` 改为 `storage.listEntries()` 并过滤 `isDirectory`。两处（`context build --cross-feature` 和 `cross-feature-index` 命令）均已修复。
**证据**: 测试 `context-subagent-contract.test.mjs` 使用 `FilesystemStorage` 验证目录列表正确返回。

## 架构健康检查

- **新依赖循环**: 无。新增模块 `budget.ts` 和 `cross-feature.ts` 只依赖 `builder.ts` 和 `policy.ts` 的类型，无反向依赖。
- **既有热点**: `context/policy.ts` 复杂度略增（新增 actual 选择 + budget 集成），但逻辑清晰、有测试覆盖，未达治理阈值。
- **职责膨胀**: 无。`budget.ts` 和 `cross-feature.ts` 是独立纯函数模块，职责单一。

## 结论

所有验收标准满足，无高严重度发现。预存 bug 修复是附带收益。可以进入 verify 阶段。
