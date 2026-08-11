# Reconciliation: 018-adapted-rule-dedup 修复文档适配器生成重复规则 id 的 bug

## Need Translation

**PM 原话**："运行 sovei 时报错 `Duplicate project rule id ADAPTED_doc_6607F3997D in harness/project/rules/adapted.rules.json and harness/project/rules/adapted.rules.json`"；"是我在尝试 node14 是否正常时发现的"；"走完流程重新发布一下"。

**技术理解**：
- 目标：修复 `sovei` CLI 的 `adapted.rules.json` 适配器（`scanProjectRuleCandidates`），使其不会因「同一文档章节内出现重复语句」而生成重复 id 的规则，从而避免 `repository.load()` 抛 `Duplicate project rule id` 错误。
- 范围：**仅源码修复 + 单测 + 发布补丁**。不改动任何已发布 CLI 命令契约（符合 `CLI_CONTRACT_STABILITY`），不修改 `adapted.rules.json` 已有规则语义。
- 产品形态：版本 2.5.5 → 2.5.6（`RELEASE_VERSION_POLICY`：bug 修复走 patch）。

## Current State

**代码为什么是现在这样**：
- `adaptation.ts` 的 `scanProjectRuleCandidates()` 对每个源文档按 markdown 章节切片（`extractStatementsBySection`），再对章节内每行规范语句生成候选规则。
- `idFor(kind, source, text)` 用 `sha1(kind\0source\0text)` 前 10 位做 hash，其中 `text = 章节::语句`。**当同一章节内出现两行完全相同的语句时**，hash 输入完全相同 → id 相同 → 生成两条内容也完全相同的规则。
- `repository.ts` 的 `load()` 遍历 `rules/*.rules.json`，用 `Map<id, source>` 登记，遇重复 id 即抛 `Duplicate project rule id ... in ${previous} and ${source}`。因重复发生在同一文件内，`previous` 与 `source` 打印出相同路径，造成误导性报错。
- 红线约束：`CLI_CONTRACT_STABILITY`（不破坏已发布命令契约）、`RELEASE_VERSION_POLICY`（bug 修复默认 patch）。本次不新增/删除/改名命令，符合契约稳定。

**跨 Feature 决策**：无直接相关历史决策。本改动是 `adapted.rules.json` 适配器的独立 bug 修复，不影响其他 Feature 的事件、红线或知识结构。

## Solutions

### Solution A: `scanProjectRuleCandidates` 返回前按 id 去重（推荐）
- 在组装所有候选后、返回前，按 `id` 去重（保留首个出现），从源头杜绝重复 id 写入 `adapted.rules.json`。
- 同时增强 `repository.ts` 报错，区分「同一文件内重复」与「跨文件冲突」，补充规则 title 便于定位。
- cost: 低。`adaptation.ts` 增约 5 行、`repository.ts` 增约 4 行，单测增 1 个用例。无行为契约变化。

### Solution B: 仅修 `repository.load()` 容忍同文件重复
- 让 `load()` 对同文件内重复 id 静默去重或跳过。
- cost: 低，但**掩盖上游 bug**。规则 id 唯一性是基本约束，放宽后会造成语义冗余（同一语句被重复提取）与歧义，长期维护成本高。不推荐。

### Solution C: 仅给重复语句加唯一后缀
- 修改 `idFor`，对重复语句追加递增后缀保证 id 唯一。
- cost: 低，但会生成**两条内容相同**的规则（同一章节同一语句被重复提取），只是 id 不同。语义冗余，仍需人工清理，且增加测试复杂。不推荐。

## Questions

### [product] Q1: 本次是否需要对外发布补丁？
- recommendation: 是。用户明确要求「走完流程重新发布」，且 bug 会影响任何含重复语句的 `docs/` 项目，属应修复并发布的问题。
- options: [发布 2.5.6（推荐）] [仅提交源码不发布]

### [tech] Q2: 发布前是否在 `ad-materials-frontend` 复跑 smoke 验证？
- recommendation: 是。该 bug 正是在该项目复跑时暴露的，端到端复跑最有说服力。
- options: [复跑验证后发布（推荐）] [仅跑单测后发布]

## Sign-off
- [ ] product: by: ____ date: ____ ref: ____
- [ ] tech: by: ____ date: ____ ref: ____
