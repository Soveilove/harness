# Tasks — 031-explore-stage

- [x] TASK-001: 新增 explore 阶段定义（stages/index.ts，prompt 契约读 PRD + business-coverage → 需求理解 + 拆分提议，产出 exploration.md + sub-change-map.md，不读代码）
- [x] TASK-002: stageOrder 更新 + 向后兼容（workflow-engine.ts stageOrder 改为 13 阶段；state-machine.ts replay 兼容老 Feature 无 explore 事件）
- [x] TASK-003: explore 命令兼任入口（workflow.ts 新增 `workflow explore` 命令，支持 --prd/--brief，内部 bootstrap + 复制 PRD）
- [x] TASK-004: onboard 增加业务覆盖面扫描（project.ts 新增 Step 6 指导生成 business-coverage.md）
- [x] TASK-005: feature split 前置条件放宽（feature.ts 改为需 exploration.md，回退到 spec.md + scope.md）
- [x] TASK-006: scope 拆分评估段调整（stages/index.ts scope 阶段"拆分评估"改为"拆分修正"）
- [x] TASK-007: IDE 适配器更新（registry.ts WORKFLOW_STAGES 新增 explore；Claude/CodeBuddy/Codex/Trae 适配器更新）
- [x] TASK-008: 测试 + 验证（新增 explore-stage.test.mjs 9 个测试，全量 214 测试零回归）
