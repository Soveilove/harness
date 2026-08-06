# 决策地图

## 目标

sovei init 能读取锁定配置并安装/校验第三方 Skills，workflow 阶段可审计地调用并在失败时回退 native

## 备注

优先解决安装边界、运行时协议和 CLI 初始化时机；所有第三方能力保持可锁定、可回退、可审计。

## 已完成决策

- [运行时协议与适配器边界](decision-tickets/D-001.json) - 采用 Sovei-owned SkillRuntime 协议。外部 Skill 只接收只读 Context Pack，返回带来源、版本、产物和证据引用的候选结果；Resolver 负责选择适配器，Artifact Validator 和 WorkflowEngine 负责校验与阶段完成。超时、非法输出或不兼容时记录失败
- [安装生命周期与初始化策略](decision-tickets/D-002.json) - 采用 CLI 管理的缓存加项目锁定，而不是把第三方 Skill 打包进 CLI。sovei init 负责读取 skill-map/lock、检查并报告缺失或不一致；sovei skills install --locked 负责按 lock 安装，重复 init 不重复下载。workflow 只调用已锁定且通过校验的
- [首批接入范围与安全治理](decision-tickets/D-003.json) - 第一批只验证 grill 与 spec：grill 选择 grill-me/grilling 作为候选，spec 选择 domain-modeling/to-spec 作为候选。wayfind 继续使用 Sovei 原生实现。所有来源必须固定 ref/commit、checksum 和许可证，初始状态为 candida

## 尚未明确

（无）

## 范围外

（无）
