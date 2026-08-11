# Feature 016 — Reconciliation

## Need Translation

| PM 需求 | 技术理解 |
|---|---|
| "外部 skills 配置了但没用到" | `completeStage` 不检查 `prepareStage` 是否被调用，skill 注入被绕过 |
| "走工作流解决" | 强制 complete 前必须先 prepare，通过事件溯源追踪 preparation 状态 |

## Current State

`prepareStage`（workflow-engine.ts:115-278）负责：
1. 校验阶段可执行
2. 运行 preExecute 钩子
3. 检查依赖产物
4. 执行阶段逻辑，生成 prompt
5. 注入外部 skill body 到 prompt
6. 创建缺失的模板文件

`completeStage`（workflow-engine.ts:281-326）负责：
1. 校验产出产物（非模板）
2. 追加 STAGE_COMPLETE 事件
3. 返回新状态

两者之间没有状态关联。`WorkflowState` 没有 `preparedStages` 字段。

## Solutions

### Solution A: 事件溯源追踪 preparation（推荐）

- 新增 `STAGE_PREPARED` 事件 + `preparedStages` 字段
- `prepareStage` 追加事件
- `completeStage` 检查 + 消费
- cost: 修改 types.ts + state-machine.ts + workflow-engine.ts + event-store.ts

### Solution B: 副作用标记文件

- prepare 时写 `.prepared` 文件，complete 时检查并删除
- cost: 不在审计链中，不符合事件溯源模式

### Solution C: completeStage 中重新调用 prepareStage

- cost: 语义错误（prepare 有副作用），且无法保证 AI 遵循 prompt

**选择 Solution A。**

## Questions

无未决问题。所有决策已在 decision-log.md 中记录。

## Sign-off

- [x] product: self-verified (S1)
- [x] tech: self-verified (S1)
