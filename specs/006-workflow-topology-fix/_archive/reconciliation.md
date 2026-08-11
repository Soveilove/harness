# Reconciliation: 006-workflow-topology-fix 修复工作流阶段定义的业务拓扑断链与声明不一致

## Need Translation

**需求来源**（开发者）："我们的 Sovei 工作流业务拓扑有几个问题要修——wayfinder.md 没被 spec 消费，grill/spec 的 contract 声明两处不一致。"

**技术理解**：在 `sovei-core` 中，阶段定义存在两套来源——`src/stages/index.ts`（12 阶段 prompt + contract，供 CLI 展示与知识加载）与 `src/engine/workflow-engine.ts`（`DEFAULT_WORKFLOW`，驱动状态机推进与产物契约校验）。两套来源的 contract 数据不一致，导致 `list-stages` 展示与真实执行校验脱节；且 `wayfinder.md` 未进入任何阶段的 `requiredArtifacts`，构成拓扑断链。

## Current State

代码为什么是现在这个样子：

- `workflow-engine.ts:33-55` 的 `DEFAULT_WORKFLOW` 是**运行时事实源**：`stageOrder` 声明 `load→grill→wayfind→spec→...`，wayfind 为强制顺序阶段；spec 阶段 `requiredArtifacts: ['decision-log.md']`、`producesArtifacts: ['spec.md','reconciliation.md']`，其 `postExecute` 强制校验两者（`index.ts:225-230`）。
- `index.ts:74` 的 `grillStage.execute` 返回 `nextStage: 'spec'`，但 `workflow-engine.ts:43` 的 `grill.next` 为 `['wayfind','spec']`。实际状态机走 `stageOrder`，wayfind 必经。这是历史演进遗留：早期版本 wayfind 是可选旁路，后来并入强制顺序，但 `index.ts` 的 nextStage 未同步更新。
- `index.ts:164` 的 `spec.producesArtifacts` 只写 `['spec.md']`，未包含 `reconciliation.md`。`reconciliation.md` 是 spec prompt 定义的一部分（`index.ts:189-219`），postExecute 也强制校验，但 contract 声明遗漏。
- `wayfinder.md` 由 wayfind 阶段产出（`index.ts:116`），但所有阶段的 `requiredArtifacts` 均未引用它。原因：早期 wayfind 设计为可选，其产物作为人工阅读索引，而非强制输入。spec prompt 虽要求"已接受的决策"，但未通过文件契约强依赖。

## Solutions

### Solution A: 以 `workflow-engine.ts` 为基准统一声明 + 补齐 wayfinder 依赖
- 将 `index.ts` 的 `grill.nextStage` 与 `spec.producesArtifacts` 对齐到 `workflow-engine.ts`；
- 将 spec 的 `requiredArtifacts` 扩展为 `['decision-log.md', 'wayfinder.md']`（两处同步）。
- **优点**：消除声明矛盾；wayfind→spec 拓扑补全；改动集中在 2 个文件、4 处字段。
- **代价**：低。需同步 `index.ts` 与 `workflow-engine.ts`；已 completed 的 feature 不受影响（运行时校验按 revision 快照）。

### Solution B: 修改 `workflow-engine.ts` 去匹配 `index.ts`
- 把 spec 的 producesArtifacts 改为仅 `['spec.md']`，grill.next 改为 `['spec']`，并从 stageOrder 移除 wayfind。
- **优点**：让 `index.ts` 保持现状。
- **代价**：高。会改变工作流拓扑（wayfind 被移除），与 spec prompt 的决策消歧需求冲突，且与已完成 feature 的状态记录不一致。破坏性改动。

### Solution C: 仅文档化，不改源码
- 在 AGENTS.md 补充拓扑说明，承认 wayfinder.md 是"语义输入"而非"契约输入"。
- **优点**：零代码风险。
- **代价**：断链仍在，`list-stages` 展示仍与执行校验不一致，问题未真正修复。

**选定**：Solution A。

## Questions

### [tech] Q1: spec 的 requiredArtifacts 是否强制加入 `wayfinder.md`？
- recommendation: 是。wayfind 是强制顺序阶段（stageOrder 必经），且 spec prompt 已要求"已接受的决策"作为输入；补上依赖可消除断链，与"规格驱动实施"的完整性一致。
- options: [是，补上依赖] [否，保持语义依赖即可]

### [tech] Q2: 是否同步修改 `state-machine.ts` 以显式声明 wayfind 必经？
- recommendation: 否。`canExecuteStage` 已通过 `currentStage === stage` + `stageOrder` 顺序强制 wayfind，无需改动；避免扩大修改面。
- options: [否，保持现状] [是，加显式守卫]

## Sign-off
- [x] product: by: developer date: 2026-08-06 ref: 用户明确授权"执行我们的工作流来修复结论问题"
- [x] tech: by: developer date: 2026-08-06 ref: 基于源码事实 D1-D6 已核实
