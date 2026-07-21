# Sovei 工作流使用指引

这是 Sovei Feature 工作流的唯一使用指引。A/B/C 分发只在中枢执行，并以 `E:\memory\SYNC.md` 为准。

## 1. 什么时候使用

使用 Sovei：

- 新 Feature、需求变更、跨模块改动，或需要明确验收标准的工作。
- 在新会话中恢复一个已有 Feature 的文件状态。
- 需求还有业务选择，需要逐项确认。
- 需要形成 Spec、影响面、技术方案、任务、实现证据和验收记录。

不使用 Sovei：

- 只查询或解释代码，不需要写 Feature Artifact。
- 已经明确的小型日常操作，且不需要独立 Feature。
- 想在一次调用里自动跑完整条流程。Sovei 每次调用只执行一个阶段。

## 2. 调用格式

Codex：

```text
$sovei-workflow <stage> FEATURE=specs/<feature>
```

Claude Code：

```text
/sovei/<stage> FEATURE=specs/<feature>
```

CodeBuddy：

```text
在命令面板选择 SOVEI: <stage>，参数填写 FEATURE=specs/<feature>
```

也可以直接说：

```text
使用 sovei-workflow skill 执行 <stage> FEATURE=specs/<feature>
```

Trae：

```text
使用 sovei-workflow skill 执行 <stage> FEATURE=specs/<feature>
```

Trae 当前使用项目 Skill 的自然语言显式触发，不假定存在斜杠命令。`implement` 追加 `TASK=<id>`；`reopen` 追加 `TARGET=<stage> REASON="<reason>"`。

四种 IDE 共用同一个 `workflow-state.yaml`。仓库中有多个活动 Feature、首次 bootstrap，或当前指针不能唯一定位时，必须显式提供 `FEATURE`。Agent 输出下一条命令后必须停止，由用户在新的调用中继续。

## 3. 场景与命令

| 场景 | Codex 命令 | 结果与停止点 |
|---|---|---|
| 初始化新 Feature | `$sovei-workflow load FEATURE=specs/<feature>` | 只创建 `workflow-state.yaml`，停在 `grill` |
| 恢复或查看进度 | `$sovei-workflow load FEATURE=specs/<feature>` | 只读校验并报告当前阶段 |
| 逐项确认业务选择 | `$sovei-workflow grill FEATURE=specs/<feature>` | 一次处理一个决策；未清零时继续 `grill` |
| 绘制长周期决策地图 | `$sovei-workflow wayfind FEATURE=specs/<feature>` | 生成或更新 `wayfinder.md` |
| 固化需求和验收契约 | `$sovei-workflow spec FEATURE=specs/<feature>` | 生成或更新 `spec.md`，不写实现代码 |
| 追踪真实影响面 | `$sovei-workflow scope FEATURE=specs/<feature>` | 生成 `scope.md` 和 `coverage-matrix.md` |
| 制定技术方案 | `$sovei-workflow plan FEATURE=specs/<feature>` | 生成 `plan.md`，不写实现代码 |
| 拆解可独立验证的任务 | `$sovei-workflow tasks FEATURE=specs/<feature>` | 生成 `tasks.md` |
| 实现一个就绪任务 | `$sovei-workflow implement FEATURE=specs/<feature> TASK=<id>` | 只实现指定任务并更新 `change-manifest.md` |
| 检查实现与契约缺口 | `$sovei-workflow converge FEATURE=specs/<feature>` | 生成 `convergence-report.md`；缺口转为任务或返工 |
| 执行验收验证 | `$sovei-workflow verify FEATURE=specs/<feature>` | 生成 `evidence.md`，异步或视觉行为需要真实旅程证据 |
| 分类沉淀学习 | `$sovei-workflow learn FEATURE=specs/<feature>` | 生成 `learning-report.md`；不会自动晋级稳定规则 |
| 同步获授权的目标工程 | `$sovei-workflow sync FEATURE=specs/<feature> TARGET=<project>` | 仅处理同次调用明确授权的目标并生成 `sync-report.md` |
| 返工已完成阶段 | `$sovei-workflow reopen FEATURE=specs/<feature> TARGET=<stage> REASON="<reason>"` | 失效目标及其已完成后继，增加 revision 并记录历史 |

所有十二个阶段在 1.1.0 中均为 Active。不要跳过状态机；只有 Validator 报告的 `next_stage` 可以在下一次调用中执行。

## 4. 完整调用顺序

每一行都是一次独立调用：

```text
load
grill                 # 有多个决策时可重复
wayfind               # 短任务可由 grill 判定跳过
spec
scope
plan
tasks
implement TASK=<id>   # 有多个任务时逐个重复
converge
verify
learn
sync TARGET=<project>
```

`implement` 只有在所有必需任务完成或经授权延期后才会推进到 `converge`。`sync` 完成全部已授权目标的后置检查后，状态进入 `status: completed`，并设置 `next_stage: null`。

## 5. 返工规则

实现或验证发现早期契约有误时，不手工改 `workflow-state.yaml`。使用：

```text
$sovei-workflow reopen FEATURE=specs/<feature> TARGET=scope REASON="发现遗漏的异步消费者"
```

`reopen` 只能指向已完成阶段。它会失效该阶段及所有已完成后继、增加 `revision`，并向 `workflow-history.md` 追加记录；同一次调用不会执行目标阶段。完成终态也可以通过该命令返工。

## 6. 每条命令使用的 Skills

机器真相是 `skill-map.yaml`。当前十二个阶段实际加载的内部 Skills 都是：

- `sovei-workflow`
- `knowledge-loader`

当前实际安装并执行的第三方 Skills：无。以下仅为 `candidate_not_installed`，用于后续替换评估，Agent 不得调用：

| 阶段 | 候选第三方 Skills | 备选第三方 Skills |
|---|---|---|
| `load` | 无 | 无 |
| `grill` | `mattpocock-grilling` | `mattpocock-grill-me`、`mattpocock-grill-with-docs` |
| `wayfind` | `mattpocock-wayfinder` | 无 |
| `spec` | `mattpocock-domain-modeling`、`mattpocock-to-spec` | 无 |
| `scope` | `mattpocock-domain-modeling` | 无 |
| `plan` | `mattpocock-domain-modeling` | 无 |
| `tasks` | `mattpocock-to-tickets` | 无 |
| `implement` | `mattpocock-implement` | 无 |
| `converge` | `mattpocock-code-review` | 无 |
| `verify` | `mattpocock-code-review` | 无 |
| `learn` | `mattpocock-handoff` | 无 |
| `sync` | 无 | 无 |

查看任一阶段的完整来源、固定 commit、路径和状态：

```powershell
pnpm --dir packages\sovei-system run skills -- <stage>
```

## 7. 每次调用应返回什么

每次 Sovei 调用必须报告 Feature、风险等级、已完成和当前阶段、阻塞项、校验结果、知识来源、实际使用的 Skills、候选和备选第三方 Skills、修改的 Artifact，以及下一次独立调用的完整命令。

## 8. 常见停止情况

| 情况 | 处理方式 |
|---|---|
| 多个 Feature 无法唯一确定 | 重新调用并显式传入 `FEATURE=...` |
| 状态声明完成但 Artifact 缺失 | 停止并审查冲突，不根据聊天记录自动修复 |
| `open_decisions` 非空 | 继续单独调用 `grill` |
| `blocked_by` 非空 | 处理阻塞后重新调用当前阶段 |
| 实现发现需求、范围或方案无效 | 调用 `reopen` 回到最早失效阶段 |
| `sync` 没有同次明确 `TARGET` 授权 | 停止，不执行 Pull |
| 用户要求一次跑完 | 只执行当前合法阶段并给出下一条命令 |

## 9. 中枢维护命令

这些命令维护 Sovei 系统本身，不推进 Feature：

```powershell
pnpm --dir packages\sovei-system install
pnpm --dir packages\sovei-system run check
pnpm --dir packages\sovei-system run validate
pnpm --dir packages\sovei-system run skills -- <stage>
<python> -B .agents\skills\sovei-workflow\scripts\test_validate_workflow.py
<python> .agents\skills\sovei-workflow\scripts\reopen_workflow.py --help
```

A/B/C 的 `Status`、`Diff` 和 `Pull` 命令统一见 `E:\memory\SYNC.md`。没有明确同步授权时，只允许只读 `Status` 和 `Diff`。
