# Reconciliation: 024-stale-aware-l1 过期感知 L1

## Need Translation（需求翻译）

**PM 原话**：普通 AI 会话（不经 Sovei 工作流）直接变更代码后，业务红线、代码地图、知识库等治理资产不可信——代码已经改了，但红线/地图/知识还停留在旧版本。

**技术理解**：在 `context build` / `quick` 时，对比当前 git HEAD 与「上次通过 Sovei sync 校准治理资产时的 HEAD」。若 HEAD 已前进（有新提交），说明代码可能在治理资产之外被改过，需要提示用户治理资产可能过期。本质是**仓库级粗粒度过期检测**，不解析提交内容（那是 L3 语义 drift，本期不做）。

## Current State（代码现状）

- `sovei context build` 调用 `buildContextPolicy` 时**未传 baselineRevision**，恒为 null（`cli/commands/context.ts` L136-140）；不读取 workflow-state.yaml 或 usage.jsonl。
- **没有任何地方持久化「上次 sync 的 git HEAD」**：`WorkflowState` 无 baselineRevision 字段（`engine/types.ts` L26-42）、`stateToYaml` 无此字段（`engine/event-store.ts` L112-132）、syncStage 只产出 sync-report.md（`stages/index.ts` L603-640）。
- 唯一 git 封装 `quick/git-verifier.ts` 导出 `getGitBaseline()`（返回当前 HEAD）。
- `quick` 命令已用当前 HEAD 作 baselineRevision 写 usage（`cli/commands/quick.ts` L111），但那是「当前 HEAD」而非「上次 sync 基线」，且 context build 不读。

**为什么是这样**：过期感知是 2026-08-10 评估报告新提出的个人级 P0 缺口，此前从未有 spec Feature 或源码模块。现有 baselineRevision 字段是为 quick 的 Git diff 验证服务的（对比声明范围 vs 实际 diff），语义与「sync 基线」不同。

## Solutions（方案与代价）

### Solution A: 新增仓库级基线文件 `sync-baseline.json` + sync 写入 + context/quick 读取对比（推荐）

- sync 阶段 postExecute 捕获当前 HEAD + 分支 + 时间，写入 `harness/project/governance/sync-baseline.json`。
- 新增 `stale-detector.ts`：读取基线 → 取当前 HEAD → 若不同返回 `{ isStale, baselineRevision, currentHead, recordedAt }`。
- `context build` 在输出前调用 stale-detector，Markdown 顶部加警告段 + `--json` 加 `stale` 字段；`quick` 同理。
- cost: 新增 1 个文件 + 1 个模块 + 2 处 CLI 接入 + ~6 条测试。改动面中，符合「仓库级」语义，语义清晰。

### Solution B: 扩展 WorkflowState，sync 时写每个 Feature 的 workflow-state.yaml

- 在 `WorkflowState` 加 `baselineRevision`，sync 完成时写入。
- cost: 多 Feature 各自记录、互相覆盖，无法表达「仓库级治理资产」的过期状态；schema 变更涉及持久化兼容（PERSISTED_SCHEMA_COMPAT 红线）。语义错误，风险高。

### Solution C: 从 usage.jsonl 读最后一次 sync 事件

- 在 usage 事件流里找最后一个 workflow 通道的 sync 事件取 baselineRevision。
- cost: usage 是审计流非基线语义；quick 事件也写 baselineRevision 会混淆来源；需要扫描事件流，性能与语义都不理想。

**选择**：Solution A。理由见 decision-log Q1。

## Questions

无未决范围性疑问（grill 已按用户授权完成全部决策）。技术方案已通过 spec 验收标准固化。

## Sign-off

- [ ] product: by: ____ date: ____ ref: ____
- [ ] tech: by: ____ date: ____ ref: ____

> 注：本 Feature 风险等级 S1，按工作流约定 spec 阶段无需强制双签门禁（S2/S3 风险才需要）。
