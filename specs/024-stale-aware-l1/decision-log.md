# 决策日志：024-stale-aware-l1

> 由 Sovei 阶段生成：grill
> Feature：过期感知 L1——在 `context build` / `quick` 时对比当前 HEAD 与上次 sync 基线，提示治理资产可能不可信

## 已核实事实（事实核实）

| # | 事实 | 证据 |
|---|---|---|
| F1 | `sovei context build` 调用 `buildContextPolicy` 时**未传 baselineRevision**，恒为 null；不读取 workflow-state.yaml 或 usage.jsonl | `cli/commands/context.ts` L136-140、`context/policy.ts` L222 |
| F2 | **没有任何地方持久化「上次 sync 的 git HEAD」**——这是本功能核心缺口 | `engine/types.ts` L26-42（WorkflowState 无 baselineRevision 字段）、`engine/event-store.ts` L112-132（stateToYaml 无此字段）、`stages/index.ts` syncStage 只产 sync-report.md |
| F3 | 唯一 git 封装是 `quick/git-verifier.ts`，导出 `getGitBaseline(workspaceRoot)` 返回当前 HEAD | `quick/git-verifier.ts` L53-60 |
| F4 | `quick` 命令已经用当前 HEAD 作 baselineRevision 写进 usage.jsonl | `cli/commands/quick.ts` L111 |
| F5 | workflow 通道（`recordContextObservation`）写 usage 时 baselineRevision 为 null | `engine/workflow-engine.ts` L564 |

## 可推断决策（自行决策，已记录理由）

| # | 决策 | 理由 | 被拒绝方案 |
|---|---|---|---|
| D1 | 复用 `getGitBaseline()` 获取当前 HEAD，不新增 git 封装 | 已有成熟封装，避免重复 | 新增 git helper |
| D2 | 需新增「仓库级 sync 基线」持久化载体（待 Q1 确认具体载体） | F2 证明现状无载体，且过期感知是仓库级概念，非单 Feature 级 | 无 |
| D3 | 提示同时覆盖 `context build` 与 `quick` | 评估报告明确要求两者都提示 | 只做其一 |

## 范围性决策（用户授权按推荐决策）

> 用户指示「按照你的理解看待这个」，授权我按工程合理性推断并决策，不逐项等待拍板。以下决策均按推荐方案定案。

| # | 决策 | 决策内容 | 理由 | 被拒绝方案 |
|---|---|---|---|---|
| Q1 | 基线数据存哪里 | **方案 B：新增仓库级基线文件 `harness/project/governance/sync-baseline.json`**，记录 `{ branch, head, recordedAt }` | 治理资产（红线/知识/代码地图）是仓库级概念，单 Feature 的 workflow-state 无法承载「上次校准整个仓库治理资产」的语义；独立文件语义清晰、与 governance 资产同目录、可被 `context build` / `quick` 统一读取 | A. 扩展 WorkflowState（多 Feature 互相覆盖，语义错误）；C. 读 usage.jsonl（审计流非基线语义，quick 事件混淆来源） |
| Q2 | 过期触发条件 | **HEAD 与基线不同即触发（无新提交数阈值），非阻断 warning 级** | 任何新提交都可能改动红线/知识/地图，无法预判提交内容；个人级只需「知道可能不可信」并自行校准，无需精确到新提交数；非阻断避免干扰正常工作流 | 设定新提交数阈值（需解析 commit 内容，过度设计且不可靠） |
| Q3 | 提示输出形式 | **`context build`：Markdown 包顶部加「⚠ 治理资产可能过期」警告段 + `--json` 加 `stale` 字段；`quick`：人类输出加警告行 + `--json` 加 `stale` 字段** | 兼容两种消费方式（人读 Markdown + 脚本读 JSON），stale 字段结构化为宿主 AI 可编程判断 | 仅 stderr 警告（脚本无法消费）；仅 Markdown（quick 是 JSON 主导） |

### 分支处理约定（补充决策）
- 基线文件记录**当前分支名 + HEAD**。多分支场景下按分支记录，读取时对比同一分支。
- 无基线文件（从未 sync）或 HEAD 读取失败时，**不提示**（不能把「未知」误报为「过期」）。

---
