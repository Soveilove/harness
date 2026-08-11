# Feature 016 — Scope

| 需求 | in-scope | out-of-scope |
|---|---|---|
| STAGE_PREPARED 事件 | ✅ | — |
| preparedStages 字段 | ✅ | — |
| completeStage 检查 | ✅ | — |
| REOPEN/CHANGE 清除 | ✅ | — |
| 测试 | ✅ | — |
| CLI 命令变更 | — | ❌ |
| schemaVersion 变更 | — | ❌ |

## Coverage Matrix

| AC | 产物 | 状态 |
|---|---|---|
| AC1: completeStage throw | workflow-engine.ts | ✅ |
| AC2: STAGE_PREPARED 事件 | types.ts + state-machine.ts + workflow-engine.ts | ✅ |
| AC3: STAGE_COMPLETE 消费 | state-machine.ts | ✅ |
| AC4: REOPEN/CHANGE 清除 | state-machine.ts | ✅ |
| AC5: 向后兼容 | 不修改旧事件 | ✅ |
| AC6: preparedStages 字段 | types.ts | ✅ |
