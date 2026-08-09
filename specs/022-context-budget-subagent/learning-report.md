# Learning Report: 022-context-budget-subagent

> 上下文包膨胀治理 + IDE 子 Agent 契约

## 观察分类

### 1. 领域级观察：shadow policy 激活模式

**来源**: Feature 022
**证据**: `context/policy.ts` 已有三变体（full/scoped/indexOnDemand）基础设施，但 `actual: 'full'` 硬编码导致削减能力从未使用。本 Feature 仅通过扩展类型 + 根据输入自动选择 actual 就激活了已有基础设施。
**适用范围**: 任何"基础设施已就位但开关未打开"的场景
**建议目标**: candidate

### 2. 领域级观察：预算截断应在策略层而非构建层

**来源**: Feature 022
**证据**: `buildContextPack` 负责组装（收集所有项），`buildContextPolicy` + `applyBudget` 负责策略（决定哪些项实际交付）。分离构建和策略使得截断逻辑可独立测试、可组合。
**适用范围**: 上下文管理 / 数据流设计
**建议目标**: candidate

### 3. 领域级观察：子 Agent 契约 = 结构化 JSON + on-demand expand

**来源**: Feature 022
**证据**: `cross-feature-index` 输出 JSON 索引（不含 content），`expand` 按需展开单个项。这种"索引 + 展开"模式让宿主 AI 可以自行决定并行化策略（分派 N 个子 Agent 各读一个 Feature），而不需要 CLI 内部实现并发。
**适用范围**: CLI 与宿主 AI 的协作设计
**建议目标**: candidate

### 4. 预存 bug 发现：FilesystemStorage.list() 只返回文件不返回目录

**来源**: Feature 022
**证据**: `context.ts` 的 cross-feature 加载原使用 `storage.list()` 获取 Feature 目录列表，但 `FilesystemStorage.list()` 用 `readdir` + `filter(e.isFile())` 只返回文件。导致 cross-feature 加载在文件系统存储下静默失败（只找到 `.gitkeep`，过滤后为空数组）。而 `MemoryStorage.list()` 的实现不同（返回路径段），所以单元测试用 MemoryStorage 不会发现此 bug。
**适用范围**: 存储抽象 / 测试策略
**建议目标**: candidate

### 5. 实现细节（不沉淀）：评分算法权重

path×3 + tag×2 + domain×1 的权重选择是一次性实现细节，不是领域级知识。如果未来引入 embedding 或其他评分方式，这个权重就没意义了。
**建议目标**: rejected

### 6. 实现细节（不沉淀）：默认预算值 32768

32768 字符是拍脑袋的默认值，需要真实使用数据调优。不是领域级知识。
**建议目标**: rejected

## 实施偏差

- **计划 vs 实际**：plan.md 中 `applyBudget` 的接口设计是 `applyBudget(items, budget, options)`，实际实现完全一致。
- **预存 bug 修复**：scope.md 和 plan.md 未预料到 `FilesystemStorage.list()` 的 bug，在实现 TASK-005 时发现并修复。这是实施过程中发现的新决策，已在 change-manifest.md 中记录。
- **测试数量**：计划 ~8 条测试，实际 19 条（更充分覆盖了评分排序、untouchable、错误处理等场景）。

## 架构健康变化

- `context/policy.ts` 复杂度略增（+43 行），但新增逻辑有清晰边界（actual 选择 + budget 集成是独立步骤）。
- 新增 2 个纯函数模块（`budget.ts` + `cross-feature.ts`），无副作用，无外部依赖，可独立测试。
- 无新依赖循环，无职责膨胀。

## 知识提取

```yaml:knowledge-delta
observations:
  - title: "基础设施已就位但开关未打开时，优先激活而非重建"
    type: rule
    content: "当削减/优化能力的基础设施已实现（如 shadow policy 三变体），但实际开关硬编码为默认值（如 actual='full'）时，应优先通过扩展类型 + 自动选择来激活已有基础设施，而非重新设计。最小改动原则：只扩展类型和赋值逻辑，不重构整个结构。"
    tags: [context, policy, activation, infrastructure]
    category: candidate
    evidence: "Feature 022 发现 context/policy.ts 的 scoped/indexOnDemand 变体已完整实现，但 actual='full' 硬编码导致从未用于实际削减。仅通过扩展 actual 类型为联合类型 + 根据 paths 自动选择就激活了已有能力。"
    relatedEntryId: null

  - title: "预算截断应在策略层施加，不在构建层"
    type: rule
    content: "上下文/数据组装（收集所有项）和策略（决定哪些项实际交付）应分离。构建层负责完整收集，策略层负责截断/降级。这样截断逻辑可独立测试、可组合，且不影响构建逻辑的正确性。"
    tags: [context, budget, separation, strategy]
    category: candidate
    evidence: "Feature 022 的 buildContextPack 负责组装所有 required/suggested 项，buildContextPolicy + applyBudget 负责按预算截断。两者分离使得截断逻辑有独立的 5 条测试覆盖。"
    relatedEntryId: null

  - title: "CLI 与宿主 AI 协作：索引 JSON + on-demand expand 模式"
    type: architecture
    content: "CLI 提供结构化 JSON 索引（不含完整内容）+ 按需展开命令，让宿主 AI 自行决定并行化策略。CLI 不需要内部实现并发，只需要提供'可被并行消费的契约'。这种模式适用于任何'CLI 单进程 + 宿主 AI 可分派子 Agent'的场景。"
    tags: [cli, subagent, contract, parallel]
    category: candidate
    evidence: "Feature 022 的 cross-feature-index 输出 JSON 索引，expand 按需展开。宿主 AI（如 CodeBuddy Task）可据此分派 N 个子 Agent 各读一个 Feature 的 decision-log，并行化串行 I/O。"
    relatedEntryId: null

  - title: "存储抽象的 list() 语义在不同实现间可能不一致"
    type: pitfall
    content: "FilesystemStorage.list() 用 readdir + filter(isFile) 只返回文件，而 MemoryStorage.list() 返回路径段（隐含目录）。这种语义差异导致用 MemoryStorage 写的单元测试无法发现 FilesystemStorage 的目录列表 bug。测试存储抽象时应同时验证两种实现的语义一致性，或用 FilesystemStorage 做集成测试。"
    tags: [storage, testing, filesystem, memory]
    category: candidate
    evidence: "Feature 022 发现 context.ts 的 cross-feature 加载用 storage.list() 获取 Feature 目录，在 FilesystemStorage 下静默失败（只返回 .gitkeep 文件），但 MemoryStorage 下正常工作。已改用 listEntries() 修复。"
    relatedEntryId: null
```
