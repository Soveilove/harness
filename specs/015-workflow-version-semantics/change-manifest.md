# Feature 015 — Change Manifest

## 变更文件

| Task | 文件 | 变更类型 | 说明 |
|---|---|---|---|
| TASK-001 | `packages/sovei-core/src/engine/types.ts` | 修改 | 补充 WorkflowDefinition 接口 JSDoc，说明 version 追踪范围和 bump 规范 |
| TASK-002 | `packages/sovei-core/src/engine/workflow-engine.ts` | 修改 | 更新 DEFAULT_WORKFLOW 注释，说明 version 语义和历史 |
| TASK-003 | `packages/sovei-core/src/config/loader.ts` | 修改 | 添加 version mismatch warning（console.warn 到 stderr） |
| TASK-004 | `packages/sovei-core/test/project.test.mjs` | 修改 | 添加 2 个测试：mismatch 触发 warning、match 不触发 |
| — | `harness/project/rules/project.rules.json` | 修改 | 修复 schema 不匹配（lifecycle/verification/provenance 字段值） |

## 未变更

| 文件 | 原因 |
|---|---|
| `harness/project/project.config.json` | workflow.version 保持 2.0.0，与 DEFAULT_WORKFLOW 一致 |
| `AGENTS.md` | 无需变更（上一轮已同步） |

## 测试结果

- 全量 91 个测试，90 通过，1 个预存失败（release bundle 未构建，与本次变更无关）
- 新增 2 个测试均通过
