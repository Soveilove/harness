# 功能规格：Agent Knowledge Runtime

## 问题

Sovei 已有工作流、类型化知识和薄 adapter，但旧项目 onboarding、知识版本、检索上下文和宿主差异尚未形成闭环。当前系统无法说明某条上下文来自哪个项目快照、扫描器版本或索引版本，也无法向不同 IDE Agent 交付可审计的一致上下文。

## 用户可见行为

1. 旧项目执行 `sovei project onboard` 后，代码地图和架构知识继续以 candidate 落盘；业务红线候选写入版本化 `redlines-seed.json`，但不会自动激活。
2. 用户显式执行 `sovei governance redline import <file>` 时，可导入候选数组或版本化 seed 文件；正式红线仍由现有治理仓库记录事件并激活。
3. `sovei context build <feature> --stage <stage> [--adapter <id>] [--query <text>]` 生成可审查的 JSON 与 Markdown context pack。
4. context pack 将 `required` 与 `suggested` 分离：active redlines、适用 stable 知识和当前 Feature 契约是 required；candidate/pending 检索结果只能是 suggested。
5. 每条上下文均包含来源路径、知识 ID/红线 ID、生命周期、内容哈希和引用说明。
6. `sovei context status` 显示知识索引版本、来源哈希、生成链版本和是否 stale。
7. `sovei agent list/show` 显示 Codex、Claude Code、CodeBuddy、Trae 的独立能力画像、调用方式、已确认能力和保守限制。
8. 核心定义可选 `EmbeddingProvider` 与 `LLMProvider` 契约；未配置 Provider 时，确定性上下文和本地文本检索必须完整工作。

## 版本契约

知识索引清单至少包含：`schemaVersion`、`indexVersion`、`projectId`、`sourceRevision`、`sourceHash`、`engineVersion`、`scannerVersion`、`chunkerVersion`、embedding provider/model/dimensions、`createdAt` 和逐知识条目内容哈希。当前知识内容或生成链版本变化时，状态为 stale。

## 验收场景

- AC-1：旧项目扫描发现业务红线时，候选 seed 确定性落盘，重复扫描刷新候选且不修改 active redlines。
- AC-2：显式 import 版本化 seed 后，红线进入现有事件溯源治理；未 import 前不生效。
- AC-3：无外部模型配置时，context build 仍生成 required/suggested、引用和版本清单。
- AC-4：active redline 无论查询相似度如何都进入 required；candidate 绝不进入 required。
- AC-5：知识内容或生成版本变化后，context status 报告 stale；重建后恢复 current。
- AC-6：四个 adapter 具有不同且可审查的能力画像；未知能力不得乐观声明。
- AC-7：现有 12 阶段、事件回放、知识生命周期和 Monorepo 扫描回归测试继续通过。
- AC-8：README 和包版本体现下一开发版能力，但不执行 publish、commit 或 push。

## 边界

- Sovei 不实现独立聊天、自动编码循环或工具执行 Agent。
- 默认检索使用确定性规则和本地文本评分；语义 embedding 与 LLM 只是可选扩展点。
- 原生代码搜索仍优先交给宿主 IDE；Sovei 首先检索项目知识、红线、决策、Feature 产物和历史证据。

## 明确排除

- 具体云 LLM SDK、API Key 管理和模型计费。
- 向量数据库选型与生产级 embedding 索引。
- 自动安装或运行 IDE 插件。
- npm publish、Git commit、push 和外部 workspace 同步。
