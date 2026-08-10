# 变更清单

> Feature：025-load-stage-enhancement

## TASK-001: TASK_TYPE_MAP['general'] 增加 code-map 和 rule

**文件**：`packages/sovei-core/src/knowledge/store.ts`
**行为**：`TASK_TYPE_MAP['general']` 从 `['constitution', 'preference', 'architecture']` 改为 `['constitution', 'preference', 'architecture', 'code-map', 'rule']`
**测试**：`loadByTaskType("general") loads code-map and rule knowledge types`

## TASK-002: loadStage 增加 producesArtifacts + postExecute + prompt 探索方法论

**文件**：`packages/sovei-core/src/stages/index.ts`
**行为**：
1. `producesArtifacts: []` → `['load-summary.md']`
2. 新增 `postExecute` 钩子（校验 workflowState.featureId 存在 + revision ≥ 0）
3. prompt 从纯状态校验扩展为三维度（状态校验 + 现状探索 + 风险识别）
4. `artifactsWritten: []` → `['load-summary.md']`

**文件**：`packages/sovei-core/src/engine/workflow-engine.ts`
**行为**：`getArtifactTemplate` 的 titles 字典新增 `'load-summary.md': '加载摘要'`

**测试**：
- `loadStage contract declares load-summary.md as produced artifact`
- `loadStage postExecute validates workflow-state consistency`
- `load prompt includes exploration methodology keywords`

## TASK-003: grillStage requiredArtifacts 增加 load-summary.md

**文件**：`packages/sovei-core/src/stages/index.ts`
**行为**：`requiredArtifacts: []` → `['load-summary.md']`
**测试**：
- `grillStage requires load-summary.md as input artifact`
- `grillStage preparation fails when load-summary.md is missing`

## TASK-004: 新增测试文件

**文件**：`packages/sovei-core/test/load-stage-enhancement.test.mjs`（新文件）
**测试**：6 条，覆盖 TASK-001~003 全部验收标准

## TASK-005: 构建验证 + 全量测试

- tsc --noEmit 通过
- 179/179 测试通过（原 173 + 新增 6）
- 现有测试适配：`workflow.test.mjs`（2 处）、`skill-runtime.test.mjs`（4 处）、`project.test.mjs`（1 处）增加 `load-summary.md` 写入

## 剩余工作

无。所有 5 个任务已完成。
