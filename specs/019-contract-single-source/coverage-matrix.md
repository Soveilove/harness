# 覆盖矩阵

> Feature：019-contract-single-source
> 阶段：scope
> 本 Feature 为纯内部引擎重构，无 UI/路由/鉴权/计费/异步回调等 Web 应用覆盖维度。下表按引擎内部的入口/状态/参数/消费者/恢复路径/测试覆盖梳理。

## 覆盖维度核对

| 维度 | 是否涉及 | 说明 |
|---|---|---|
| 入口/路由 | ✅ CLI 命令 | `sovei workflow <stage>` / `change` / `reopen` / `list-stages` 全部走 engine → state-machine |
| 状态 | ✅ WorkflowState | reducer 状态迁移逻辑不变，仅合法阶段 guard 改 stageOrder.includes |
| 参数 | ✅ WorkflowDefinition | 删除 stages 字段；version bump 3.0.0 |
| I/O | ✅ 事件日志/状态文件 | 持久化格式不变（事件 replay 恒用当前 workflow 定义） |
| 消费者 | ✅ engine/state-machine/test | 全部消费点已定位（见下） |
| 恢复路径 | ✅ replay/bootstrap | 不改 replay 语义；现有 Feature 事件可正常 replay |
| 兼容路径 | ✅ 版本警告 | workflow.version 不匹配仅 stderr 警告（loader.ts:56-63），非 throw |
| 测试证据 | ✅ 现有测试兜底 | workflow/change-control/wayfinder/skill-runtime.test.mjs |

## 消费点 → 改动映射

| 消费点（文件:行） | 原逻辑 | 新逻辑 | 测试兜底 |
|---|---|---|---|
| state-machine.ts:68 (STAGE_COMPLETE) | `!workflow.stages[event.stage]` | `!workflow.stageOrder.includes(event.stage)` | workflow.test.mjs |
| state-machine.ts:125 (CHANGE_DECLARED) | `!workflow.stages[event.target]` | `!workflow.stageOrder.includes(event.target)` | change-control.test.mjs |
| state-machine.ts:154 (REOPEN) | `!workflow.stages[event.target]` | `!workflow.stageOrder.includes(event.target)` | change-control.test.mjs |
| state-machine.ts:270 (canExecuteStage) | `!workflow.stages[stage]` | `!workflow.stageOrder.includes(stage)` | workflow.test.mjs |
| workflow-engine.ts:582 (archiveInvalidatedArtifacts) | `workflow.stages[stage].producesArtifacts` | `stageRegistry.get(stage).contract.producesArtifacts` | change-control.test.mjs（归档断言） |
| types.ts:82-98 / 108-116 | StageConfig + stages 字段 | 删除 | tsc --noEmit（AC1） |
| workflow-engine.ts:44-66 / 86-91 | DEFAULT_WORKFLOW.stages + 构造器拷贝 | 删除 | tsc + 测试 |
| config/loader.ts:19-24 | version '2.0.0' | version '3.0.0' | 版本警告验证（AC8） |

## 验证面

- 静态：`pnpm run check`（tsc --noEmit）——删除 stages 后无残留引用即通过。
- 动态：`pnpm run sovei:build` + `pnpm test`（node --test）——现有 109 测试全通过。
- 行为：`sovei workflow list-stages` 输出比对改造前后一致；抽验 Feature 全链路 prepare/complete。
