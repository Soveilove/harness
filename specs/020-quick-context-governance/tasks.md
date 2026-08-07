# 任务清单

> Feature：020-quick-context-governance
> 任务按依赖顺序排列；每项均可独立验证，并保持旧 workflow/context 行为兼容。

- [x] TASK-001: 建立 QuickRun、Context Policy、Usage Event 与 Git Verification 契约
  - **Blocked by:** None — can start immediately
  - **范围：** 新增公开领域类型、schema 校验、QuickRun 六步状态转换与终态规则；定义 `unknown` token 状态与 `null` 数值语义；定义 Context Policy 控制面、分层项、选择解释和 shadow comparison；定义 Git verifier 结果契约。
  - **验收：** 状态机拒绝跳过 Check/Confirm/Verify；stop/escalate/completed/failed/interrupted 可表达；非法 usage token 不被当作 0；契约可被 CLI、测试和后续服务复用。
  - **验证：** 契约单元测试覆盖成功、跳步、风险停止、中断、unknown/null token 和非法输入。

- [x] TASK-002: 实现 append-only Usage Recorder 与 Git 只读事实适配器
  - **Blocked by:** TASK-001
  - **范围：** Filesystem/Memory Storage 下的 usage 初始化、追加和 schema 校验；只读 Git baseline/diff 读取、目标范围比较、非 Git/baseline 缺失/命令失败状态；不执行 checkout/reset/回退。
  - **验收：** `run-start` 可在中断前保留；已有 usage 历史不覆盖；缺 `run-end` 可识别 interrupted；真实 diff 能区分目标内修改、越界文件和不可判断状态；Git 参数不通过 shell 拼接。
  - **验证：** storage 单元测试、临时 Git 仓库测试、无 Git 与 baseline 错误测试、并发追加测试。

- [x] TASK-003: 接入统一 Context Policy 并增加 full/scoped 影子解释
  - **Blocked by:** TASK-001
  - **范围：** 从现有 context builder/command 抽取兼容选择层；固定控制面、全局不变量、目标索引、候选项、按需展开和选择决策；`context build --paths --json` 增加 shadow/explain 字段，但保留现有 `required` 实际内容和旧 Markdown/JSON 可读取性。
  - **验收：** 标准 context 与 Quick 使用同一 policy version/baseline/候选字段；全局不变量始终保留；不确定相关性保留候选并最多扩展一次；over-budget 不改变实际发送包；旧 context 测试继续通过。
  - **验证：** Context Policy 单元测试、现有 context CLI 测试、JSON snapshot/兼容字段测试、全局红线保留测试。

- [x] TASK-004: 实现 `sovei quick` 六步闭环与升级/越界报告
  - **Blocked by:** TASK-002, TASK-003
  - **范围：** 注册 CLI 权威入口；串起 Capture/Check/Confirm/Implement/Verify/Report；记录 run-start/context-selected/run-end；接收目标、排除项、路径/符号和声明测试；执行硬风险停止、模糊目标升级、真实 diff 越界停止；不自动回退、不污染普通 workflow state、不自动 bootstrap Feature。
  - **验收：** 明确低风险单文件场景输出 completed 报告；共享契约、权限、数据、异步、红线或不确定范围输出 stopped/escalated；确认前不实施；越界不回退且报告未验证项；`--root` 与默认根目录语义一致；机器可读和人读输出共享同一结果契约。
  - **验证：** CLI 成功/升级/越界/测试失败/中断测试；临时 Git 仓库真实 diff 集成测试；普通 workflow events 不被写入。

- [x] TASK-005: 将 usage 初始化与 Quick 命令契约纳入项目兼容路径
  - **Blocked by:** TASK-002, TASK-004
  - **范围：** `project init`、`--force`、onboard、rescan 和重开路径只补缺 `harness/project/usage.jsonl`；默认 gitignore 原始 usage；项目声明增加稳定 Quick 命令说明但不覆盖用户已有非 Sovei 内容；保留旧 usage schema 读取。
  - **验收：** 新项目创建 usage 文件；已有 usage 内容字节级保留并只追加；force/onboard/rescan 不清空历史；无 export/billing/telemetry 入口；usage 不含完整原话、Prompt、源码、绝对路径或会话 ID。
  - **验证：** project CLI 初始化/force/onboard/rescan 重复运行测试、gitignore 断言、旧事件兼容测试、负向命令测试。

- [x] TASK-006: 完成 020 全链路回归与工作流交付证据
  - **Blocked by:** TASK-003, TASK-004, TASK-005
  - **范围：** 汇总关键路径自动化测试，验证标准 workflow/context/redline/change-control 不回归，补充实现说明和可审计运行证据；完成 tasks/implement/converge/verify 阶段要求。
  - **验收：** Quick/Policy/usage/Git verifier 关键路径均有自动化覆盖；现有完整测试通过；真实临时 Git 成功与越界场景均满足规格；over-budget 不静默截断；工作流状态与完成证据一致。
  - **验证：** `pnpm --dir packages/sovei-core check`、`pnpm --dir packages/sovei-core test`，以及针对 020 的 CLI/临时 Git 场景复跑。

---

## 任务依赖图

```text
TASK-001
├── TASK-002
├── TASK-003
└── TASK-002 + TASK-003 → TASK-004
    TASK-002 + TASK-004 → TASK-005
    TASK-003 + TASK-004 + TASK-005 → TASK-006
```

---

## 提示契约

## 权威规则

当前 revision：0。仅当前顶层 Feature 产物具有权威性；history/ 下的文件是已失效证据，不得视为当前需求。

## 外部 Skill 指令

# To Tickets

Break a plan, spec, or conversation into a set of **tickets** — tracer-bullet vertical slices, each declaring the tickets that **block** it.

The issue tracker and triage label vocabulary should have been provided to you — run `/setup-matt-pocock-skills` if not.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If the user passes a reference (a spec path, an issue number or URL) as an argument, fetch it and read its full body and comments.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code. Ticket titles and descriptions should use the project's domain glossary vocabulary, and respect ADRs in the area you're touching.

Look for opportunities to prefactor the code to make the implementation easier. "Make the change easy, then make the easy change."

### 3. Draft vertical slices

Break the work into **tracer bullet** tickets.

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests) — vertical, NOT a horizontal slice of one layer
- A completed slice is demoable or verifiable on its own
- Each slice is sized to fit in a single fresh context window
- Any prefactoring should be done first

</vertical-slice-rules>

Give each ticket its **blocking edges** — the other tickets that must complete before it can start. A ticket with no blockers can start immediately.

**Wide refactors are the exception to vertical slicing.** A **wide refactor** is one mechanical change — rename a column, retype a shared symbol — whose **blast radius** fans across the whole codebase, so a single edit breaks thousands of call sites at once and no vertical slice can land green. Don't force it into a tracer bullet; sequence it as **expand–contract**. First expand: add the new form beside the old so nothing breaks. Then migrate the call sites over in batches sized by blast radius (per package, per directory), each batch its own ticket blocked by the expand, keeping CI green batch to batch because the old form still exists. Finally contract: delete the old form once no caller remains, in a ticket blocked by every migrate batch. When even the batches can't stay green alone, keep the sequence but let them share an integration branch that all block a final integrate-and-verify ticket — green is promised only there.

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each ticket, show:

- **Title**: short descriptive name
- **Blocked by**: which other tickets (if any) must complete first
- **What it delivers**: the end-to-end behaviour this ticket makes work

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the blocking edges correct — does each ticket only depend on tickets that genuinely gate it?
- Should any tickets be merged or split further?

Iterate until the user approves the breakdown.

### 5. Publish the tickets to the configured tracker

Publish the approved tickets. **How** depends on the tracker `/setup-matt-pocock-skills` configured — the tickets are the same either way, only the shape of the blocking edges changes:

- **Local files** → write one file per ticket under `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in dependency order (blockers first). Each file's "Blocked by" lists the numbers/titles it depends on. Use the per-ticket file template below — one ticket per file, never a single combined file.
- **A real issue tracker (GitHub, Linear, …)** → publish one issue per ticket in dependency order (blockers first) so each ticket's blocking edges can reference real identifiers. Use the platform's native blocking / sub-issue relationship where it has one; otherwise set each ticket's "Blocked by" to the blocking issues. Apply the `ready-for-agent` triage label unless instructed otherwise — the tickets are agent-grabbable by construction.

Work the **frontier**: any ticket whose blockers are all done. For a purely linear chain that means top to bottom.

Do NOT close or modify any parent issue.

<local-ticket-template>

# <NN> — <Ticket title>

**What to build:** the end-to-end behaviour this ticket makes work, from the user's perspective — not a layer-by-layer implementation list.

**Blocked by:** the numbers/titles of the tickets that gate this one, or "None — can start immediately".

**Status:** ready-for-agent

- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2

</local-ticket-template>

<issue-template>

## Parent

A reference to the parent issue on the tracker (if the source was an existing issue, otherwise omit this section).

## What to build

The end-to-end behaviour this ticket makes work, from the user's perspective — not layer-by-layer implementation.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- A reference to each blocking ticket, or "None — can start immediately".

</issue-template>

In either form, avoid specific file paths or code snippets — they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.
来源：mattpocock/to-tickets v1.0.0

# 阶段：tasks

## 输入
有效的 Plan、Scope、Coverage Matrix、决策和当前代码基线。

## 操作
将工作拆成单个新上下文可完成、可独立验证的纵向任务。为每项声明依赖、文件/契约范围、验收标准和验证方式。

## 输出
tasks.md；使用稳定的清单 ID，例如 "- [ ] TASK-001: 描述"。不得修改实现文件。

## 停止条件
任务依赖未解决契约或未知影响面时，重新打开 plan 或 scope。

