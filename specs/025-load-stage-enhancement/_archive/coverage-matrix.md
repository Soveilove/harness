# Coverage Matrix：025-load-stage-enhancement

| 代码表面 | 变更意图 | 验证方式 | 状态 |
|---|---|---|---|
| `stages/index.ts:loadStage` | 增加 producesArtifacts + postExecute + prompt 探索方法论 | 单元测试 + 集成测试 | planned |
| `stages/index.ts:grillStage` | requiredArtifacts 增加 load-summary.md | 单元测试 | planned |
| `knowledge/store.ts:TASK_TYPE_MAP` | general 增加 code-map 和 rule | 单元测试 | planned |
| `test/load-stage-enhancement.test.mjs` | 新增测试文件 | 测试运行 | planned |
