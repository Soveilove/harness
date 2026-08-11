# 功能规格：过期感知 L1

> 由 Sovei 阶段生成：spec
> Feature：024-stale-aware-l1

## 问题

个人开发者绕过 Sovei 工作流直接修改代码后，`harness/project/` 下的治理资产（红线、知识、代码地图、规则）不再可信——代码已变，但治理资产还停留在旧版本。当前 `sovei context build` 和 `sovei quick` 都不会提示这种「治理资产可能过期」的状态，开发者会误以为红线/知识仍代表当前代码。

## 目标（做什么）

在 `sovei context build` 与 `sovei quick` 时，对比**当前 git HEAD** 与**上次 sync 记录的基线**。若仓库自上次 sync 以来有新的 git 提交（HEAD 已前进），则提示用户「治理资产可能不可信，建议以当前分支为基线重新校准」。

## 不做什么（边界 / 排除项）

- **不做语义级 drift 检测（L3）**：不解析提交内容、不计算影响面、不标记具体哪条红线/知识已失效。本期只做「HEAD 变了，提醒你治理资产可能过期」的粗粒度提示。
- **不做强制门禁**：提示是非阻断的 warning 级，不阻止命令执行。
- **不做自动重新校准**：只提示，不自动写基线或改写治理资产；由用户手动触发 sync 重新校准。
- **不做跨分支处理**：仅对比当前分支的 HEAD，不做多分支合并判断。

## 验收标准（用户可见行为）

**AC-1（context build 过期提示）**：当存在 sync 基线且当前 HEAD 与该基线不同时，`sovei context build` 的 Markdown 输出顶部显示「⚠ 治理资产可能过期」警告段，包含：基线记录的 revision、当前 HEAD、`recordedAt` 时间。

**AC-2（context build --json 过期字段）**：当满足 AC-1 条件时，`sovei context build --json` 输出包含 `stale` 结构化字段（含 `{ isStale, baselineRevision, currentHead, recordedAt }`）；不满足时 `stale.isStale = false`。

**AC-3（quick 过期提示）**：当满足 AC-1 条件时，`sovei quick` 的人类可读输出增加一行「⚠ 自上次 sync 以来治理资产可能已过期」警告；`--json` 输出包含与 AC-2 相同的 `stale` 字段。

**AC-4（无基线不提示）**：从未执行过 sync（无基线文件）时，不显示过期警告（`stale.isStale = false`），不能把「未知」误报为「过期」。

**AC-5（HEAD 读取失败不提示）**：非 git 仓库或 `git rev-parse HEAD` 失败时，不显示过期警告，命令正常执行。

**AC-6（HEAD 相同不提示）**：当前 HEAD 与基线相同（无新提交）时不显示过期警告。

**AC-7（sync 记录基线）**：执行 `sovei workflow sync <feature> --complete` 成功后，仓库级基线文件被写入当前分支名 + HEAD + 记录时间。

## 排除的实现路径（易变细节，不在本 spec 固化）

- 基线文件的具体路径与 schema（见 reconciliation.md Solution）
- git 命令的封装方式（复用 `getGitBaseline`）
- 警告文本的精确措辞
