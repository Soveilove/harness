# 开发任务

- [x] TASK-001: 定义 Skill manifest、binding、request、result 和 execution report 类型。
- [x] TASK-002: 增加 `harness/skills/skill-map.yaml` 与 `skill-lock.yaml` Schema。
- [x] TASK-003: 实现 Skill lock 校验：来源、版本、commit、checksum、许可证。
- [x] TASK-004: 实现 resolver 和 adapter registry，默认策略为 native。
- [x] TASK-005: 让 CLI 具备接入 skills 的能力（全局 + 局部），并接入项目初始化流程。
- [x] TASK-006: 将已接入 skills 渲染进各开发 Agent 上下文文件（AGENTS.md/CLAUDE.md/.cursorrules）。
- [ ] TASK-007: 实现 `grill-me` / `grilling` 的候选适配器。
- [ ] TASK-008: 实现 `domain-modeling` / `to-spec` 的候选适配器。
- [ ] TASK-009: 为外部 Skill 增加只读 Context Pack 和写入边界。
- [ ] TASK-010: 增加超时、非法输出、未锁定版本和 checksum 不匹配的回退测试。
- [ ] TASK-011: 增加阶段完成事件不可由外部 Skill 直接产生的测试。
- [ ] TASK-012: 用现有 Feature 完成 native/adapter 回放，并记录差异。
- [ ] TASK-013: 回放通过后，再决定是否将单个 Skill 从 candidate 改为 enabled。
