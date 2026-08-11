# Reconciliation: 026-feature-archive Feature Archive

## Need Translation

**PM 原话**：Feature 完成后目录太杂乱，20+ 个 .md 文件堆在一起，需要把过程产物归档。

**技术理解**：实现 `sovei feature archive <id>` CLI 命令，将已完成 Feature 的过程产物（各阶段中间 .md 文件）移动到 `_archive/` 子目录。顶层只保留被 `context build`、`cross-feature`、`workflow` 引擎等模块直接依赖的持久文件。

## Current State

### 代码现状

1. **没有 `feature` 命令组**——当前 CLI 有 workflow/workspace/governance/knowledge 等 12 个命令组，但没有 `feature` 命令组
2. **已有归档逻辑**——`workflow-engine.ts` 的 `archiveInvalidatedArtifacts` 在 reopen/change 时将失效产物移到 `history/revision-{N}/`，但这是按 revision 归档失效产物，不是"Feature 完成后折叠过程产物"
3. **`storage.list()` 非递归**——只列目录下文件，不列子目录。归档到 `_archive/` 后，`context build` 和 `redline-scanner` 不会扫到归档文件，正是期望行为
4. **`ArtifactRepository.list()` 非递归**——`context build` 的 Feature 产物加载只列顶层 .md 文件。归档后 required 项更精简，解决上下文膨胀

### 为什么是这样

- 之前没有归档功能是因为 Feature 数量少（<10），目录杂乱不构成痛点
- 随着 Feature 增长到 25+，每次打开 `specs/` 目看到每个 Feature 目录 20+ 个文件，视觉噪音大
- `context build` 把所有顶层 .md 产物塞入 required 项，加剧上下文膨胀（Feature 022 已部分解决，但归档能从源头减少）

## Solutions

### Solution A: 新建 `feature` 命令组 + `_archive/` 子目录（推荐）
- 新建 `cli/commands/feature.ts`，注册 `sovei feature archive <id>`
- 过程产物移到 `{featurePath}/_archive/`，持久文件留顶层
- `storage.list()` 非递归特性天然隔离归档文件
- cost: 新增一个命令文件 + 测试，改动范围小

### Solution B: 在 `workflow sync --complete` 时自动归档
- 在 sync 阶段 postExecute 中自动执行归档
- cost: 改动 workflow-engine 逻辑，风险较高；用户可能不想自动归档

### Solution C: 用 `history/` 目录替代 `_archive/`
- 复用现有 `history/` 目录
- cost: 与 reopen/change 的 `history/revision-{N}/` 语义冲突

**选择 Solution A**：改动范围最小，语义最清晰，不影响现有逻辑。

## Questions

### [tech] Q1: 归档文件清单是否完整？
- recommendation: 当前清单覆盖 12 个阶段产出中除持久文件外的所有 .md 产物。如果未来新增阶段产物，需同步更新清单——建议用"排除法"（归档所有顶层 .md 文件，排除持久文件白名单）而非"包含法"（列出要归档的文件）。
- options: [排除法（推荐）] [包含法]

## Sign-off
- [x] product: by: user date: 2026-08-11 ref: chat-confirmation
- [x] tech: by: AI date: 2026-08-11 ref: grill-decision-log
