# 功能规格：020-quick-context-governance

## 1. 目标

为 Sovei 增加一个可控的 Quick Channel，并建立统一的上下文选择与使用事实观测契约，使低风险局部修改不必默认进入完整 12 阶段流程，同时不降低风险识别、需求边界和真实 diff 验证能力。

本 Feature 的交付重点是用户可见契约、上下文治理规则、观测字段和验收证据；预算阈值与上下文裁剪策略必须先经过观测和影子计算，不在本 Feature 内静默改变现有标准流程行为。

## 2. 用户可见行为

### 2.1 Quick 入口

- `sovei quick` 是 Quick Channel 的唯一权威实现入口。
- IDE 可提供 `/sovei-quick` 作为薄封装，但不得维护第二套语义、风险规则或状态机；它必须落到同一个 QuickRun 契约。
- 用户显式调用 Quick 时，CLI 允许开始检查。
- IDE Agent 只能建议 Quick；建议前必须展示目标与排除项。
- Agent 不能关闭、绕过或降级 CLI 硬风险检查。
- 检测到高风险、不确定、跨模块、共享契约、数据、权限、异步、红线或范围越界时，Quick 必须停止交付并升级到完整 Sovei 或等待用户确认扩围。

### 2.2 Quick 六步闭环

QuickRun 必须按以下顺序提供可审计结果：

1. **Capture**：记录目标、排除项、修改前基线摘要和运行元数据；不得将完整用户原话、完整 Prompt、源码写入 usage 事实日志。
2. **Check**：读取最小上下文并执行风险硬规则。
3. **Confirm**：输出一句明确的“将修改什么、不修改什么”，并附风险判断依据。
4. **Implement**：仅在检查通过且范围明确时执行修改。
5. **Verify**：CLI 根据真实 Git baseline/diff 检查实际文件范围、风险信号和 Agent 声明的测试/检查结果。
6. **Report**：输出已修改项、明确未修改项、验证结果、升级/停止原因和未验证项。

### 2.3 越界与失败

- 真实 diff 超出声明范围、涉及未声明文件或触发风险信号时，立即停止交付；不得自动回退，也不得自动创建完整 Feature。
- Quick 不得把“没有加载到某条红线”解释为“没有红线”。无法安全判断时，先自动扩展一次；仍不确定则升级或停止。
- 测试失败且原因不明确、语义说明与真实 diff 不一致、或无法证明“其他没变”时，必须升级或停止。

## 3. 统一 Context Policy 契约

Quick、标准工作流、Wayfinder 和 `context build` 共用同一 Context Policy 选择模型。跨步骤和跨入口必须保留以下不变基线：

- Context Policy 版本；
- baseline revision；
- 全局不变量/绝对红线 ID；
- 已命中的结构化红线 ID；
- 上下文选择决策；
- 未加载候选项；
- 超预算、扩展、升级或停止状态。

### 3.1 上下文分层

- **固定控制面**：策略版本、基线、全局不变量、选择结果和审计元数据。
- **目标索引**：目标路径、符号、领域、阶段、规则/红线 ID、摘要和可展开指针。
- **按需全文**：仅展开路径/符号/领域命中的规则、红线和必要契约；不加载无关 Feature 或跨 Feature 全文。
- **候选项**：无法安全判断相关性的内容只提供 ID、标题、领域和 scope summary；不得静默丢弃。

### 3.2 各 Quick 步骤的上下文边界

- Capture：控制面、目标/排除项和基线摘要。
- Check：控制面、目标索引、适用规则/红线摘要及一次按需扩展机会。
- Confirm：复用 Check 的选择结果和风险依据。
- Implement：目标路径规则、已确认红线和必要共享契约。
- Verify：控制面、真实 Git baseline/diff、实际修改文件、风险信号和测试结果。
- Report：选择决策、未加载候选、升级原因及验证证据摘要。

### 3.3 `context build --paths` 迁移边界

第一阶段只新增候选计算、解释和兼容性报告；即使存在超临时观测预算，也不得改变现有完整上下文发送行为。最终 scoped 语义应覆盖目标路径相关的项目规范、结构化局部红线和稳定规则候选，全局不变量始终保留。无法安全匹配时进入候选或升级，不得静默过滤。

## 4. usage 事实记录

第一版只记录 `harness/project/usage.jsonl`，不负责账单计算、价格换算、费用命令、外部 telemetry 或脱敏导出。

每次入口/阶段至少可记录：

- `schemaVersion`、事件类型和 `runId`；
- channel、stage、开始/结束时间；
- Context Policy 版本和 baseline revision；
- required/indexed/expanded/unloaded 条目数及字符/字节大小；
- 命中的红线 ID、未加载候选项、选择决策和 over-budget 状态；
- 模型、Skill 信息（若宿主提供）；
- input/output/cache token（若宿主不提供，状态为 `unknown`，数值为 `null`，不得写成 0）；
- 调用次数、延迟、completed/failed/escalated/interrupted 状态和测试结果（若适用）。

事件至少包括 `run-start`、`context-selected`、`run-end`。进程中断后缺少 `run-end` 时，读取端必须能将其识别为 interrupted，不能假设成功或零成本。

新项目创建 usage 文件；已有项目只在文件不存在时创建，`init --force`、onboard、rescan 和重开流程都不得覆盖历史记录。原始 usage 默认不进入 Git。

## 5. 非目标

- 不强制所有 IDE Agent 先运行完整 Sovei。
- 不把 Quick 实现成第二套独立工作流或第二套风险规则。
- 不在观测数据产生前拍定上下文预算阈值。
- 不在本 Feature 内直接启用未经受控实验批准的上下文裁剪、静默截断或自动降级。
- 不实现 `usage export --redacted`、billing、金额计算、币种处理或外部 telemetry。
- 不自动回退 Agent 已做的越界修改。

## 6. 验收场景

### A. Quick 入口与升级

- 用户调用 `sovei quick`，得到统一 QuickRun 流程；IDE slash 调用得到相同契约结果。
- Agent 建议 Quick 时先展示目标与排除项；用户拒绝或目标不清时不得实施。
- 单文件、明确、低风险修改可完成六步闭环。
- 请求涉及共享 API、权限、数据结构、异步流程或红线时，CLI 阻止 Quick 交付并报告升级原因。

### B. 范围证明

- 用户声明只改一个目标文件，但 Agent 修改多个文件：Verify 报告越界，状态为 stopped/escalated，不自动回退。
- 真实 diff 只改声明文件但触发共享契约或红线：升级到行为范围检查，不得只报告文件范围通过。
- 测试失败或语义声明与 diff 不一致：报告失败和未验证项，不得声称完成。

### C. Context Policy

- Quick 与标准阶段输出相同的策略版本、baseline revision、选择决策和未加载候选字段。
- 目标路径存在适用结构化红线时，Check 可命中并按需展开全文；全局不变量始终可见。
- 路径相关性无法确定时，系统保留候选并自动扩展一次；仍不确定时升级/停止。
- `context build --paths` 的影子报告能说明旧完整包、候选 scoped 包、被保留/未加载内容及兼容性差异，同时实际发送行为不变。

### D. usage 与评测

- 每次运行至少留下 `run-start`；正常结束留下 `run-end`，中断可被识别为 interrupted。
- 宿主未提供 token 时，日志保留 unknown/null，不出现伪造的零值。
- 初始化、force、onboard、rescan 和重开不覆盖已有 usage 历史。
- 标准阶段能记录 full/scoped/index+on-demand 的影子比较，但在受控实验前仍向 Agent 发送现有完整上下文。
- 受控实验只有在任务、commit、模型、配置、Sovei/Skill 版本、知识快照和测试环境可比，且安全/质量指标不劣化后才可放行。

## 7. 未决项

无会改变本 Feature 用户行为或契约的未决项。预算数值和受控实验策略属于评测数据之后的后续决策，不阻塞本规格。


---

## 提示契约

## 权威规则

当前 revision：0。仅当前顶层 Feature 产物具有权威性；history/ 下的文件是已失效证据，不得视为当前需求。

## 外部 Skill 指令

# Domain Modeling

Actively build and sharpen the project's domain model as you design. This is the *active* discipline — challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. (Merely *reading* `CONTEXT.md` for vocabulary is not this skill — that's a one-line habit any skill can do. This skill is for when you're changing the model, not just consuming it.)

## File structure

Most repos have a single context:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts. The map points to where each one lives:

```
/
├── CONTEXT-MAP.md
├── docs/
│   └── adr/                          ← system-wide decisions
├── src/
│   ├── ordering/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/                 ← context-specific decisions
│   └── billing/
│       ├── CONTEXT.md
│       └── docs/adr/
```

Create files lazily — only when you have something to write. If no `CONTEXT.md` exists, create one when the first term is resolved. If no `docs/adr/` exists, create it when the first ADR is needed.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update CONTEXT.md inline

When a term is resolved, update `CONTEXT.md` right there. Don't batch these up — capture them as they happen. Use the format in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

`CONTEXT.md` should be totally devoid of implementation details. Do not treat `CONTEXT.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).
来源：mattpocock/domain-modeling v1.0.0

# 阶段：spec

## 输入
已接受的决策、相关的业务/知识/基线证据，以及跨 Feature 的历史决策日志（通过 sovei context build --stage spec --cross-feature 获取）。

## 操作
1. 需求翻译：将 PM 的原话翻译为技术理解，明确“做什么”和“不做什么”。
2. 还原现状：读代码 + 跨 Feature 的 decision-log，理解“代码为什么是现在这个样子”。PM 可能不知道上一个需求做了什么附带改动。
3. 方案与代价：列出可选方案及其代价（影响面、风险、兼容性）。
4. 疑问提取：区分 [product] 和 [tech] 的疑问，每个附推荐和选项。
5. 定义验收标准：用户可见行为、边界、排除项。

## 输出
spec.md：验收标准，不写入易变的实现路径。
reconciliation.md：需求对齐文件，结构如下：

# Reconciliation: <feature-id> <title>

## Need Translation
<PM 原话 → 技术理解>

## Current State
<代码现状 + 为什么是这样，引用跨 Feature 决策>

## Solutions
### Solution A: <name>
- <描述>
- cost: <代价>

### Solution B: <name>
- <描述>
- cost: <代价>

## Questions
### [product] Q1: <问题>
- recommendation: <推荐>
- options: [选项1] [选项2]

### [tech] Q2: <问题>
- recommendation: <推荐>

## Sign-off
- [ ] product: by: ____ date: ____ ref: ____
- [ ] tech: by: ____ date: ____ ref: ____

## 停止条件
仍存在会改变用户行为或契约的未决事项。
