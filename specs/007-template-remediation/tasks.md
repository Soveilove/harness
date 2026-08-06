# 任务清单

> 由 Sovei 阶段生成：tasks
> Feature：007-template-remediation

- [ ] TASK-001: 删除 `harness/templates/sovei/` 下 14 个死模板文件
- [ ] TASK-002: 更新 `harness/index.md` 的 `templates/` 目录说明

---

## TASK-001：删除 14 个死模板文件

- **依赖**：无
- **文件范围**：`harness/templates/sovei/*.md`、`*.yaml`（14 个）
- **操作**：删除 change-manifest/convergence-report/coverage-matrix/decision-log/evidence/learning-report/plan/scope/spec/sync-report/tasks/wayfinder/workflow-history 的 template.md，及 workflow-state-template.yaml。
- **保留**：`harness/templates/.gitkeep`、`harness/templates/` 目录。
- **验收标准**：`git ls-files harness/templates/` 仅剩 `.gitkeep`。
- **验证方式**：`git status` 确认删除生效，`.gitkeep` 保留。

## TASK-002：更新 `harness/index.md` 目录说明

- **依赖**：无
- **文件范围**：`harness/index.md`
- **操作**：将第 30 行 `└── templates/  # 壳（文档模板）` 更新为说明产物模板由引擎内嵌生成、此目录仅作占位。
- **验收标准**：文档不再声称 `templates/` 下提供模板文件。
- **验证方式**：读取 index.md 确认更新内容。
