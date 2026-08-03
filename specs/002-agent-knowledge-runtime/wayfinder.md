# 决策地图

## 目标

下一个 Sovei 开发版具备宿主 Agent 能力画像、版本化知识快照、确定性上下文包、可选 Provider 契约和旧项目红线候选闭环

## 备注

宿主负责推理与工具执行；核心必须离线可用；机器契约保持稳定

## 已完成决策

- [确认宿主 Agent 边界](decision-tickets/D-001.json) - 宿主 Agent 负责推理、对话、编辑和工具执行；Sovei 只提供工作流、版本化知识、检索上下文、治理与证据门禁，禁止实现第二套执行型 Agent
- [定义知识快照版本](decision-tickets/D-002.json) - 快照记录 schemaVersion、indexVersion、projectId、sourceRevision、sourceHash、scannerVersion、chunkerVersion、embeddingProvider/model/dimensions、createdAt；内容或生成链版本变化即 stale
- [定义上下文包契约](decision-tickets/D-003.json) - context-pack 分 required 与 suggested；required 确定性包含 active redlines、适用 stable rules 和当前 Feature 契约，suggested 使用本地文本评分并携带来源引用与生命周期；语义 Provider 只扩展 suggested
- [定义 IDE 能力画像](decision-tickets/D-004.json) - adapter 声明 invocation、nativeCodeSearch、contextDelivery、toolExecution、mcp、cli、notes；内建 Codex、Claude Code、CodeBuddy、Trae，能力未知时保守为 false 并允许项目配置覆盖
- [确定发布边界](decision-tickets/D-005.json) - 下个开发版交付红线候选落盘、知识快照清单、确定性 context build/status、四宿主能力画像、Provider 接口、中文文档和测试；具体向量数据库、云 LLM SDK、自动 IDE 安装与发布操作延期

## 尚未明确

（无）

## 范围外

（无）
