# 决策日志

> 由 Sovei 阶段生成：grill
> Feature：006-workflow-topology-fix
> 目的：修复 Sovei 工作流阶段定义的业务拓扑问题

## 待修复问题清单（已核实）

### 事实核实（源码直接查证）

#### D1. `spec` 的 `requiredArtifacts` 缺少 `wayfinder.md`
- **类型**：事实核实
- **内容**：`packages/sovei-core/src/stages/index.ts:163` 中 `specStage.contract.requiredArtifacts` 仅声明 `['decision-log.md']`；`workflow-engine.ts:45` 的 spec 阶段 `requiredArtifacts` 同样是 `['decision-log.md']`。而 `wayfind` 阶段产出 `wayfinder.md`（`index.ts:116`，`workflow-engine.ts:44`），却**没有任何阶段的 requiredArtifacts 引用 `wayfinder.md`**。
- **证据**：`wayfinder.md` 在所有 12 阶段的 `requiredArtifacts` 中均未出现。
- **状态**：已决

#### D2. `grill` 的 next 声明矛盾
- **类型**：事实核实
- **内容**：`index.ts:74` 中 `grillStage.execute` 返回 `nextStage: 'spec'`，但 `workflow-engine.ts:43` 中 `grill.next` 为 `['wayfind', 'spec']`。实际状态机走 `stageOrder`（`workflow-engine.ts:37-40`），wayfind 在 grill 之后、spec 之前，为必经阶段。`index.ts` 的 `nextStage: 'spec'` 是误导性字段。
- **状态**：已决

#### D3. `spec` 的 producesArtifacts 声明矛盾
- **类型**：事实核实
- **内容**：`index.ts:164` 中 `specStage.contract.producesArtifacts` 仅声明 `['spec.md']`，但 `workflow-engine.ts:45` 声明 `['spec.md', 'reconciliation.md']`，且 `specStage.postExecute`（`index.ts:225-230`）强制校验 `spec.md` 与 `reconciliation.md` **两者都必须存在**。声明与实际校验不一致，若 `list-stages` 读取 `index.ts` 的 contract，会遗漏 `reconciliation.md`。
- **状态**：已决

### 可推断决策（证据指向明确最优解）

#### D4. 修复策略：统一 contract 声明到权威事实源
- **类型**：可推断决策
- **内容**：以 `workflow-engine.ts` 的 `DEFAULT_WORKFLOW` 为权威编排事实源（它同时驱动状态机推进与产物校验），将 `index.ts` 各阶段的 `nextStage` / `producesArtifacts` 字段与其对齐：
  - grill 的 `nextStage` 改为与 `['wayfind','spec']` 语义一致的表述（实际状态机走 wayfind）。
  - spec 的 `producesArtifacts` 补上 `reconciliation.md`。
- **理由**：`workflow-engine.ts` 是状态机 + 事件回放 + 产物契约的实际执行方（`WorkflowEngine` 构造时使用 `DEFAULT_WORKFLOW`），`index.ts` 的 contract 主要用于 CLI 展示与知识加载。两处不一致会导致 `list-stages` 展示与真实执行校验不符。
- **被拒绝方案**：修改 `DEFAULT_WORKFLOW` 去匹配 `index.ts`。被拒绝理由：`workflow-engine.ts` 的声明与 `postExecute` 实际校验一致，是运行时事实，应作为基准。
- **状态**：已决

#### D5. 修复策略：让 `wayfinder.md` 进入 `spec` 的 requiredArtifacts
- **类型**：可推断决策
- **内容**：将 `specStage`（`index.ts` 与 `workflow-engine.ts`）的 `requiredArtifacts` 由 `['decision-log.md']` 扩展为 `['decision-log.md', 'wayfinder.md']`。
- **理由**：源码中 wayfind 是**强制顺序阶段**（`stageOrder` 必经，`canExecuteStage` 通过 `currentStage === stage` 严格校验，无法跳过），且 spec prompt（`index.ts:178-179`）要求"已接受的决策"作为输入。因此 `wayfinder.md` 是 spec 的实际前置输入，应纳入产物契约，消除当前"孤儿产物"断链。
- **被拒绝方案**：不修改 requiredArtifacts。被拒绝理由：会继续保留拓扑断链，spec 阶段可绕过 wayfind 的决策消歧结果，违背"规格驱动实施"的完整性。
- **状态**：已决

#### D6. `load` 的无产物定位：保持现状
- **类型**：可推断决策
- **内容**：`loadStage.contract` 维持 `requiredArtifacts: []`、`producesArtifacts: []`。其副作用是 `preExecute` 调用 `ctx.knowledge.loadByTaskType('general')` 加载知识，且作为状态初始化入口（`bootstrap` 写入 `BOOTSTRAP` 事件，`workflow-state.yaml` 仅为事件回放缓存）。
- **理由**：load 的设计意图是"引导 + 状态校验 + 知识加载"，不产生 feature 产物是刻意的，非缺陷。其状态推进由事件回放保证，不属于断链。
- **被拒绝方案**：为 load 伪造一个产物。被拒绝理由：违背其"无产物入口"语义，且无消费者。
- **状态**：已决

## 未决项清单

- 无。上述 D1-D6 均已依据源码事实或明确证据解决，未发现需要用户额外裁决的范围性决策。
