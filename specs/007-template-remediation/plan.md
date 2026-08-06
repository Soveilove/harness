# 实施计划

> 由 Sovei 阶段生成：plan
> Feature：007-template-remediation

## 模块边界

修改面封闭在 2 类操作：
1. 删除 14 个 git 追踪的模板文件（13 md + 1 yaml）。
2. 更新 `harness/index.md` 1 处目录说明。

不涉及：引擎源码、阶段定义、release 构建、测试。

## 数据流

- 模板文件：`harness/templates/sovei/` → 删除。引擎 prepare 改用内嵌 `getArtifactTemplate`（无需改动）。
- 文档：`harness/index.md` 目录树中的 `templates/` 行 → 更新说明。

## 实施步骤

### TASK-001：删除 14 个死模板文件
- **操作**：用 `git rm` 或 `delete_file` 删除 `harness/templates/sovei/` 下 14 个文件（13 md + 1 yaml）。
- **保留**：`harness/templates/.gitkeep`（目录占位）。
- **验收**：`git ls-files harness/templates/` 仅剩 `.gitkeep`。

### TASK-002：更新 `harness/index.md` 目录说明
- **操作**：将第 30 行 `└── templates/  # 壳（文档模板）` 更新为反映"产物模板由引擎内嵌生成，此目录仅占位"。
- **验收**：文档不再声称 templates/ 下提供模板文件。

## 验证方式
1. **git 状态**：确认删除已暂存/生效，`.gitkeep` 保留。
2. **运行时**：`sovei workflow prepare <feature> spec`（用 tsx 跑源码）确认仍内嵌生成模板。
3. **文档**：检查 index.md 更新后内容。
