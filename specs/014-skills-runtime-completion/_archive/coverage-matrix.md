# 覆盖矩阵

> 由 Sovei 阶段生成：scope
> Feature：014-skills-runtime-completion

## 验收项覆盖

| # | 验收标准 | 状态 | 证据 |
|---|---|---|---|
| 1 | grill 阶段 prompt 包含 grill-with-docs body | planned | MarkdownSkillAdapter 读取 SKILL.md，注入到 prepareStage 返回的 prompt |
| 2 | CLI 显示 skill 来源 | planned | workflow.ts 输出 skillExecutionReport |
| 3 | 外部 skill 失败回退 native | planned | prepareStage try-catch，失败时 mode=fallback |
| 4 | skills install --git | planned | SkillInstaller.gitInstall() |
| 5 | skills install --path | planned | SkillInstaller.pathInstall() |
| 6 | skills upgrade | planned | SkillUpgrader.upgrade() |
| 7 | skills diff | planned | SkillUpgrader.diff() |
| 8 | skill-map + skill-lock 完整 | planned | 7 个 binding + 7 个 lock entry |
| 9 | pnpm run check 通过 | planned | tsc --noEmit |
| 10 | grill + spec 适配器契约测试 | planned | test/skill-adapter.test.mjs + test/skill-runtime.test.mjs |
| 11 | 历史 Feature 回放 | planned | 使用 specs/011 做一次 native vs adapter 对比 |
| 12 | 外部 skill 只读 | planned | adapter 只读取 SKILL.md，不写入项目事实源 |
| 13 | 阶段完成事件仍由 WorkflowEngine 产生 | planned | prompt 注入不改变 completeStage 逻辑 |
| 14 | 无外部 skill 时正常执行 | planned | SkillResolver.resolve 返回 null 时走原生路径 |
