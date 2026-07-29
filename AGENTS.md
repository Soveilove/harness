# Sovei Engine Repository Guidance

- Sovei 2.0 是一个 TypeScript 工作流引擎，位于 `packages/sovei-core/`。
- 使用 `pnpm --dir packages/sovei-core run build` 构建，`pnpm --dir packages/sovei-core run check` 类型检查。
- CLI 入口：`node packages/sovei-core/dist/cli/index.js`。
- 工作流每次调用只执行一个阶段；12 个阶段：load → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync。
- 知识管理使用类型化 JSON，存储在 `harness/project/knowledge/`；单次观察只能进入 candidate，不得直接晋级 stable。
- 壳料分离：`harness/project/` 是料（换项目清空），`packages/sovei-core/` 是壳（换项目保留）。
- 状态机是纯函数 reducer + 事件溯源；所有状态变更通过 EventStore 追加，通过 replay 派生。
- 使用 `reopen` 返工已完成阶段，它会失效目标及其后继并增加 revision。
- Stage 使用 `defineStage()` 定义，有 preExecute/execute/postExecute/cleanup 生命周期 hooks。
- DI 容器在 `providers/container.ts`，通过 `TOKENS` 注入。
- `harness/project/project.config.json` 是项目声明，换项目时第一个修改。

## 构建和验证

```bash
pnpm --dir packages/sovei-core install
pnpm --dir packages/sovei-core run build
pnpm --dir packages/sovei-core run check
```
