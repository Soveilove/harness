# 任务清单

- [x] TASK-001: 红线候选落盘与导入闭环
  - 依赖：无
  - 文件：src/config/scanner.ts、src/cli/commands/project.ts、src/cli/commands/governance.ts、src/change-control/repository.ts、test/project.test.mjs
  - 验收：AC-1、AC-2
  - 验证：fixture 测试 + 完整回归

- [x] TASK-002: 知识快照与版本判定
  - 依赖：无
  - 文件：src/context/snapshot.ts、test/context.test.mjs
  - 验收：AC-5
  - 验证：fixture 测试

- [x] TASK-003: 上下文包构建器与 CLI
  - 依赖：TASK-002
  - 文件：src/context/builder.ts、src/cli/commands/context.ts、src/cli/index.ts、src/index.ts、test/context.test.mjs
  - 验收：AC-3、AC-4
  - 验证：fixture 测试 + 完整回归

- [x] TASK-004: Adapter 能力画像与 CLI
  - 依赖：无
  - 文件：src/adapters/registry.ts、src/cli/commands/agent.ts、src/cli/index.ts、src/index.ts、test/agent.test.mjs
  - 验收：AC-6
  - 验证：fixture 测试

- [x] TASK-005: Provider 契约与版本发布
  - 依赖：TASK-001、TASK-002、TASK-003、TASK-004
  - 文件：src/providers/contracts.ts、src/providers/container.ts、src/providers/tokens.ts、src/index.ts、package.json、README.md、test/context.test.mjs
  - 验收：AC-7、AC-8
  - 验证：check + build + 完整 test

## 延期项

向量数据库选型、云 LLM SDK、自动 IDE 安装、npm publish、commit、push。
