# 任务清单

- [x] TASK-003: 中文化运行时审核产物
  - 文件：`workflow-engine.ts`、`stages/index.ts`、`wayfinder/repository.ts`、`config/scanner.ts`。
  - 验收：新生成模板、阶段契约、Wayfinder 和扫描知识使用简体中文，机器标识不变。
  - 验证：构建及运行时产物测试。

- [x] TASK-004: 中文化工作流与项目 CLI 引导
  - 依赖：TASK-003。
  - 文件：`cli/index.ts`、`cli/commands/workflow.ts`、`cli/commands/project.ts`。
  - 验收：状态、下一步、初始化和扫描说明使用简体中文，命令不变。
  - 验证：CLI 子进程测试和现有回归测试。

- [x] TASK-005: 中文化静态模板并完成全量验证
  - 依赖：TASK-003、TASK-004。
  - 文件：`harness/templates/sovei/*.md`、相关测试、Feature 证据产物。
  - 验收：静态与运行时模板语言一致，无旧英文占位骨架；Monorepo 扫描能力不回归。
  - 验证：build、check、完整 test、真实 prepare 检查。
