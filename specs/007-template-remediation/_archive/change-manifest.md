# 变更清单

> 由 Sovei 阶段生成：implement
> Feature：007-template-remediation

## TASK-001：删除 14 个死模板文件

**文件**：`harness/templates/sovei/*.md`、`*.yaml`（14 个）

**行为变更**：
- 删除 `harness/templates/sovei/` 下 13 个 `*-template.md` 和 1 个 `workflow-state-template.yaml`，均无任何代码引用。
- 保留 `harness/templates/.gitkeep` 与目录结构（`project init` 依赖）。

**测试/验证**：`git status` 确认删除已暂存，`.gitkeep` 保留。

## TASK-002：更新 `harness/index.md` 目录说明

**文件**：`harness/index.md`

**行为变更**：
- 第 30 行 `templates/` 目录说明由"壳（文档模板）"改为"壳（占位目录；产物模板由引擎内嵌生成，不在此存放）"，消除文档与实现的脱节。

**测试/验证**：读取 index.md 确认更新内容。

**剩余工作**：全部任务完成。
