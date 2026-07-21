# Sovei Workflow Phase 1 MVP

## 问题

Sovei 工作流目前只有设计文档，没有可发现的 Codex Skill、机器可读状态机、Artifact 模板或恢复校验。Agent 可能把设计内容误当成已实现能力，也无法在新会话中可靠恢复阶段。

## 用户故事

### US1 从文件状态恢复

作为开发者，我希望 Agent 读取当前 Feature 的 `workflow-state.yaml` 和实际 Artifact，报告当前阶段与下一条合法命令，而不是依赖聊天记忆猜测。

### US2 按门禁推进

作为开发者，我希望每个阶段声明输入、输出、停止条件和合法后继；缺少输入、状态冲突或非法跃迁时必须停止。

### US3 跨 Codex 与 Claude 使用

作为开发者，我希望 Codex 和 Claude 使用同一套核心协议，只由适配层转换调用方式，避免两份流程独立演化。

## 功能需求

- FR-001：提供单一 `sovei-workflow` Skill，Phase 1 支持 `load`、`grill`、`spec`、`scope`、`plan`。
- FR-002：提供机器可读状态机，定义阶段顺序、必需 Artifact 和合法后继。
- FR-003：提供 `decision-log.md`、`spec.md`、`scope.md`、`coverage-matrix.md`、`plan.md`、`workflow-state.yaml` 模板。
- FR-004：提供确定性校验脚本，检测 YAML 结构、Artifact 缺失、状态与文件冲突、非法下一阶段。
- FR-005：Codex 入口必须显式调用，不能隐式启动用户门禁阶段。
- FR-006：Claude 适配只引用核心 Skill/状态机，不复制完整流程正文。
- FR-007：同步脚本必须保护项目 `specs/` 和 `workflow-state.yaml`，同时分发稳定适配文件。

## 验收场景

1. Given 一个状态一致的 Feature，When 执行 load 校验，Then 输出当前阶段、已完成阶段和下一合法阶段。
2. Given 状态声明 `scope` 已完成但缺少 `scope.md`，When 校验，Then 失败并指出缺失文件。
3. Given `next_stage` 不是状态机允许后继，When 校验，Then 失败且不修改状态。
4. Given Codex 扫描仓库 Skill，When 查看技能元数据，Then `sovei-workflow` 可被显式调用且不允许隐式触发。
5. Given Claude 项目完成分发，When 调用 Phase 1 命令，Then 命令只路由到同一核心协议。

## 明确排除

- Phase 2 的 implement、converge、verify 自动执行协议。
- 外部 Skill 下载器和 vendor 自动更新。
- A/B/C 冲突检测、Baseline 备份和批量同步。
- 修改任何产品工程业务代码。
