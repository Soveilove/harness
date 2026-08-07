# 决策地图

> Feature：019-contract-single-source
> 阶段：wayfind
> 状态：**已跳过决策地图**（`wayfinder skip`）

---

## 跳过理由

本 Feature 是**纯技术重构**（消除 DEV_BACKLOG P1-1 架构债务），不符合 wayfinder"大型或高不确定性 Feature"的适用场景。核心决策已在 grill 阶段全部定清：

- **Feature 范围**：只处理 P1-1（合并两套 contract 数据源），P1-2 单独排期。
- **合并方向**：方案 C——以 `stageRegistry` 的 `StageContract` 为唯一 SSOT，删除 `WorkflowDefinition.stages` 与 `StageConfig`。
- **重构形态**：`stageOrder` 承担合法阶段 guard；归档逻辑改从 `stageRegistry.contract` 取 `producesArtifacts`；12 阶段名/顺序/产物文件名不变。

仅余 2 个未决项（`WorkflowDefinition.version` bump 策略、是否发版），均明确指向 spec 阶段定，无需决策地图探索未知区域。

经 `wayfinder skip` 标记 `notRequiredReason = pure-refactor-decisions-settled-in-grill`，无决策票据、无 fog，满足 wayfind 完成条件。

详见 `decision-log.md`。
