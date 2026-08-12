# Change Manifest — 029-feature-summary

> Feature：`sovei feature summary <id>`（P1-2）
> 阶段：implement（变更清单）

## 目标
新增 `sovei feature summary <id> [--json]` 命令，从 Feature 事件流 + 各阶段产物生成聚合人可读视图（summary.md），按需求→决策→变更→验证→经验→结论组织。

## 变更清单

| Task | 文件 | 变更 |
|---|---|---|
| TASK-001 | `packages/sovei-core/src/cli/commands/feature.ts` | 新增 `summaryFeature()` 核心函数（读 workflow-state.yaml + workflow-events.jsonl + 各阶段产物，`_archive/` 回退，组装 SummaryData，渲染 markdown/JSON）、`feature summary` 子命令注册、`PERSISTENT_FILES` 白名单加入 `summary.md` |
| TASK-002 | `packages/sovei-core/test/feature-summary.test.mjs` | 新增 6 个测试：completed 六章节 / 归档回退 / in_progress 快照 / --json / 不存在报错 / StorageBackend 写入 |

## 未改动
- `src/cli/index.ts`：feature 命令已在 index.ts 注册，仅扩展子命令，无需改。
- 无新增依赖（零运行时依赖约束保持）。
- archive 行为不变，仅 `summary.md` 加入持久白名单（不被折叠）。

## 实现要点（对齐 plan）
- `readArtifact()` 顶层优先、`_archive/` 回退（D5）。
- 状态容忍：in_progress / 产物缺失降级显示（D2）。
- `--json` 打印到 stdout，不写文件；默认写 `summary.md`（D3）。
- 写入经 `StorageBackend.write`（红线 STORAGE_WRITE_DISCIPLINE）。

## 测试
- 新增 feature-summary.test.mjs 6 用例通过。
- 全量 192/192 通过（186 原有 + 6 新增，零回归）。
