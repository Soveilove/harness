# 变更清单

> 由 Sovei 阶段生成：implement
> Feature: 018-adapted-rule-dedup

## 任务完成情况

| 任务 | 状态 |
|------|------|
| TASK-001: `scanProjectRuleCandidates` 按 id 去重 | ✅ 已完成 |
| TASK-002: 增强 `repository.load()` 重复 id 报错 | ✅ 已完成 |
| TASK-003: 补充去重回归测试 | ✅ 已完成 |

## 实际变更文件

### `packages/sovei-core/src/config/project-rule-scanner.ts`（TASK-001）
- `scanProjectRuleCandidates()` 返回前，对候选按 `id` 去重（保留首个出现）。
- 效果：同一文档章节内重复出现的相同语句不再生成重复 id 的规则。

### `packages/sovei-core/src/rules/repository.ts`（TASK-002）
- `load()` 遇重复 id 时：若 `previous === source`（同一文件内），报错「同一文件内存在重复规则 id <id>（title: <title>）」；否则保留「文件 A 与 文件 B」跨文件提示。

### `packages/sovei-core/test/rules.test.mjs`（TASK-003）
- 新增测试「adapted candidates deduplicate repeated statements within the same section」：同章节两行相同语句只生成一条候选。
- 新增测试「project rules fail closed with a diagnostic message for duplicates within the same file」：同文件重复 id 报错含「同一文件内」与 title。

## 行为 / 契约变化
- 无 CLI 命令契约变化（符合 `CLI_CONTRACT_STABILITY`）。
- `adapted.rules.json` schemaVersion 保持 1。
- id 唯一性约束不放松（fail-closed 保持）。

## 测试结果
- `pnpm run build`：通过（tsc + build-release）。
- `node --test test/*.test.mjs`：**109 通过，0 失败**。
- 新增 2 个用例均通过。

## 剩余工作
- 发布前 smoke：在 `xmiles/ad-materials-frontend` 复跑 adapt 确认无重复 id 报错（验收 AC4）。
- 版本递增 patch（2.5.5 → 2.5.6）并发布全局包。
