# Feature 016 — Plan

1. **types.ts**: 添加 `STAGE_PREPARED` 到 WorkflowEvent 联合类型；添加 `preparedStages: string[]` 到 WorkflowState
2. **state-machine.ts**: `createInitialState` 添加 `preparedStages: []`；处理 `STAGE_PREPARED` 事件（add to preparedStages）；`STAGE_COMPLETE` 移除已完成阶段；`REOPEN` 和 `CHANGE_DECLARED` 清除相关 preparedStages
3. **workflow-engine.ts**: `prepareStage` 在返回前追加 `STAGE_PREPARED` 事件；`completeStage` 检查 `preparedStages`
4. **测试**: 添加 prepare-then-complete 流程测试和 skip-prepare-throw 测试
