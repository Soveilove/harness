# Feature 016 — Coverage Matrix

| AC | 文件 | 状态 |
|---|---|---|
| AC1: completeStage throw | workflow-engine.ts | ✅ TASK-003 |
| AC2: STAGE_PREPARED 事件 | types.ts + state-machine.ts + workflow-engine.ts | ✅ TASK-001/002/003 |
| AC3: STAGE_COMPLETE 消费 | state-machine.ts | ✅ TASK-002 |
| AC4: REOPEN/CHANGE 清除 | state-machine.ts | ✅ TASK-002 |
| AC5: 向后兼容 | 不修改旧事件 | ✅ |
| AC6: preparedStages 字段 | types.ts | ✅ TASK-001 |
