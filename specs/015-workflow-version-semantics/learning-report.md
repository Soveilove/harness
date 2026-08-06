# Feature 015 — Learning Report

## 学到了什么

### 1. workflow.version vs schemaVersion vs npm package version

三个版本号追踪完全不同的东西：
- **workflow.version** (`WorkflowDefinition.version`): 追踪工作流**结构**变更（stages / stageOrder / maxStagesPerInvocation / allowChaining）。不持久化到 Feature 事件中。
- **schemaVersion** (`z.literal(1)`): 追踪**持久化数据结构**版本。变更需要迁移路径。存在于 wayfinder/rules/change-control/business-map 等 7 处。
- **npm package version** (`package.json` version): 追踪 **CLI 工具**发布版本。当前 2.5.3。

### 2. 2.3.2 的 spec 产物修复不是 version bump

2.3.2 给 spec 阶段补了 `wayfinder.md` 依赖和 `reconciliation.md` 产物。这修改了 `DEFAULT_WORKFLOW.stages.spec`，但：
- 这是修 bug（拓扑断链），不是加新功能
- 旧 Feature 的 event replay 不受影响（state-machine reducer 不检查 requiredArtifacts）
- 所以不需要 bump version

### 3. project.rules.json schema 漂移

`project.rules.json` 中的 `RELEASE_VERSION_POLICY` 规则是手工写的，使用了旧 schema 的枚举值（`"stable"` / `"check"` / `"manual"`）。当 `rules/schemas.ts` 更新枚举后，rules 文件没有同步迁移。这暴露了一个问题：**schema 变更时没有自动迁移存量数据**（红线 PERSISTED_SCHEMA_COMPAT 的实际违反）。

### 4. 确认门始终在 verify 后触发

即使是 S1 风险（最低），verify 阶段完成后仍然需要 product + tech 双签。spec 门禁才是 S2/S3 才触发。
