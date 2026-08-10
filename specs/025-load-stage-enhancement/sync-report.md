# 同步报告：025-load-stage-enhancement

> Feature：025-load-stage-enhancement
> 日期：2026-08-10

## 同步目标

| 目标 | 类型 | 状态 |
|---|---|---|
| 源码变更 | packages/sovei-core/src | ✅ 已实施 |
| 测试 | packages/sovei-core/test | ✅ 已新增+适配 |
| Feature 产物 | specs/025-load-stage-enhancement/ | ✅ 完整 12 阶段产物 |
| 知识库 | harness/project/knowledge/ | ✅ 2 条 candidate 新增 |

## 同步前差异

- `packages/sovei-core/src/knowledge/store.ts` — TASK_TYPE_MAP['general'] 增加 code-map, rule
- `packages/sovei-core/src/stages/index.ts` — loadStage 增加 producesArtifacts + postExecute + prompt；grillStage requiredArtifacts
- `packages/sovei-core/src/engine/workflow-engine.ts` — getArtifactTemplate titles 增加 load-summary.md
- `packages/sovei-core/test/load-stage-enhancement.test.mjs` — 新增 6 条测试
- `packages/sovei-core/test/workflow.test.mjs` — 适配 2 处
- `packages/sovei-core/test/skill-runtime.test.mjs` — 适配 4 处
- `packages/sovei-core/test/project.test.mjs` — 适配 1 处

## 受保护文件

无受保护文件被修改。harness/project/ 下的知识文件由 learn postExecute 自动写入（2 条 candidate）。

## 命令结果

- `tsc --noEmit`：通过
- `node --test test/*.test.mjs`：179/179 通过
- `pnpm run sovei:build`：成功

## 跳过目标

无

## 结论

所有变更已同步，Feature 025-load-stage-enhancement 可标记为 completed。
