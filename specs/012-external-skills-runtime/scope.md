# 影响范围

## 代码范围

- `packages/sovei-core/src/cli/commands/workflow.ts`：显示实际 Skill 加载信息，并保留单阶段显性调用。
- `packages/sovei-core/src/engine/workflow-engine.ts`：接入 resolver、adapter 结果校验和原生回退。
- `packages/sovei-core/src/stages/`：为阶段增加可选 Skill binding，不改变阶段门禁。
- 新增 `packages/sovei-core/src/skills/`：协议、lock 解析、resolver、adapter registry、结果校验。
- 新增配置扫描与版本校验逻辑，禁止未锁定来源进入运行时。
- `packages/sovei-core/test/`：协议、锁定、回退、阶段报告和历史回放测试。

## 文件与数据范围

- 新增 `harness/skills/skill-map.yaml`：阶段到 Skill 的绑定声明。
- 新增 `harness/skills/skill-lock.yaml`：来源、版本、commit、checksum、许可证和状态。
- 新增 `harness/skills/cache/` 或等价外部缓存路径；第一阶段不提交第三方完整副本。
- 新增阶段执行报告中的 `nativeSkills`、`thirdPartySkills`、`fallbacks` 字段。

## 受保护范围

- `harness/project/governance/` 下的业务红线和事件事实源。
- `specs/*/workflow-events.jsonl`、`wayfinder-events.jsonl` 等事实源。
- 已有 Feature 的 Spec、Task 和验证结果，除非通过新 Feature 的回放脚本明确更新。
- `technical-sharing/` 分享资料目录；开发过程不再向这里写入运行时文件。

## 风险

- 第三方 Skill 的输出格式和上下文假设可能随上游变化。
- 不同 Agent 宿主对 Skill 的调用协议不一致。
- 许可证、网络可用性和离线缓存会影响安装策略。
- 外部建议可能绕过 Sovei 的业务红线或阶段门禁。

## 验证面

- 无 Skill 配置时现有全部测试必须保持通过。
- 锁定信息缺失、checksum 不匹配、Skill 超时、输出非法和适配器异常均需有测试。
- 对至少一个小 Feature 和一个跨模块 Feature 做 native/adapter 对比回放。
