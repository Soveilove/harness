# 影响范围：Agent Knowledge Runtime

## 调用链

### 红线候选闭环

1. project onboard -> ProjectScanner.scan() -> RedlineScanner.scan() 返回 CandidateRedline[]
2. 当前代码在 CLI 展示候选，但不落盘；需新增写入 redlines-seed.json
3. governance redline import -> ChangeControlRepository 已有 addRedline() 事件溯源；需扩展支持 seed 数组

### 知识快照与版本

1. KnowledgeStore.load() 从 knowledge/*.json 读取 typed JSON
2. 需新增 KnowledgeSnapshot 类型，记录 schemaVersion、indexVersion、sourceHash、scannerVersion 等
3. context status 读取快照并与当前知识内容哈希比较，判定 stale

### 上下文包

1. KnowledgeStore.loadByTaskType() 目前只记录文件名列表
2. knowledge/selectors.ts 有 searchEntries() 和 selectByFilePath()
3. 需新增 ContextBuilder：组装 required 和 suggested
4. CLI context build/status 作为新入口

### Adapter 能力画像

1. adapters/registry.ts 目前只有 invocationFormat 和 reopenFormat
2. 需扩展 IDEAdapter 接口，增加 capabilities 声明
3. 注册 Codex、Claude Code、CodeBuddy、Trae 四个内置画像
4. CLI agent list/show 作为新入口

### Provider 契约

1. 新增 EmbeddingProvider 和 LLMProvider 接口，纯类型定义
2. DI 容器可选注入；无 Provider 时核心功能不受影响

## 涉及文件

新增：src/context/builder.ts、src/context/snapshot.ts、src/providers/contracts.ts、src/cli/commands/context.ts、src/cli/commands/agent.ts、test/context.test.mjs、test/agent.test.mjs

修改：src/config/scanner.ts、src/cli/commands/project.ts、src/cli/commands/governance.ts、src/change-control/repository.ts、src/adapters/registry.ts、src/cli/index.ts、src/index.ts、package.json、README.md

## 兼容路径

现有 redlines.json 和事件溯源不变；seed 只是候选来源。KnowledgeStore schema 不改字段。无外部模型时确定性功能完整。

## 架构压力

scanner.ts 只增加一行 seed 写入调用。adapters/registry.ts 扩展接口但保持薄层。无第二个压力维度，不触发重构要求。

## 验证面

红线候选落盘与重复扫描幂等性 fixture；import seed 后红线激活与事件溯源断言；context build 在无 Provider 时生成 required/suggested；context status stale 判定；四 adapter 能力画像差异断言；完整回归测试。
