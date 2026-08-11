# Feature 015 — Plan

## 实现步骤

1. **types.ts**: 补充 `WorkflowDefinition.version` 字段 JSDoc — 说明追踪范围和 bump 规范
2. **workflow-engine.ts**: 更新 `DEFAULT_WORKFLOW` 注释 — 从 "Sovei 2.0" 改为说明 version 语义
3. **loader.ts**: 在 `loadConfig` return 前添加 version mismatch 检测 — 对比 `configured.workflow.version` 与 `DEFAULT_CONFIG.workflow.version`，不一致时 `console.warn` 到 stderr
4. **测试**: 在现有测试文件中添加 version mismatch warning 测试
