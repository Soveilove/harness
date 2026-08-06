# 学习报告

> 由 Sovei 阶段生成：learn
> Feature：011-agents-single-source

## 观察分类

### O1：修改源码后必须重编译 dist 测试才反映（candidate 晋级提案）
- **来源 Feature**：011-agents-single-source
- **证据**：测试运行 `dist/cli/index.js`（编译产物）。修改 `project.ts` 源码后，未重编译 dist 时测试仍用旧逻辑（AGENTS.md 被覆盖），导致新增测试失败；执行 `tsc` 重编译后全部通过。
- **适用范围**：通用（sovei-core 开发）。
- **建议目标**：candidate（rule 类）：修改引擎源码后，验证前必须先 `tsc` 重编译 dist，否则测试不反映最新源码。
- **状态**：candidate（不直接晋级 stable）。

### O2：清理/删除产物时需跑完整测试套件，而非部分（candidate 晋级提案）
- **来源 Feature**：011-agents-single-source（暴露 007 回归）
- **证据**：007 删除 `harness/templates/sovei/` 模板时，仅验证 `workflow.test.mjs`（3 测试），遗漏了 `project.test.mjs` 中引用模板文件的测试，导致 007 引入回归（1 个失败）。本 Feature 跑完整套件才发现并修复。
- **适用范围**：通用。
- **建议目标**：candidate（rule 类）：删除文件/改动共享资源后，验证应运行**完整测试套件**（`node --test test/*.test.mjs`），而非仅相关子集。
- **状态**：candidate（不直接晋级 stable）。

### O3：跨引用删除需同步清理引用（仅项目适用）
- **来源 Feature**：011-agents-single-source
- **证据**：删除模板文件后，`project.test.mjs:75` 的测试仍引用这些文件。删除资源需同步删除/更新所有引用点（测试、文档、代码）。
- **适用范围**：项目专用（sovei-core 维护）。
- **建议目标**：记录为维护规则。
- **状态**：仅项目适用。

## 未决/拒绝模式
- 无。

## 结论
本 Feature 沉淀 3 条观察：重编译 dist 后再测试、清理时跑完整套件、跨引用删除需同步。均标注 candidate/仅项目适用，需后续 Feature 证据后经人工审查方可晋级 stable。
