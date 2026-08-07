# 决策日志：020-quick-context-governance

> 阶段：grill
> revision：0
> 状态：本阶段结论已固化；剩余范围性决策转交 wayfind，不在 grill 阶段逐项阻塞推进。

## 已核实事实

| 编号 | 事实 | 证据 |
|---|---|---|
| F1 | 当前需求同时涉及快速通道、统一上下文治理和 usage 事实记录，不是单一 CLI 小修复。 | exploration.md §1、§5、§7 |
| F2 | 当前 workflow 默认从 load → grill → wayfind，grill 产物契约为 decision-log.md，wayfind 依赖该产物。 | 工作流阶段契约与 CLI 实测 |
| F3 | 当前第三方 grill Skill 为 mattpocock/grilling v1.0.0。 | CLI `workflow grill` 实测 |
| F4 | 当前 usage 方案只记录使用事实，不负责账单、价格换算或外部 telemetry。 | exploration.md §7 |

## 已确认决策

| 编号 | 决策 | 理由 | 被拒绝方案 |
|---|---|---|---|
| D1 | 低风险、明确、局部修改默认走轻量快速闭环；高风险、不确定、跨模块或触及共享契约/数据/权限/异步/红线时升级完整 Sovei。 | 避免一行修改与跨模块功能使用同一套重流程，同时保留风险兜底。 | 所有请求统一强制跑完整工作流。 |
| D2 | 快速通道保留 Capture → Check → Confirm → Implement → Verify → Report 六步闭环。 | Agent 负责语义，CLI 负责基线、真实 diff、硬风险和验证事实。 | 只靠 Agent 自述 change-manifest。 |
| D3 | 上下文治理抽成 Quick、标准工作流、Wayfinder、context build 共用的 Context Policy 层。 | 避免不同入口对红线适用性和裁剪结果产生断裂。 | 各入口各自实现上下文筛选。 |
| D4 | 红线分为全局不变量、结构化局部红线、候选/索引红线；自由文本 scope 不再作为唯一机器匹配依据。 | 在控制上下文体积的同时降低漏检风险。 | 无条件注入全部红线全文；或静默忽略无法匹配的红线。 |
| D5 | 先只测量现有完整上下文，再影子计算 full/scoped/index+on-demand，最后做受控实验；暂不预先设定预算阈值。 | 先建立可归因基线，避免同时改变上下文和质量导致无法判断效果。 | 立即裁剪或静默截断现有上下文。 |
| D6 | 第一版 usage 只写 harness/project/usage.jsonl，缺失 token 记录 unknown/null，不把未知写成零；已有文件只补缺、不覆盖。 | 保持核心简单并保留历史事实。 | billing.json、金额计算、默认 telemetry、初始化覆盖历史。 |

## 转交 wayfind 的范围性决策

以下事项会改变决策地图、CLI/IDE 契约或基础设施边界，当前不在 grill 中逐项展开；按用户指示转交 wayfind 统一处理：

- U1：快速通道权威入口是 `sovei quick`，IDE slash 是否仅作为薄封装。
- U2：快速通道最小上下文的精确构成，以及是否提供候选解释输出。
- U3：usage 脱敏导出的具体字段、时间桶和命令边界。
- U4：`context build --paths` 的路径过滤语义修正是否纳入本 Feature。
- U5：各标准阶段的上下文预算值；在观测数据前不预先拍定。

## 阶段结论

- grill 不实施代码，也不替 wayfind 消除结构性未知。
- 已有探索记录足以形成当前决策基线。
- 下一阶段应把 U1–U5 建成决策票据，显式记录依赖、候选方案、未知区域和排除项。


---

## 提示契约

## 权威规则

当前 revision：0。仅当前顶层 Feature 产物具有权威性；history/ 下的文件是已失效证据，不得视为当前需求。

## 外部 Skill 指令

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled — the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Each question should be formatted like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round the user answers reshapes the tree — settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it — don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report — ask the rest of the frontier now. The _decisions_ are the user's — put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.
来源：mattpocock/grilling v1.0.0

# 阶段：grill

## 输入
有效的 load 结果和当前请求。

## 操作
沿决策树逐层推进，依次解决依赖关系。对每个待决议项，先判断其类型，再选择处理方式：

1. 事实核实——能从代码、文档、配置或既有知识查证的，直接查证并记录结论，不问用户。
2. 可推断决策——项目约定、既有模式或证据指向明确最优解的，自行决策并记录理由和被拒绝方案，不等用户确认。
3. 范围性决策——无法从证据推断且会实质改变 Feature 范围的，逐个向用户提问。每个问题附上推荐答案和理由，一次只问一个，收到回复后再继续下一项；同时抛出多个问题会造成信息过载。

提问纪律：
- 先给出推荐答案和理由，再请用户确认或修正。
- 一次只提一个问题，等用户回复后再推进下一项。
- 用户确认视为达成共识；未确认的标注为未决。

## 输出
decision-log.md，包含每项决议的类型（事实核实/可推断决策/范围性决策）、决策内容、理由、被拒绝方案、状态（已决/未决）和未决项清单。

## 停止条件
所有事实已核实、所有可推断决策已记录、所有范围性决策已获得用户回复或标注为未决。本阶段不得实施。

