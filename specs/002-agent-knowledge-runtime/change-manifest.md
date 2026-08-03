# 变更清单

## TASK-001：红线候选落盘与导入闭环
- 状态：已完成
- 文件：src/cli/commands/project.ts、src/cli/commands/governance.ts
- 行为：onboard 时写入 redlines-seed.json；import 支持 seed 对象和 raw 数组。

## TASK-002：知识快照与版本判定
- 状态：已完成
- 文件：src/context/snapshot.ts、src/knowledge/store.ts、test/context.test.mjs
- 行为：KnowledgeSnapshot 记录完整生成链版本；isStale 比较内容哈希；KnowledgeStore 跳过 .snapshot.json。

## TASK-003：上下文包构建器与 CLI
- 状态：已完成
- 文件：src/context/builder.ts、src/cli/commands/context.ts、src/cli/index.ts、src/index.ts、test/context.test.mjs
- 行为：buildContextPack 分离 required/suggested；CLI context build/status 可用。

## TASK-004：Adapter 能力画像与 CLI
- 状态：已完成
- 文件：src/adapters/registry.ts、src/cli/commands/agent.ts、src/cli/index.ts、src/index.ts、test/agent.test.mjs
- 行为：Codex、Claude Code、CodeBuddy、Trae 各有独立能力画像；CLI agent list/show 可用。

## TASK-005：Provider 契约与版本发布
- 状态：已完成
- 文件：src/providers/contracts.ts、package.json、README.md
- 行为：EmbeddingProvider/LLMProvider 纯接口定义；版本升至 2.1.0-dev.2；无 Provider 时核心完整运行。
- 验证：check 通过；完整 test 40/40 通过。
