# Feature 016 — Change Manifest

| Task | 文件 | 说明 |
|---|---|---|
| TASK-001 | `packages/sovei-core/src/engine/types.ts` | 添加 `STAGE_PREPARED` 事件 + `preparedStages` 字段 |
| TASK-002 | `packages/sovei-core/src/engine/state-machine.ts` | 处理 STAGE_PREPARED / STAGE_COMPLETE 消费 / REOPEN+CHANGE 清除 |
| TASK-003 | `packages/sovei-core/src/engine/workflow-engine.ts` | prepareStage 追加事件 + completeStage 检查 |
| TASK-004 | `packages/sovei-core/test/workflow.test.mjs` | +2 测试 + 修复 3 个现有测试 |
| — | `packages/sovei-core/test/skill-runtime.test.mjs` | 修复 4 个测试（添加 prepareStage 调用） |
| — | `packages/sovei-core/test/wayfinder.test.mjs` | 修复 1 个测试（添加 STAGE_PREPARED 事件） |
| — | `packages/sovei-core/test/project.test.mjs` | 修复 1 个 CLI 测试（添加 prepare 步骤） |
