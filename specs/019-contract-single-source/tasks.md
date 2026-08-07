# Tasks: 019-contract-single-source

> 阶段：tasks
> 性质：wide refactor（删除共享类型 `StageConfig`/`WorkflowDefinition.stages`），采用"类型先行→编译暴露→清理→验证"顺序。改动点少（5 文件），`stageOrder.includes` 与 `workflow.stages[stage]` 语义等价，无需保留旧字段过渡。

- [ ] TASK-001: 删除 `types.ts` 的 `StageConfig` 接口与 `WorkflowDefinition.stages` 字段；`getWorkflowVersion()` 改返回 '3.0.0'
  - Blocked by: None（类型层先行）
  - 交付：WorkflowDefinition 回归纯编排语义；删除后 tsc 会暴露所有 stages 残留引用点

- [ ] TASK-002: state-machine.ts 5 处合法阶段 guard 改 `stageOrder.includes`（STAGE_COMPLETE/CHANGE_DECLARED/REOPEN/canExecuteStage）
  - Blocked by: TASK-001
  - 交付：state-machine 不再依赖 workflow.stages，对非法 stage 仍抛 `Unknown stage`，reducer 保持纯函数

- [ ] TASK-003: workflow-engine.ts 删除 `DEFAULT_WORKFLOW.stages` 与构造器 stages 拷贝；`archiveInvalidatedArtifacts` 改从 `stageRegistry.get(stage).contract.producesArtifacts` 取
  - Blocked by: TASK-001
  - 交付：DEFAULT_WORKFLOW 无 stages；归档产物列表从 SSOT 取，归档行为不变

- [ ] TASK-004: config/loader.ts `DEFAULT_CONFIG.workflow.version` bump '2.0.0'→'3.0.0'
  - Blocked by: TASK-001
  - 交付：版本号语义升级；版本不匹配仅警告不 throw

- [ ] TASK-005: 编译验证 + 清理残留引用（`pnpm run check`，逐一修复 tsc 报错直到无残留）
  - Blocked by: TASK-001, TASK-002, TASK-003, TASK-004
  - 交付：tsc --noEmit 通过，无 `StageConfig`/`.stages[` 源码残留

- [ ] TASK-006: 构建 + 全量测试回归（`pnpm run sovei:build` + `pnpm test`，109/109 通过）；抽验 list-stages 输出与全链路 prepare/complete
  - Blocked by: TASK-005
  - 交付：行为回归验证通过，对应 spec AC3-AC8

## 依赖图

```
TASK-001 (类型删除)
   ├──→ TASK-002 (state-machine)
   ├──→ TASK-003 (workflow-engine)
   └──→ TASK-004 (loader version)
            ↓ (全部)
        TASK-005 (编译清理)
            ↓
        TASK-006 (构建+测试回归)
```
