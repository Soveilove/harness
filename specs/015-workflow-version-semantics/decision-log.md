# Feature 015 — Grill（决策日志）

## 核心质疑

### Q1: workflow.version 到底应该追踪什么？

**结论**：应追踪 `WorkflowDefinition` 的结构性变更 — 即 `stageOrder`、`stages` 配置（requiredArtifacts / producesArtifacts / next）、`maxStagesPerInvocation`、`allowChaining`。

不应追踪的东西：
- 确认门逻辑（硬编码在 state-machine.ts，不是 WorkflowDefinition 的一部分）
- Skills / Wayfinder / Change Control 子系统（通过构造函数注入，旁路 WorkflowDefinition）
- CLI 命令变更（由 npm 包版本追踪）
- Stage prompt 内容（由外部 skills 和 stage contracts 追踪）

### Q2: 这个版本号需要 bump 吗？

**结论**：**不需要 bump**。从 2.0.0 至今，`DEFAULT_WORKFLOW` 的结构没变过：
- 12 个阶段没有增减
- stageOrder 顺序没变
- stages 配置中 requiredArtifacts / producesArtifacts 确实在 2.3.2 被修改过（spec 补了 wayfinder.md 和 reconciliation.md），但这是 **bugfix**（修复拓扑断链），不是破坏性变更 — 旧 Feature 的 event replay 不受影响，因为 state-machine reducer 不检查 requiredArtifacts

但需要在代码中**补上校验和文档**，让未来变更时可追踪。

### Q3: 应该校验到什么程度？

**结论**：warn 而非 throw。
- mismatch 不应阻断启动 — 可能是用户用新版 CLI 打开旧项目（version 落后），或手动改过
- warn 信息应提示当前 CLI 期望的版本和项目中声明的版本
- 不做自动迁移 — workflow.version 变更不涉及数据迁移（与 schemaVersion 不同）

### Q4: 需要加 migration 机制吗？

**结论**：不需要。workflow.version 与 schemaVersion 是两个不同的概念：
- `schemaVersion` (z.literal(1)) — 持久化数据结构版本，变更需要迁移
- `workflow.version` — 工作流定义版本，是引擎内部配置，不持久化到 Feature 数据中

Feature 的 `workflow-events.jsonl` 只记录事件（BOOTSTRAP / STAGE_COMPLETE / CONFIRM 等），不记录 workflow.version。replay 时传入当前 `WorkflowDefinition`，所以版本变化不影响历史事件回放。

## 决策

1. 在 `loadConfig` 中添加 version mismatch warning（不 throw）
2. 在 `DEFAULT_WORKFLOW` 注释中补充 version 语义说明
3. 在 `WorkflowDefinition` 类型注释中说明 version 追踪范围
4. 不 bump version（当前 2.0.0 对当前结构是准确的）
5. 不加 migration 机制（不需要）

## 风险确认

S1 — 纯内部增强，不改 CLI 契约，不改持久化 schema，不影响事件回放。
