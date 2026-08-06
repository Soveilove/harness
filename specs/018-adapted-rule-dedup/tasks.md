# 任务清单

> 由 Sovei 阶段生成：tasks
> Feature: 018-adapted-rule-dedup

## 任务列表

- [ ] TASK-001: `scanProjectRuleCandidates` 生成候选后按 id 去重
  - 文件范围：`src/config/project-rule-scanner.ts`（`scanProjectRuleCandidates`）
  - 做什么：在组装所有候选、排序返回前，按 `id` 去重，保留首次出现。使「同一章节重复语句」只产生一条候选规则。
  - 验收：同章节两行相同语句 → 该 id 只出现一次；不同 id 的合法规则不受影响。
  - 状态：已完成 ✅

- [ ] TASK-002: 增强 `repository.load()` 重复 id 报错信息
  - 文件范围：`src/rules/repository.ts`（`load()`）
  - 做什么：当重复 id 的 `previous === source` 时，报错明确指出「同一文件内存在重复规则 id」，并附规则 title；跨文件冲突时保留「文件 A 与 文件 B」提示。
  - 验收：同文件重复 → 报错含「同一文件内」与规则 title；跨文件重复 → 报错保留两个文件路径。
  - 状态：已完成 ✅

- [ ] TASK-003: 补充去重回归测试
  - 文件范围：`test/rules.test.mjs`
  - 做什么：新增用例，构造含「同一章节两行相同语句」的 markdown fixture，断言 `scanProjectRuleCandidates` 输出该 id 唯一；补充同文件重复 id 的报错断言。
  - 验收：新用例通过；现有全部测试通过（`pnpm test`）。
  - 状态：已完成 ✅

## 备注
- 三任务均不新增/删除/改名 CLI 命令，符合 `CLI_CONTRACT_STABILITY`。
- 发布前 smoke：在 `xmiles/ad-materials-frontend` 复跑 adapt 确认无重复 id 报错（验收 AC4）。
