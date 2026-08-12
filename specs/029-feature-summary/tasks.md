# Tasks: 029-feature-summary

- [ ] TASK-001: 在 `src/cli/commands/feature.ts` 实现 `feature summary <id> [--json]` — 新增 `summaryFeature()` 核心函数（读 workflow-state.yaml + workflow-events.jsonl + 各阶段产物，`_archive/` 回退，组装 SummaryData，渲染 markdown 或 JSON），新增 `feature summary` 子命令注册，`PERSISTENT_FILES` 白名单加入 `summary.md`
- [ ] TASK-002: 新增 `test/feature-summary.test.mjs` — 覆盖：completed Feature 生成 summary.md 六章节、归档后 `_archive/` 回退、in_progress 进度快照、`--json` 输出合法字段、Feature 不存在报错、写入走 StorageBackend
