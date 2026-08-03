# 变更清单

## TASK-003：中文化运行时审核产物

- 状态：已完成
- 文件：`workflow-engine.ts`、`artifacts/repository.ts`、`stages/index.ts`、`wayfinder/repository.ts`、`config/scanner.ts` 与对应测试。
- 行为：新 Feature 模板、阶段契约、权威规则、Wayfinder Markdown、代码地图和架构知识默认使用简体中文；文件名、阶段 ID、事件和 schema 保持不变。
- 技术措施：模板占位检测改用内部标记，使中文模板仍无法被误完成。
- 验证：构建通过；workflow、Wayfinder、scanner 聚焦测试 11/11 通过。

## 待完成

无。

## TASK-004：中文化 CLI 引导

- 状态：已完成
- 文件：`cli/index.ts`、`cli/commands/workflow.ts`、`cli/commands/project.ts`、`test/project.test.mjs`。
- 行为：工作流状态、阶段准备/完成、下一步命令、项目初始化和初始化扫描引导默认使用简体中文；`sovei workflow <stage> <feature>` 等命令保持不变。
- grill 可见性：准备 `grill` 时明确说明 CLI 已触发该阶段，但决策提问与 `decision-log.md` 填写由 AI/IDE 按提示契约完成，然后才运行 `--complete`。
- 验证：构建通过；项目 CLI 聚焦测试 5/5 通过，包含中文工作流输出和原命令可执行断言。

## TASK-005：中文化静态模板并完成全量验证

- 状态：已完成
- 文件：`harness/templates/sovei/*.md`、`test/project.test.mjs`、`test/change-control.test.mjs`。
- 行为：13 个静态 Markdown 模板均使用简体中文审核标题和字段；必要的状态值、revision、Feature、命令和 schema 标识保持兼容。
- 验证：静态模板一致性测试通过；`pnpm --dir packages/sovei-core run check` 通过；`pnpm --dir packages/sovei-core test` 通过（34/34）。
- 限制：隔离真实 CLI 的临时目录命令被运行环境清理策略拦截且未执行。运行时产物使用 WorkflowEngine 单测验证，CLI 子进程验证其中文入口与原命令兼容。
