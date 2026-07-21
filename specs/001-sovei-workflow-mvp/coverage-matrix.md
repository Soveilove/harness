# Coverage Matrix

| ID | 需求/边界 | 状态 | 证据 |
|---|---|---|---|
| FR-001 | Phase 1 五阶段 Skill | verified | `.agents/skills/sovei-workflow/SKILL.md`、Skill Creator 校验 |
| FR-002 | 机器可读状态机 | verified | `harness/workflows/sovei/workflow.yaml`、实际 Feature 校验 |
| FR-003 | Artifact 模板 | verified | `harness/templates/sovei/` |
| FR-004 | 确定性校验器 | verified | `scripts/test_validate_workflow.py` 六类回放 |
| FR-005 | Codex 显式调用 | verified | `agents/openai.yaml` 的 `allow_implicit_invocation: false` |
| FR-006 | Claude 薄适配 | verified | `harness/ide-adapters/claude/commands/sovei/` |
| FR-007 | 同步保护与分发 | verified | PowerShell 缺失目标 Diff 显示精确命名空间；无 ABC Pull |
| FR-008 | 按场景选择命令的唯一使用指引 | verified | `harness/workflows/sovei/USAGE.md`、workflow/registry 引用、缺失指引负向测试 |
| EX-001 | 不实现 Phase 2 | verified | registry 只声明五个 active stages |
| EX-002 | 不接入 vendor 自动更新 | verified | 无 vendor/ 和自动下载逻辑 |
| EX-003 | 不修改 ABC 业务代码 | verified | 只运行中央 Status/Diff |
