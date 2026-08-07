# 收敛报告：019-contract-single-source

> 阶段：converge
> revision：0
> 结论：实现与 spec、scope、tasks 和 change-manifest 对齐，无需追加纠正任务。

## 差距分类

| 分类 | 发现 | 证据与处置 |
|---|---|---|
| missing | 无 | AC1–AC8 均有实现或验证证据；未发现遗漏的目标行为。 |
| partial | 无 | `WorkflowDefinition` 已删除 `stages`，状态机 guard 已迁移，归档逻辑已从 `stageRegistry` 读取契约。 |
| contradicts | 无 | 12 个阶段的顺序、依赖产物和生成产物保持不变；持久化事件/状态格式未改。 |
| unrequested | 无功能性范围外改动 | `stages/index.ts` 的 SSOT 注释和项目配置的 `workflow.version=3.0.0` 与本 Feature 的契约单源化及版本决策直接相关。 |

## 实现与架构核对

- `StageConfig` 和 `WorkflowDefinition.stages` 已从类型及默认工作流删除。
- `state-machine.ts` 的合法阶段判断改为 `stageOrder.includes(...)`，保持 reducer 不依赖注册表单例。
- `archiveInvalidatedArtifacts` 从 `stageRegistry.get(stage).contract.producesArtifacts` 读取产物，契约职责回到 stage 注册表。
- `stageOrder` 仍是完整的 12 阶段列表；未引入新依赖、循环依赖或候选模块职责扩张。
- 全仓库实现/测试源码搜索 `StageConfig`、`workflow.stages`、`.stages[` 和 `DEFAULT_WORKFLOW.stages`：无残留。

## 验证证据

- `pnpm run sovei:check`：通过，TypeScript 无错误。
- `pnpm run sovei:build`：通过，release bundle 构建成功。
- `pnpm run sovei:test`：109/109 通过，0 失败。
- 本地构建产物执行 `workflow list-stages`：12 阶段顺序、依赖产物和生成产物均正常输出。
- `git diff --check`：无空白错误。

## 结论

当前实现没有需要返回 `tasks` 的实现差距，也没有需要重新打开更早阶段的契约差距；可进入 `verify` 阶段。该 Feature 为 S1 内部重构，不需要 product confirmation gate。
