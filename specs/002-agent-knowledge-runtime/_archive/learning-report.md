# 学习报告

## 观察 L-001：宿主 Agent 边界是可复用架构决策

- 来源 Feature：002-agent-knowledge-runtime
- 证据：四宿主 adapter 能力画像不同，但共用同一条 CLI 和知识层。
- 分类：candidate
- 建议目标：项目级 constitution 候选知识
- 建议内容：Sovei 不实现第二套执行型 Agent；宿主负责推理和工具执行，Sovei 负责版本化知识、检索上下文和治理。
- 晋级：不晋级 stable；需跨项目验证。

## 观察 L-002：知识快照需跳过 dotfile

- 来源 Feature：002-agent-knowledge-runtime
- 证据：.snapshot.json 存放在知识目录，KnowledgeStore.load 需跳过 dotfile。
- 分类：candidate
- 建议目标：项目级 pitfall 候选知识
- 建议内容：KnowledgeStore 加载 JSON 时应跳过以点开头的文件，避免将快照或缓存误解析为知识条目。
- 晋级：不晋级 stable。

## 观察 L-003：required/suggested 分离是治理底线

- 来源 Feature：002-agent-knowledge-runtime
- 证据：active redlines 无论查询相似度如何都进入 required；candidate 绝不进入 required。
- 分类：candidate
- 建议目标：项目级 rule 候选知识
- 建议内容：上下文包必须分离确定性和概率性来源；业务红线不得被向量相似度降级。
- 晋级：不晋级 stable。

## 架构债务

无新增条目。新增模块为纯增量，未增加既有热点压力。
