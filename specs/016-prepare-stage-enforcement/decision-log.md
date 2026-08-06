# Feature 016 — Decision Log

## D1: 事实核实 — prepareStage 和 completeStage 之间无状态关联

**类型**: 事实核实
**结论**: `completeStage`（workflow-engine.ts:281）通过 `createStageContext` 获取上下文，校验产物后直接追加 `STAGE_COMPLETE` 事件。不检查 `prepareStage` 是否被调用过。`WorkflowState` 中没有 `preparedStages` 或类似字段。
**状态**: 已决

## D2: 事实核实 — skill 注入只在 prepareStage 中发生

**类型**: 事实核实
**结论**: skill 注入逻辑在 `prepareStage` 的 line 163-264，通过 `skillResolver.resolve(stageName)` 获取绑定，用 `MarkdownSkillAdapter.getSkillBody()` 读取 SKILL.md 内容，拼接到 prompt 中。`completeStage` 完全不涉及 skillResolver。
**状态**: 已决

## D3: 可推断决策 — 用事件溯源追踪 preparation 状态

**类型**: 可推断决策
**决策**: 在 `WorkflowState` 中添加 `preparedStages: string[]` 字段，在 `WorkflowEvent` 中添加 `STAGE_PREPARED` 事件类型。`prepareStage` 追加事件，`completeStage` 检查并消费。
**理由**: Sovei 使用事件溯源（event sourcing），状态是 `fold(events)` 的结果。追踪 preparation 状态应遵循同一模式，而非引入副作用文件。
**被拒绝方案**:
- 副作用文件（`.prepared` 标记）— 不符合事件溯源模式，不在审计链中
- 在 `completeStage` 中重新调用 `prepareStage` — 语义错误，prepare 有副作用（创建模板文件）
**状态**: 已决

## D4: 可推断决策 — completeStage 在未 prepare 时 throw 而非 warn

**类型**: 可推断决策
**决策**: `completeStage` 在当前阶段不在 `preparedStages` 中时 throw 错误。
**理由**: warn 会被 AI 忽略（正是当前问题的根因）。throw 强制 AI 先执行 prepare 步骤，确保 skill 注入发生。
**被拒绝方案**:
- warn 但不 throw — 已被证明无效，AI 会跳过
- 只对有外部 skill 绑定的阶段强制 — 引入 engine 对 skill-map 的耦合，复杂且不必要
**状态**: 已决

## D5: 可推断决策 — REOPEN 和 CHANGE_DECLARED 清除 preparedStages

**类型**: 可推断决策
**决策**: `REOPEN` 和 `CHANGE_DECLARED` 事件将 `preparedStages` 重置为 `[]`（或移除被重开阶段及其后继）。
**理由**: 重开阶段意味着之前的 preparation 已过期，需要重新 prepare。
**状态**: 已决

## D6: 可推断决策 — load 阶段也强制 prepare

**类型**: 可推断决策
**决策**: 所有 12 个阶段都强制 prepare，不特殊对待 load。
**理由**: 一致性。load 虽然不绑定外部 skill，但 prepare 步骤会生成上下文提示和创建模板文件，对 AI 有指导价值。
**状态**: 已决

## D7: 事实核实 — 向后兼容性

**类型**: 事实核实
**结论**: 新增 `STAGE_PREPARED` 事件类型是 additive 的。旧 Feature 的事件日志中没有 `STAGE_PREPARED` 事件，replay 时 `preparedStages` 为 `[]`。如果旧 Feature 仍有未完成的阶段，`completeStage` 会 throw。但 Feature 015 已完成，Feature 016 是新 bootstrap 的，所以无影响。
**状态**: 已决
