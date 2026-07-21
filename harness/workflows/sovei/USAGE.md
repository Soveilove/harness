# Sovei 工作流使用指引

这是 Sovei Feature 工作流的唯一使用指引。A/B/C 分发操作只在中枢执行，并以 `E:\memory\SYNC.md` 为准。

## 1. 先判断是否应该使用

使用 Sovei：

- 新 Feature、需求变更、跨模块改动或需要明确验收标准的工作。
- 新会话中恢复一个已有 Feature 的文件状态。
- 需求仍有业务选择，需要逐项确认。
- 需要形成 Spec、影响面清单或技术方案。

不要使用 Sovei：

- 只查询代码、解释现状或回答一个不写文件的问题。
- 已经明确的小型日常操作，且不需要 Feature Artifact。
- 想一次性自动跑完整条流程。Sovei 每次调用只执行一个阶段。
- 想同步 A/B/C。同步是独立运维操作，不是当前可用的 Feature 阶段。

## 2. 调用格式

Codex：

```text
$sovei-workflow <stage> FEATURE=specs/<feature>
```

Claude Code：

```text
/sovei/<stage> FEATURE=specs/<feature>
```

`FEATURE` 在以下情况必须提供：

- 第一次 bootstrap 一个还没有 `workflow-state.yaml` 的 Feature。
- 仓库中存在多个可能的活动 Feature。
- 当前目录或 Feature 指针不能唯一确定目标。

一次调用只能写一个阶段的 Artifact。Agent 输出下一条命令后必须停止，由用户在新的调用中继续。

## 3. 场景与命令

| 场景 | Codex 命令 | 当前可用 | 结果与停止点 |
|---|---|---|---|
| 新 Feature 初始化 | `$sovei-workflow load FEATURE=specs/<feature>` | 是 | 只创建 `workflow-state.yaml`，然后停在 `grill` |
| 新会话恢复或查看进度 | `$sovei-workflow load FEATURE=specs/<feature>` | 是 | 只读校验并报告当前阶段，不修改已有状态 |
| 还有业务选择没有确认 | `$sovei-workflow grill FEATURE=specs/<feature>` | 是 | 一次只处理一个决策；仍有问题时下次继续调用 `grill` |
| 决策完成，需要需求契约 | `$sovei-workflow spec FEATURE=specs/<feature>` | 是 | 生成或更新 `spec.md`，不写实现代码 |
| 需要追踪真实影响面 | `$sovei-workflow scope FEATURE=specs/<feature>` | 是 | 生成 `scope.md` 和 `coverage-matrix.md` |
| 影响面明确，需要技术方案 | `$sovei-workflow plan FEATURE=specs/<feature>` | 是 | 生成 `plan.md`，不写实现代码 |
| 大型需求需要决策地图 | `$sovei-workflow wayfind FEATURE=specs/<feature>` | 否 | 当前返回 `stage_not_implemented` |
| 拆解实现任务 | `$sovei-workflow tasks FEATURE=specs/<feature>` | 否 | 当前返回 `stage_not_implemented` |
| 开始写代码 | `$sovei-workflow implement FEATURE=specs/<feature>` | 否 | 当前返回 `stage_not_implemented` |
| 检查实现缺口 | `$sovei-workflow converge FEATURE=specs/<feature>` | 否 | 当前返回 `stage_not_implemented` |
| 执行验收验证 | `$sovei-workflow verify FEATURE=specs/<feature>` | 否 | 当前返回 `stage_not_implemented` |
| 沉淀学习和候选规则 | `$sovei-workflow learn FEATURE=specs/<feature>` | 否 | 当前返回 `stage_not_implemented` |
| 将稳定 Harness 分发到工程 | `$sovei-workflow sync FEATURE=specs/<feature>` | 否 | 当前返回 `stage_not_implemented`；实际操作见 `E:\memory\SYNC.md` |

不要跳过状态机直接调用后续阶段。只有 Validator 报告的 `next_stage` 可以在下一次调用中执行。

## 4. 推荐调用顺序

普通 Feature 当前可执行的流程：

```text
新调用 1: load
  -> 新调用 2: grill
  -> 如仍有决策，新调用 3: grill
  -> 新调用 N: spec
  -> 下一调用: scope
  -> 下一调用: plan
  -> 停止，等待 tasks 阶段正式实现
```

`grill` 可以重复调用，但每次仍只属于一个阶段调用。不得在同一条请求里写“执行 load、grill、spec、scope、plan”。

## 5. 每条命令实际使用的 Skills

机器真相是 `skill-map.yaml`。当前所有可用阶段实际只加载内部 Skills：

- `sovei-workflow`
- `knowledge-loader`

当前没有实际安装或执行的第三方 Skill。Matt Pocock Skills 只处于 `candidate_not_installed`，Agent 必须报告候选但不得调用。

查看任一阶段的完整 Skill 来源、固定 commit、路径和状态：

```powershell
pnpm --dir packages\sovei-system run skills -- load
pnpm --dir packages\sovei-system run skills -- grill
pnpm --dir packages\sovei-system run skills -- spec
```

## 6. 每次调用应返回什么

每次 Sovei 调用必须报告：

- Feature 路径和风险等级。
- 已完成阶段、当前阶段、阻塞项和下一合法阶段。
- 本次读取的知识来源。
- 本次实际使用的内部与第三方 Skills。
- 未安装的候选和备选第三方 Skills。
- 本次修改的 Artifact；没有修改时明确写“无”。
- 下一次需要单独执行的完整命令。

缺少这些字段时，不应继续下一阶段。

## 7. 常见停止情况

| 情况 | 处理方式 |
|---|---|
| 多个 Feature 无法唯一确定 | 重新调用并显式传入 `FEATURE=...` |
| 状态声明完成但 Artifact 缺失 | 停止；先审查冲突，不允许根据聊天记录自动修复 |
| `open_decisions` 非空 | 继续单独调用 `grill` |
| `blocked_by` 非空 | 处理阻塞条件后重新调用当前阶段 |
| 请求了 Future 阶段 | 停止并报告 `stage_not_implemented` |
| `plan` 发现 Scope 不完整 | 当前状态机还不能安全回退；停止并人工修订状态/Artifact 方案 |
| 用户要求一次跑完 | 只执行当前合法阶段并给出下一条命令 |

## 8. 中枢维护命令

这些命令用于维护 Sovei 系统本身，不会推进 Feature 阶段：

```powershell
pnpm --dir packages\sovei-system install
pnpm --dir packages\sovei-system run check
pnpm --dir packages\sovei-system run validate
pnpm --dir packages\sovei-system run skills -- <stage>
```

A/B/C 的 `Status`、`Diff` 和 `Pull` 命令统一见中枢 `E:\memory\SYNC.md`。没有明确的工程同步授权时，只允许执行只读 `Status` 和 `Diff`。
