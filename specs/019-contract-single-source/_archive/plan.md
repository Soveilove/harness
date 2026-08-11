# Plan: 019-contract-single-source

> 阶段：plan
> 目标：把"两套阶段契约"重构为"stageRegistry 单一 SSOT"，定义模块边界、迁移策略与验证方式。

## 模块边界（改后职责）

| 模块 | 改前职责（混乱） | 改后职责（清晰） |
|---|---|---|
| `stages/registry.ts` + `define-stage.ts` | stage 注册表，持 `StageContract`（B） | **唯一 SSOT**：stage 的产物契约（requiredArtifacts/producesArtifacts） |
| `engine/types.ts` | `WorkflowDefinition` 含 stages（编排+契约混杂） | `WorkflowDefinition` 仅**编排**：version/stageOrder/maxStagesPerInvocation/allowChaining；删除 `StageConfig` |
| `engine/state-machine.ts` | 用 `workflow.stages[stage]` 做合法阶段 guard | 用 `workflow.stageOrder.includes(stage)`（stageOrder 恒全量）做 guard，保持纯函数 |
| `engine/workflow-engine.ts` | `DEFAULT_WORKFLOW.stages` + 归档读它 | `DEFAULT_WORKFLOW` 无 stages；归档读 stageRegistry |
| `config/loader.ts` | workflow.version '2.0.0' | '3.0.0'（major：workflow 模型 breaking 重构） |

## 数据流（不变）

事件日志 → replay（当前 workflow 定义）→ state-machine → WorkflowState。产物契约仅在 prepare/complete/archive 时被 engine 从 stageRegistry 读取。**持久化层零改动**。

## 迁移策略

1. **无数据迁移**：`workflow.version` 不持久化到事件日志，event replay 恒用当前定义。现有 Feature 的 `workflow-events.jsonl`/`workflow-state.yaml` 直接可用。
2. **顺序**：先删 `types.ts` 的 StageConfig/stages（类型层）→ 修 state-machine 5 处 guard → 修 workflow-engine 的 DEFAULT_WORKFLOW/构造器/archive → bump loader version → tsc 编译验证 → 测试回归。
3. **先编译后测试**：类型删除后，tsc 会暴露所有残留引用点，逐一清理，再跑测试。

## 验证方式（对应 spec 验收标准）

| AC | 验证 |
|---|---|
| AC1/AC2 | `pnpm run check`（tsc --noEmit）+ 搜索无 `StageConfig`/`.stages[` 残留 |
| AC3 | 构造非法 stage 调 state-machine，断言抛 `Unknown stage`（现有测试已覆盖） |
| AC4 | change-control.test.mjs 归档断言（spec.md/scope.md 移除、decision-log.md 保留） |
| AC5 | `pnpm run sovei:build` + `pnpm test`，109/109 通过 |
| AC6 | 抽验 Feature 全链路 prepare/complete |
| AC7 | 比对 `sovei workflow list-stages` 输出与改造前一致 |
| AC8 | 构造 project.config.json 版本不匹配场景，验证仅警告不 throw |

## 风险与回滚

- 风险：guard 语义不等价 / 归档产物列表缺失。缓解：`stageOrder` 恒全量保证等价；归档产物从 SSOT 取与改造前同源（B 本就是引擎消费的契约）。
- 回滚：单 Feature 改动，git 回退即可；无持久化数据变更，回滚无副作用。

## 不扩大范围

- 不重构 workflow-engine 的多职责（体量大但本次仅单信号去重，守 scope 纪律）。
- 不动 StageContract 结构、不动 CLI 命令、不动持久化格式。
