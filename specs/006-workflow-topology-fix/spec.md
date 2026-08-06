# 功能规格

> 由 Sovei 阶段生成：spec
> Feature：006-workflow-topology-fix
> 标题：修复工作流阶段定义的业务拓扑断链与声明不一致

## 需求翻译（做什么 / 不做什么）

### 做什么
1. 消除 `wayfinder.md` 产物断链：让 `spec` 阶段在产物契约层正式依赖 `wayfinder.md`，使 wayfind 的决策消歧结果被 spec 消费。
2. 统一 `grill` 与 `spec` 两阶段在 `index.ts` 与 `workflow-engine.ts` 中的 contract 声明，消除字段矛盾。
3. 保持 `load` 阶段的无产物设计意图不变（它不是缺陷）。

### 不做什么
- 不重构 `state-machine.ts` 的 `stageOrder` 顺序推进逻辑。
- 不修改 `change-control` / `reopen` / `knowledge` 等旁路或全局治理系统。
- 不改变现有已完成 feature（001/002/003/004/005）的状态或产物。
- 不为 `load` 阶段伪造产物。

## 用户可见行为（验收标准）

### 场景 1：`list-stages` 展示与真实执行一致
- **Given** 运行 `sovei workflow list-stages`
- **When** 查看 spec 阶段的 producesArtifacts 与 grill 阶段的 next
- **Then** spec 阶段声明产出 `spec.md` 和 `reconciliation.md` 两者；grill 的 next 与 wayfind→spec 顺序一致

### 场景 2：spec 阶段强制依赖 wayfind 产物
- **Given** 一个 feature 已完成 grill 与 wayfind
- **When** 运行 spec 阶段
- **Then** spec 的 requiredArtifacts 校验包含 `wayfinder.md`（以及 `decision-log.md`），缺少时无法通过校验

### 场景 3：现有功能不回归
- **Given** 已完成的 feature（如 002-agent-knowledge-runtime）
- **When** 运行其工作流状态查询
- **Then** 状态保持 completed，不受 contract 变更影响

## 边界与排除项
- 本次修改仅涉及 `packages/sovei-core/src/stages/index.ts` 与 `packages/sovei-core/src/engine/workflow-engine.ts`。
- 不改动已生成的 `specs/` 下历史 feature 产物。
- 不改动 CLI 命令行为本身（`workflow.ts`），仅对齐阶段定义数据。
