# 功能规格

> 由 Sovei 阶段生成：spec
> Feature: 018-adapted-rule-dedup

## 需求翻译

**做什么**：修复 Sovei CLI 的 `adapted.rules.json` 适配器，使其不会因同一文档章节内出现重复语句而生成重复 id 的规则，消除 `Duplicate project rule id` 报错；并让重复 id 报错信息更具可诊断性。

**不做什么**：
- 不改变任何已发布的 CLI 命令契约。
- 不修改 `adapted.rules.json` 已有规则的语义内容。
- 不做发布产物 / Node 版本兼容改造（与 017-node14-compat 无关）。

## 验收标准

### AC1 — 文档适配器不再生成重复 id
- 当一份源文档（`docs/`、`AGENTS.md` 等）的**同一章节**内出现两行完全相同的规范语句时，`scanProjectRuleCandidates` 返回的候选规则中该语句对应的 id **只出现一次**。
- 现有合法规则（不同 id）不受影响。

### AC2 — 重复 id 报错信息可诊断
- 若同一 `*.rules.json` 文件内存在重复 id，`repository.load()` 抛出的错误应明确指出是「同一文件内重复规则 id」，而非打印两个相同路径。
- 若跨文件冲突，仍保留原来的「文件 A 与文件 B」提示。

### AC3 — 单元测试覆盖
- 新增测试：含「同一章节两行相同语句」的 markdown fixture，断言 `scanProjectRuleCandidates` 输出该 id 唯一。
- 全部现有测试通过（`pnpm test`）。

### AC4 — 端到端验证
- 在 `xmiles/ad-materials-frontend` 复跑 adapt 后，不再产生 `Duplicate project rule id` 错误。

## 边界与排除项
- 不处理 `*.rules.json` 中已存在、由历史版本写入的重复 id 的自动迁移（一次性人工清理即可，如本次已手动去重）。
- 不改变规则的 `lifecycle` / `enforcement` 语义。

## Sign-off
- [ ] product: by: ____ date: ____ ref: ____
- [ ] tech: by: ____ date: ____ ref: ____
