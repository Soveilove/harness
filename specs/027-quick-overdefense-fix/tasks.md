# Tasks: P2-7-quick-overdefense-fix

- [ ] TASK-001: 重构 run.ts needsEscalation 逻辑 — 移除 `status === 'expanded'` 阻塞条件，`declaredPaths.length !== 1` 改为 `=== 0`，添加冷启动引导和 expanded 上下文警告
- [ ] TASK-002: 更新测试用例 — 验证 expanded 不再 escalated，冷启动引导正确输出