# Reconciliation: 002-workflow-v3-state-core Workflow v3 状态核心

## Need Translation

| PM 原话 | 技术理解 |
|---|---|
| “历史记录和数据可以直接废弃，后续完整性重构没有问题” | 不为现有 Feature、事件日志、YAML 缓存编写迁移或回放兼容；直接建立新的 v3 持久化契约。 |
| “先做一个需求，不要一次执行很多” | R1 拆为串行 Feature；本 Feature 只处理状态核心，不处理 split 聚合和 Quick 路由。 |
| “快速通道要先了解需求再判断大小” | Quick 路由暂不实现，仅保留为后续 R1.3；本 Feature 为其提供可靠状态底座。 |

## Current State

当前 `EventStore` 同时维护 `workflow-events.jsonl`、事件 replay 和 `workflow-state.yaml` 缓存；`WorkflowEngine` 的 bootstrap、stage complete、confirm、reopen 等操作都通过追加事件再 replay。`WorkflowState` 没有 schema/history 字段，旧状态还包含 Sub-change 和历史兼容语义。split 当前会前跳父层并追加 merge 事件，正是后续 R1.2 要重建的范围。

本 Feature 选择破坏性重构，不恢复旧实现的兼容层。Wayfinder 的独立决策地图不属于 Workflow v3 状态核心，保留其自身边界。

## Solutions

### Solution A：版本化 JSON 快照唯一事实源（已选）

- `workflow-state.json` 作为唯一当前状态；`history` 仅审计。
- 状态 schema 由 Zod/类型约束；读改写在锁内，临时文件原子替换并检查 revision。
- cost：需要迁移 WorkflowEngine 全部状态写入点和重写 engine fixtures；不能回放旧事件。

### Solution B：继续事件溯源并重写 reducer（拒绝）

- 保留事件日志作为事实源，修复 reducer 和 YAML 投影。
- cost：保留多事实源和历史错误语义，仍需处理事件回放、幂等、前跳和投影漂移；与已确认可废弃历史数据的前提冲突。

### Solution C：JSON 主状态 + 事件审计日志（拒绝）

- JSON 是读取源，事件只做独立审计。
- cost：双写、两套失败处理和新的同步风险；R1.1 不需要独立事件检索。

## Questions

本阶段无新增范围性问题。所有关键范围决策已在 `decision-log.md` 的 grill-me 多轮拷问中确定。

## Sign-off

- [x] product: by: user/team decision, date: 2026-08-17, ref: grill-me scope approval
- [x] tech: by: agent recommendation, date: 2026-08-17, ref: R1.1 decision-log D1-D6
