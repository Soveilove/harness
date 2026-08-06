# 学习报告

> 由 Sovei 阶段生成：learn
> Feature：006-workflow-topology-fix

## 观察分类

### O1：两套 contract 数据源并存（架构债务，candidate 晋级提案）
- **来源 Feature**：006-workflow-topology-fix
- **证据**：`src/stages/index.ts`（stageRegistry，供 list-stages/prepareStage/completeStage）与 `src/engine/workflow-engine.ts`（DEFAULT_WORKFLOW，供状态机推进）各自维护一份阶段契约，本次修复需同步两处。任何单点修改都可能在两处间产生不一致（本次就发现 grill.nextStage 与 spec.producesArtifacts 两处矛盾）。
- **适用范围**：通用（sovei-core 内部架构）。
- **建议目标**：candidate 知识（pitfall 类）。建议长期引入单一契约事实源（如让 `DEFAULT_WORKFLOW` 成为唯一来源，`index.ts` 的 contract 由它派生或校验），消除重复维护。
- **状态**：candidate（不直接晋级 stable，需多 Feature 证据 + 人工审查）。

### O2：wayfind 完成校验要求 map 有票据或 skip（仅项目适用）
- **来源 Feature**：006-workflow-topology-fix
- **证据**：`validateWayfinderCompletion` 要求 map 有决策票据或 fog，否则需 `wayfinder skip`；已 chart 的地图不能 skip，需 addTicket+resolve。这是工作流的一个明确约束：wayfind 阶段要么走 skip（单会话），要么有票据。
- **适用范围**：项目专用（sovei 工作流使用规范）。
- **建议目标**：记录为使用规则，帮助后续 Feature 避免"chart 后无法 skip"的困惑。
- **状态**：仅项目适用。

### O3：contract 变更需核对 change 旁路（candidate 晋级提案）
- **来源 Feature**：006-workflow-topology-fix
- **证据**：`spec.requiredArtifacts` 加入 `wayfinder.md` 后，`change-control.test.mjs` 的 `002-pivot` fixture（伪造 wayfind 完成但缺 wayfinder.md）立即暴露。契约变更的影响面不止主链路，还会波及 change/reopen 旁路。
- **适用范围**：通用。
- **建议目标**：candidate 知识（rule 类）：修改阶段 requiredArtifacts/producesArtifacts 时，需同时核查 change-control 测试与旁路路径的 fixture。
- **状态**：candidate（不直接晋级 stable）。

## 未决/拒绝模式
- 无。本次观察均为正向改进沉淀，无被拒模式。

## 结论
本次修复确认了两套 contract 数据源是架构债务根源，并发现 wayfind 完成校验与 change 旁路对契约变更敏感。以上候选知识需后续 Feature 提供更多证据后，经人工审查方可晋级 stable。
