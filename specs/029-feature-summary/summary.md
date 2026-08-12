# Feature Summary — 029-feature-summary

> 由 `sovei feature summary` 生成。

## 概览

- **状态**: in_progress
- **风险等级**: S1
- **阶段进度**: 7/12（load → grill → wayfind → spec → scope → plan → tasks）
- **任务完成**: 0
- **门禁覆盖**: 0

## 需求

# Load Summary — 029-feature-summary

> Feature：`sovei feature summary <id>` — 从 Feature 事件流 + 各阶段产物生成聚合人可读视图（P1-2）
> 阶段：load（已完成探索）

## 关键决策

### D1: 写入 Feature 目录**顶层**，命名为 `summary.md`。

- **决策**: 写入 Feature 目录**顶层**，命名为 `summary.md`。
- **理由**: summary 是**跨阶段聚合的人可读产物**，不是某个阶段的中间过程产物。放顶层与 archive 白名单持久文件（decision-log / sync-report / load-summary / wayfinder）语义一致——它是"要长期保留给人看"的产物。放 `_archive/` 会违背"归档=过程产物"的语义，且被折叠后难以被 `context build` 感知。
- **被拒绝方案**: 写入 `_archive/`（混淆持久/过程产物边界）；写入 `docs/` 独立目录（引入 clone 后不可见的新问题，DEV_BACKLOG 已否决独立 docs 思路）。

### D2: **不要求状态为 completed**。对任何状态都生成 summary，但对缺失的阶段/产物做防御性降级：缺失的阶段显示为"未执行"，缺失的产物段显示为"无"。

- **决策**: **不要求状态为 completed**。对任何状态都生成 summary，但对缺失的阶段/产物做防御性降级：缺失的阶段显示为"未执行"，缺失的产物段显示为"无"。
- **理由**: summary 的价值在于"看懂一个 Feature 走到哪、做了什么"。对 in_progress 的 Feature，它能作为进度快照；对归档后的 Feature（过程产物在 `_archive/`），它能还原完整故事线。若强约束 completed 且产物齐全，会大幅缩小适用场景（很多 Feature 未走完）。
- **被拒绝方案**: 只允许 completed（过度约束，覆盖不到 in_progress 快照场景）；产物缺失直接报错（对 reopen/归档后场景不友好）。

### D3: 支持 `--json`。默认输出 Markdown 的 `summary.md`；`--json` 时打印结构化 JSON（阶段事件、产物清单、任务、门禁覆盖、决策条目）。

- **决策**: 支持 `--json`。默认输出 Markdown 的 `summary.md`；`--json` 时打印结构化 JSON（阶段事件、产物清单、任务、门禁覆盖、决策条目）。
- **理由**: 与 P2-1 `--json` 全覆盖方向一致，summary 是典型的"聚合视图"，脚本/CI 消费 JSON 有价值（如自动生成发布说明、Feature 索引）。成本低——summary 内部本就是结构化数据组装，渲染 Markdown 只是一层输出格式。
- **被拒绝方案**: 只输出 Markdown（放弃脚本消费能力）；`--json` 仅打印路径不打印内容（无实质价值）。

### D4: 按 DEV_BACKLOG P1-2 定义的"需求→决策→变更→验证→经验"故事线，从事件流 + 产物组装以下章节：

- **决策**: 按 DEV_BACKLOG P1-2 定义的"需求→决策→变更→验证→经验"故事线，从事件流 + 产物组装以下章节：
- **理由**: 这 8 个维度恰好覆盖 P1-2 要求的完整故事线，且每个都能从现有结构化数据确定性提取，不引入主观推测。
- **被拒绝方案**: 直接拼接各阶段 .md 全文（信噪比低，DEV_BACKLOG 已指出阶段产物本身已是摘要，再蒸馏一层意义有限——但 summary 是**跨阶段聚合**而非再蒸馏，价值在于把分散的时间线/决策/产物收拢成一眼看完的视图）。

### D5: 读取产物时按"顶层优先，`_archive/` 回退"策略：先读顶层 `specs/<id>/<file>`，若不存在则读 `specs/<id>/_archive/<file>`。

- **决策**: 读取产物时按"顶层优先，`_archive/` 回退"策略：先读顶层 `specs/<id>/<file>`，若不存在则读 `specs/<id>/_archive/<file>`。
- **理由**: archive 会把 spec.md / change-manifest.md 等过程产物移入 `_archive/`。summary 要对归档后的 Feature 也能还原故事线，必须能读到这两处。顶层优先保证未归档（当前活跃）Feature 读顶层，归档后自动回退。
- **被拒绝方案**: 只读顶层（归档后 summary 大量缺章节，价值大打折扣）；只读 `_archive/`（未归档 Feature 读不到）。

## 变更

TASK-001: 在 `src/cli/commands/feature.ts` 实现 `feature summary <id> [--json]` — 新增 `summaryFeature()` 核心函数（读 workflow-state.yaml + workflow-events.jsonl + 各阶段产物，`_archive/` 回退，组装 SummaryData，渲染 markdown 或 JSON），新增 `feature summary` 子命令注册，`PERSISTENT_FILES` 白名单加入 `summary.md`
TASK-002: 新增 `test/feature-summary.test.mjs` — 覆盖：completed Feature 生成 summary.md 六章节、归档后 `_archive/` 回退、in_progress 进度快照、`--json` 输出合法字段、Feature 不存在报错、写入走 StorageBackend

## 验证

*无门禁覆盖记录*

## 经验

*见 learning-report.md / knowledge-delta.md*

## 结论

*见 sync-report.md 结论段*
