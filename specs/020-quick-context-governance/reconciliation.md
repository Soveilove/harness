# Reconciliation: 020-quick-context-governance Quick Channel, Context Policy and Usage Observation

## Need Translation

用户希望小而明确的 IDE 修改不再默认进入完整 Sovei 工作流，同时保留风险兜底和“只改目标、其他没变”的可验证证据。需求不是强制所有 Agent 进入 Sovei，而是增加一个权威 `sovei quick` 入口，并把低风险局部修改分流到六步轻量闭环；高风险或不确定请求必须升级。

同时，现有 `context build` 会把 active redlines 和 stable rules 全量放入 required，导致 Quick 和标准流程都可能上下文膨胀。因此需要统一 Context Policy：固定控制面、目标索引和按需全文共用一套选择契约，先观测/影子计算，再决定是否受控切换。

最后，核心只记录使用事实到 `harness/project/usage.jsonl`，不承担账单和导出。

## Current State

- 工作流当前固定从 `load → grill → wayfind → spec ...` 推进，尚无 Quick 入口或低风险分流状态。
- `context build --paths` 目前只参与项目规范匹配；active redlines 和 stable rules 仍由 context builder 无条件放入 required。红线 `scope` 仍为自由文本，不能作为唯一机器匹配依据。
- 变更控制已具备 active redline、assessment、affected surface 和授权校验，但这些能力主要服务完整工作流，尚未形成 QuickRun 的 Capture/Check/Verify 契约。
- 项目初始化/扫描已有“只补缺、不随意覆盖”的模式；usage 历史需要沿用该原则，但当前尚无 usage 文件和事件 schema。
- Wayfinder 已确认：`sovei quick` 权威、IDE slash 薄封装；Quick 使用固定控制面 + 目标索引 + 按需展开；`--paths` 先影子报告后受控切换；usage 本期不做导出；预算先观测。

## Solutions

### Solution A: QuickRun + 统一 Context Policy + usage 事实日志（选定）

- CLI 提供唯一权威 QuickRun 契约，IDE slash 仅转发。
- 低风险路径执行 Capture → Check → Confirm → Implement → Verify → Report。
- CLI 负责基线、真实 diff、硬风险和事件事实；Agent 负责目标解释、修改和语义说明。
- 所有入口共用 Context Policy 的固定控制面、候选索引、按需展开和审计字段。
- 先记录完整上下文与影子候选结果，不改变现有发送行为；评测后再做受控实验。
- 使用事实写入 `harness/project/usage.jsonl`。
- cost: 需要新增 QuickRun 状态/命令、Context Policy 选择模型、事件记录和跨入口测试；第一阶段不能立即兑现 Token 节省。

### Solution B: 让所有 Agent 先强制进入完整 Sovei

- 所有自然语言修改统一进入现有 12 阶段链，再由工作流阶段决定是否简化。
- cost: 小需求仍承担完整上下文和阶段成本；无法解决 IDE Agent 不一定调用 Sovei 的入口问题；会放大上下文膨胀和用户摩擦。
- status: rejected by grill/wayfind。

### Solution C: Quick 与标准流程各自维护上下文和风险规则

- Quick 使用一套专用轻量筛选器，标准 workflow 保持现状。
- cost: 红线、基线和升级语义容易在入口间漂移；同一修改在 Check/Implement/Verify 可能得到不同结论；难以归因评测结果。
- status: rejected by wayfind。

## Questions

### [product] Q1: 是否允许 IDE slash 作为 Quick 的用户入口？

- recommendation: 允许，但只作为 `sovei quick` 的薄封装，不拥有独立语义。
- resolution: 已确认。`sovei quick` 是唯一权威实现；IDE `/sovei-quick` 可存在但必须复用 QuickRun 契约。

### [product] Q2: 本 Feature 是否实现 usage 脱敏导出？

- recommendation: 不实现；本期只记录使用事实，导出另立 Feature。
- resolution: 已确认。不做 `usage export --redacted`、billing 或费用命令。

### [tech] Q3: `context build --paths` 是否立即改变实际上下文？

- recommendation: 不立即改变；先输出 full/scoped/index+on-demand 的影子差异和解释。
- resolution: 已确认。第一阶段保持现有完整发送行为，第二阶段需受控实验批准。

### [tech] Q4: 标准阶段预算是否现在拍定阈值？

- recommendation: 不拍定；先记录真实 token、字符/字节和质量/安全结果。
- resolution: 已确认。评测数据后按 Pareto 前沿决定策略。

## Sign-off

- [x] product: decision log and Wayfinder resolutions confirmed by user on 2026-08-07
- [x] tech: current CLI/context behavior checked; scope and migration boundary recorded by agent on 2026-08-07

## Stop Condition

当前不存在会改变用户行为或契约的未决事项。实现细节、预算数值和实验样本属于后续 scope/plan/tasks 阶段，不在本规格中提前决定。


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
