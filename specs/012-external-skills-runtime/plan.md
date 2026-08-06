# 技术计划

## 1. 固化协议边界

定义 `SkillManifest`、`SkillBinding`、`SkillRequest`、`SkillResult` 和 `SkillExecutionReport`。协议必须表达输入 Context Pack、只读能力、输出产物、证据引用、超时和失败原因。

## 2. 建立配置与锁定

实现 `skill-map.yaml` 和 `skill-lock.yaml` 解析、Schema 校验、版本与 checksum 检查。没有 lock 的候选 Skill 只能显示为 candidate，不能进入执行路径。

## 3. 实现 Resolver 与 Adapter Registry

Resolver 根据阶段、Feature 风险级别和配置选择 native 或外部适配器。Registry 只注册已通过协议校验的适配器。每个 Adapter 负责宿主差异转换，不允许修改 WorkflowEngine 的状态。

## 4. 接入 `grill` 和 `spec`

先实现两个边界清晰的适配器：`grill` 将外部问题清单转换为 `decision-log.md` 候选内容；`spec` 将外部契约建议转换为待审核的 Spec patch。两者都必须经过现有 Artifact 校验。

## 5. 增加回退和可观测性

外部 Skill 超时、崩溃、输出不完整或版本不兼容时，记录失败报告并调用 Sovei native Stage。CLI 输出实际使用的 Skill、版本、耗时、回退原因和产物校验结果。

## 6. 历史 Feature 回放

选择现有小型和跨模块 Feature，分别运行 native 与 adapter，比较决策完整性、产物合法性、验证证据和状态事件。回放未通过前不启用默认外部 Skill。

## 7. 扩展其余阶段

在 `grill` 与 `spec` 稳定后，再按优先级增加 `plan`、`implement`、`converge`、`verify`、`learn` 的适配器。`wayfind` 先保持 Sovei 原生实现，避免把已内化的决策地图能力错误地包装成外部运行时依赖。
