# 决策日志：Agent Knowledge Runtime

## D-001：Sovei 是宿主 Agent 的控制层，不是第二个执行型 Agent

- 状态：accepted
- 决策：Codex、Claude Code、CodeBuddy、Trae 继续负责推理、对话、编辑和工具执行；Sovei 负责工作流、版本化知识、检索上下文、业务红线、证据门禁和跨 IDE 一致性。
- 理由：宿主已具备成熟 Agent 能力，重复实现会产生模型、工具、权限和上下文竞争。
- 被拒绝方案：在 Sovei 内实现独立聊天循环、自动编码 Agent 或默认模型客户端。

## D-002：每个宿主使用独立能力画像

- 状态：accepted
- 决策：adapter 不再只是命令字符串转换；它必须声明宿主的调用方式、上下文交付能力、原生代码检索、工具执行、MCP/CLI 支持和限制。Sovei 根据画像构建上下文，不假设所有 IDE 等价。
- 理由：跨 IDE 复用的是协议和项目知识，不是强行统一每个宿主的能力。

## D-003：确定性知识优先，RAG 是可选增强

- 状态：accepted
- 决策：active redlines、stable rules 和明确 Feature 契约必须确定性注入；candidate/pitfall/历史证据可通过文本检索和可选语义检索补充。不得让向量相似度决定业务红线是否生效。

## D-004：LLM 与 embedding 只定义可选 Provider 契约

- 状态：accepted
- 决策：核心在无 API Key、无外部模型时必须完整运行。本版本提供 Provider 接口、能力声明和版本元数据，但不绑定具体云模型 SDK。

## D-005：旧项目 onboarding 必须形成红线候选闭环

- 状态：accepted
- 决策：扫描候选写入可审查的 `redlines-seed.json`，不会激活；人工确认后显式 import 才进入 `redlines.json`。重复扫描确定性刷新候选，不覆盖 active 红线。

## D-006：进入下一个开发版本

- 状态：accepted
- 决策：实现、测试和文档纳入下一个开发版本；只准备本地版本变更，不自动 npm publish、commit 或 push。

## 未决事项

需要通过 Wayfinder 明确知识快照版本字段、检索结果契约、adapter 能力模型和本版本最小发布边界。
