# 验证证据：019-contract-single-source

> 阶段：verify
> revision：0
> 验证日期：2026-08-07
> 基线：`HEAD`（当前实现尚未提交，审查的是工作树中本 Feature 的差异）

## Standards

- `AGENTS.md` 要求按 `load → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync` 推进；当前状态已按该顺序到达 verify。
- `harness/project/rules/project.rules.json` 的 `RELEASE_VERSION_POLICY` 约束发布包版本默认只做 patch；本 Feature 没有修改 `packages/sovei-core/package.json` 或发布版本，因此未触发该规则。
- 本 Feature 改动遵循现有 TypeScript 模块边界：状态机继续保持纯函数，stage 契约继续由 stage registry 持有，未引入依赖循环或新的跨层职责。
- 审查结论：未发现 documented-standard breach；Fowler smell baseline 未发现需要处置的新增 smell。

## Spec

### AC1–AC2：删除重复契约

- `WorkflowDefinition` 已删除 `stages` 字段，`StageConfig` 已删除。
- `DEFAULT_WORKFLOW` 及构造器不再创建或拷贝 `stages`。
- 证据：`pnpm run sovei:check` 通过；实现/测试源码搜索 `StageConfig`、`workflow.stages`、`.stages[`、`DEFAULT_WORKFLOW.stages` 无残留。

### AC3–AC4：行为等价迁移

- `state-machine.ts` 的合法阶段 guard 使用 `stageOrder.includes(...)`。
- `archiveInvalidatedArtifacts` 从 `stageRegistry.get(stage).contract.producesArtifacts` 读取产物。
- 证据：`pnpm run sovei:test` 通过，其中 change-control、workflow、wayfinder 相关归档、非法阶段和 prepare/complete 回归均通过。

### AC5：全量回归

- `pnpm run sovei:build`：通过。
- `pnpm run sovei:test`：109/109 通过，0 失败。

### AC6–AC7：CLI 与阶段注册表

- 本地构建产物 `node packages/sovei-core/dist/release/sovei.cjs workflow list-stages --root D:\\project\\private\\harness` 正常输出完整 12 阶段。
- 输出中的阶段顺序、依赖产物和生成产物与原契约一致。
- 本地构建产物读取 `019-contract-single-source` 状态正常，当前阶段为 verify，无版本警告。

### AC8：版本决策

- `WorkflowDefinition` 与默认配置版本已从 `2.0.0` 更新为 `3.0.0`。
- `harness/project/project.config.json` 已同步为 `3.0.0`。
- 版本不匹配仅警告的行为由 `project.test.mjs` 覆盖并通过；匹配版本断言也通过。

## 限制与环境说明

- 尚未单独创建临时 Feature 执行 12 阶段全链路；现有 109 项测试覆盖 workflow prepare/complete、change/reopen、归档和 list-stages 相关路径，且当前 Feature 事件日志已成功 replay 到 verify。
- 全局 `sovei 2.5.6` 仍使用旧的 `workflow.version=2.0.0` 引擎定义，因此从全局命令观察到 `3.0.0` 警告；本仓库自迭代已使用本地构建产物，`node packages/sovei-core/dist/release/sovei.cjs` 无该警告。该差异属于环境版本未重新 link，不是本 Feature 代码失败。

## 结论

需求符合性和工程质量验证通过；无失败项需要返回 `tasks` 或 `converge`。进入 learn 前仍必须完成 verify 阶段的 tech 与 product 确认门。

## 审查摘要

Standards：0 findings，最严重问题：无。

Spec：0 findings，最严重问题：无。
