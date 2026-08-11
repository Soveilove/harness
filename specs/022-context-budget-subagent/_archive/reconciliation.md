# Reconciliation: 022-context-budget-subagent 上下文包膨胀治理 + IDE 子 Agent 契约

## Need Translation

**PM 原话**：上下文膨胀这个需要解决一下，然后就是一个加载问题，我想要看看 ide 是否有能加载子 agent 解决一些问题，比如我们的 codebuddy、codex、cc 等之类的。

**技术理解**：
1. **上下文包膨胀（P1-3）**：`sovei context build` 产出的上下文包随 Feature 积累单调增长，需要引入预算上限 + 激活已有 shadow policy scoped 变体 + cross-feature 相关性过滤。
2. **IDE 子 Agent 加载**：探索 CodeBuddy/Codex/Claude Code 等宿主 AI 的子 Agent 能力，让 Sovei CLI 输出结构化 JSON 供宿主 AI 分派子 Agent 并行加载 cross-feature decision-log，解决串行 I/O 瓶颈。

## Current State

### context/builder.ts
- `buildContextPack` 将所有 active 红线、stable 知识、required 规范、Feature 产物塞入 `required`，无预算上限
- Feature 产物每个截断 4000 字符，无聚合 cap
- `suggested` 限制 20 条但每条无字符上限
- cross-feature 全量加载到 suggested

### context/policy.ts
- `buildContextPolicy` 已实现三变体：`full`（全量）、`scoped`（按 path 筛选）、`index+on-demand`（全索引）
- `actual: 'full'` 硬编码——三变体仅作影子对比，不影响实际交付
- `matchesTarget` 用简单字符串包含匹配
- 无预算/截断逻辑

### cli/commands/context.ts
- `--cross-feature` 遍历所有 specs 目录，串行读取 decision-log.md
- 无相关性过滤，无 Top-N 限制
- `--paths` 仅用于 project rules 匹配，不影响 required 红线/知识筛选

### Feature 021 的影响
- `quick --json` 输出已从 117KB 降至 37KB（QuickPolicySummary 摘要类型）
- 但标准 `context build` 输出仍可能很大，P1-3 未解

## Solutions

### Solution A: 激活 scoped + 预算截断 + cross-feature 过滤 + 子 Agent 契约（推荐）

- **描述**：
  1. 扩展 `shadow.actual` 类型为 `'full' | 'scoped' | 'index+on-demand'`，有 paths 时默认 scoped
  2. 新增 `applyBudget()` 函数，按优先级截断超预算项
  3. cross-feature 按 path/tag/domain 重叠度评分选 Top-N
  4. 新增 `cross-feature-index` 和 `expand` CLI 命令供子 Agent 使用
- **cost**: 改动 policy.ts 类型 + 新增 budget.ts + 改 context.ts CLI + 新增 2 个 CLI 命令 + ~8 条测试。中等复杂度，但基础设施已就位。

### Solution B: 仅激活 scoped + 预算截断（不含子 Agent 契约）

- **描述**：只做方案 A 的前两项，不新增 CLI 命令
- **cost**: 改动更小，但 cross-feature 串行 I/O 瓶颈未解，且用户明确要求探索子 Agent 方向

### Solution C: 全量重写 context 系统

- **描述**：重新设计 ContextPack 结构，引入 token-level 预算、embedding 相关性搜索
- **cost**: 过度工程化，违反零运行时依赖原则，且现有 shadow policy 基础设施已经够用

## Questions

### [tech] Q1: 默认预算值 32768 字符是否合理？

- recommendation: 是。32768 字符 ≈ 8K tokens，留足空间给 Agent 推理。可通过 `--budget` 调整。等真实使用数据后再调优（P2-6）。

### [tech] Q2: cross-feature 相关性评分用简单重叠度还是引入 embedding？

- recommendation: 简单重叠度。path 重叠 ×3 + tag 重叠 ×2 + domain 重叠 ×1。不引入外部依赖，精度足够用于"过滤掉明显无关的 Feature"。

## Sign-off

- [x] product: by: user date: 2026-08-10 ref: chat-confirmation
- [x] tech: by: ai-agent date: 2026-08-10 ref: decision-log D1-D6
