# Feature 015 — Spec

## 目标

让 `workflow.version` 从"写后即忘"变为有实际语义的字段：添加 mismatch warning、补充版本语义文档、明确 bump 规范。

## 需求

### R1: Version mismatch warning

`loadConfig` 在 `project.config.json` 的 `workflow.version` 与 `DEFAULT_WORKFLOW.version` 不一致时，输出 warning 到 stderr（不 throw、不阻断启动）。

Warning 格式：
```
⚠️  workflow.version mismatch: project declares "2.0.0", engine expects "2.0.0"
   If this is intentional, update harness/project/project.config.json to match.
   If unsure, run: sovei project init --force
```

### R2: 版本语义文档

在 `WorkflowDefinition` 接口和 `DEFAULT_WORKFLOW` 常量处补充 JSDoc 注释，明确：
- version 追踪 `WorkflowDefinition` 结构性变更（stageOrder / stages / maxStagesPerInvocation / allowChaining）
- version 不追踪：确认门逻辑、Skills 子系统、CLI 命令、prompt 内容
- bump 规范：minor = 新增/删除 stage 或修改 stageOrder；patch = 修改 stage 配置（requiredArtifacts / producesArtifacts）；major = 破坏性重构

### R3: project.config.json 保持 2.0.0

不 bump version。当前 `DEFAULT_WORKFLOW` 的结构与 2.0.0 一致（12 阶段未变、stageOrder 未变），2.3.2 对 spec 阶段产物契约的修改是 bugfix（补齐遗漏的依赖），不算破坏性变更。

## 非目标

- 不实现 migration 机制（workflow.version 不持久化到 Feature 事件中，不需要迁移）
- 不修改 `WorkflowDefinition` 接口结构
- 不修改 CLI 命令
- 不修改 schemaVersion

## 影响范围

| 文件 | 变更类型 |
|---|---|
| `packages/sovei-core/src/config/loader.ts` | 添加 version mismatch warning |
| `packages/sovei-core/src/engine/types.ts` | 补充 WorkflowDefinition.version JSDoc |
| `packages/sovei-core/src/engine/workflow-engine.ts` | 补充 DEFAULT_WORKFLOW JSDoc |
