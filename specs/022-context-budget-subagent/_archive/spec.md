# Spec: 022-context-budget-subagent

> 上下文包膨胀治理 + IDE 子 Agent 契约

## 问题

随着 Feature 积累，`sovei context build` 产出的上下文包单调增长，最终撑爆 Agent 上下文窗口。具体表现：
1. `required` 项无整体预算上限——所有 active 红线 + stable 知识 + required 规范 + Feature 产物全部塞入
2. `--cross-feature` 全量加载所有 Feature 的 decision-log，Feature 从 10→50→100 时 cross-feature 块从 ~36KB→360KB
3. shadow policy 的 scoped/index+on-demand 变体已实现但 `actual: 'full'` 硬编码，削减能力从未激活
4. cross-feature 加载是串行 I/O，50+ Feature 时明显瓶颈，但 IDE 子 Agent（CodeBuddy Task、CC Task）可并行化

## 用户可见行为

### U1: context build 自动削减

当 `--paths` 提供时，`sovei context build` 自动将 `shadow.actual` 设为 `scoped`，仅交付命中的红线/规范 + 全局不变量红线 + 当前 Feature 产物，其余降级为索引摘要。

### U2: 字符预算截断

`sovei context build` 接受 `--budget <chars>` 参数（默认 32768）。当上下文包总字符数超预算时，按优先级从低到高将项降级为 240 字符索引摘要。

### U3: cross-feature 相关性过滤

`--cross-feature` 不再全量加载，改为按 path/tag/domain 重叠度评分筛选 Top-N（默认 5，可通过 `--cross-feature-limit <n>` 配置）。

### U4: 子 Agent 契约 — cross-feature-index

新增 `sovei context cross-feature-index <feature>` 命令，输出 JSON 数组。每项含 `featureId`、`decisionLogPath`、`title`（从 decision-log 首行提取）、`relevanceScore`、`tags`。宿主 AI 可据此分派子 Agent 并行读取各 decision-log。

### U5: 子 Agent 契约 — context expand

新增 `sovei context expand <feature-id> <artifact-name>` 命令，按需展开单个 cross-feature 项的完整内容（截断 4000 字符）。

### U6: policy 输出含 actualReason

`ContextPolicyResult.shadow` 新增 `actualReason` 字段，记录 actual 选择理由（如 `"scoped: paths provided, 3 redlines matched, 15 candidates unloaded"`）。

## 验收标准

### AC1: shadow policy actual 激活
- `context build --paths src/context` 时，`policy.shadow.actual` = `"scoped"`
- `context build`（无 --paths）时，`policy.shadow.actual` = `"full"`（向后兼容）
- `actualReason` 字段非空且描述选择理由

### AC2: 字符预算截断
- `context build --budget 1024` 时，总字符数 ≤ 1024 + 单条最大项的 240 字符摘要（允许最后一条跨线）
- 超预算的项出现在 `shadow.scoped.unloaded` 中
- 全局不变量红线不被截断（即使超预算也保留在 required）

### AC3: cross-feature 过滤
- `context build --cross-feature` 默认最多加载 5 个 Feature 的 decision-log
- `--cross-feature-limit 10` 可调整上限
- 返回的 cross-feature 项按 relevanceScore 降序排列
- 当前 Feature 自身的 decision-log 不出现在 cross-feature 列表中

### AC4: cross-feature-index 命令
- `sovei context cross-feature-index 022-context-budget-subagent` 输出 JSON 数组
- 每项含 featureId、decisionLogPath、title、relevanceScore、tags
- 输出大小远小于全量加载所有 decision-log

### AC5: context expand 命令
- `sovei context expand 020-quick-context-governance decision-log.md` 输出该 Feature 指定产物的完整内容（截断 4000 字符）
- 不存在的 Feature 或产物返回明确错误

### AC6: 向后兼容
- 无 `--paths`、无 `--budget` 时，context build 行为与 v2.5.7 完全一致（actual='full'，无截断）
- 现有测试全部通过

## 边界

- **不修改** `buildContextPack` 的 required/suggested 构建逻辑——预算截断在 policy 层施加
- **不修改** `quick/run.ts` 的 `QuickPolicySummary`——quick 通道的精简策略不受影响
- **不实现** drift detection / 统一关系模型（独立 Feature）
- **不做** `--paths` 语义修正（P2-5，后续单独处理）

## 排除项

- 预算阈值的评测调优（需真实使用数据，P2-6）
- SA-2 ~ SA-6 其他子 Agent 强化方向
- embedding/向量搜索相关性（保持零运行时依赖）
