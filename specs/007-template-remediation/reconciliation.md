# Reconciliation: 007-template-remediation 删除 harness/templates 死模板

## Need Translation

**需求来源**（开发者）："模板孤岛问题——harness/templates/sovei/ 下有 13 个模板文件，但引擎从不用它们，纯死文件，还和引擎内嵌模板结构不一致。"

**技术理解**：`harness/templates/sovei/*-template.md` 是 commit `0728305` 创建的历史遗留，从未被 `sovei-core` 任何代码读取。引擎的产物模板由 `workflow-engine.ts:getArtifactTemplate` 内嵌生成（含提示契约与占位符）。外部模板文件既不被消费、也不被打包进 release、更不会被 `project init` 复制到新项目，属于纯死代码，且结构（问题/用户故事）与引擎 prompt 结构（验收标准）不一致，会误导使用者。

## Current State

- 引擎模板唯一来源：`workflow-engine.ts:485-508` 的 `getArtifactTemplate`，内嵌 12 阶段产物的标题/提示契约/占位符。
- `harness/templates/sovei/`：13 个模板文件，由 `0728305` 创建，git 追踪，**无任何代码引用**。
- `project.ts:163` 只创建 `harness/templates/` 空目录（`.gitkeep`），不写入/读取模板。
- `workflow-state-template.yaml` 也不被用：`event-store.ts:87` 用自研 `stateToYaml` 生成状态缓存。
- release 打包：esbuild bundle + 混淆单文件（`build-release.mjs`），`package.json files` 仅 `dist/release/sovei.js` + LICENSE，不含 harness 目录。
- `harness/index.md:30` 将 `templates/` 描述为"壳（文档模板）"，与实现不符。

## Solutions

### Solution A: 删除死模板 + 更新 index.md 说明
- 删除 13 个未被消费的模板文件；`harness/index.md` 更新 `templates/` 说明。
- **优点**：消除死代码与误导；文档-实现一致；零运行时风险。
- **代价**：低。需同步 git 删除 + 文档更新；保留目录结构不影响 `project init`。

### Solution B: 让引擎从 harness/templates 加载模板
- 改造 `getArtifactTemplate` 改为文件读取；需将模板打包进 release。
- **优点**：模板可配置。
- **代价**：高且不可行。release 单文件 bundle 不含 harness；`project init` 不复制模板到新项目，新用户无模板文件可读，会运行时失败。改动大、回归风险高。

### Solution C: 保留但标注"仅供参考"
- 保留文件，文档标注其未被使用。
- **优点**：零删除。
- **代价**：死代码仍在，双源混乱未消除，误导依旧。

**选定**：Solution A。

## Questions

### [tech] Q1: 是否删除 `harness/templates/sovei/` 全部 13 个文件（含 workflow-history/state 两个非产物模板）？
- recommendation: 是。经核实全部 13 个文件均无代码引用，workflow-state 由 `stateToYaml` 生成，history/state 模板同样是死文件。一并删除保持目录纯净。
- options: [是，全部删除] [保留 history/state 模板]

### [tech] Q2: `harness/index.md` 的 `templates/` 说明如何更新？
- recommendation: 改为说明"产物模板由引擎内嵌生成，`templates/` 目录仅作占位"。让文档如实反映实现。
- options: [如实说明引擎内嵌] [移除 templates 目录说明]

## Sign-off
- [x] product: by: developer date: 2026-08-06 ref: 用户选择"拆成多个独立 feature"并授权修复
- [x] tech: by: developer date: 2026-08-06 ref: 基于源码/仓库事实 D1-D5 已核实
