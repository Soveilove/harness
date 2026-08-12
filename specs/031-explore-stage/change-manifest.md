# 变更清单

> 由 Sovei 阶段生成：implement
> Feature：031-explore-stage（新增 explore 阶段作为需求入口）

---

## 目标

为 Sovei 工作流新增 `explore` 阶段作为第 1 阶段（load 之前），承担"需求分析 + 业务理解 + 拆分提议"职责。同时增强 `onboard` 命令产出业务覆盖面报告，并支持 `workflow explore` 命令兼任 Feature 入口（--prd/--brief 一条指令完成 Feature 创建 + 需求分析）。

## 任务与文件清单

- [x] TASK-001: `packages/sovei-core/src/stages/index.ts` — 新增 exploreStage 定义（prompt 契约读 PRD + business-coverage → 需求理解 + 拆分提议，产出 exploration.md + sub-change-map.md，不读代码）
- [x] TASK-002: `packages/sovei-core/src/engine/workflow-engine.ts` — DEFAULT_WORKFLOW.stageOrder 改为 13 阶段（explore 在最前）；`packages/sovei-core/src/engine/state-machine.ts` — replay 兼容老 Feature 无 explore 事件（skippedStages 静默跳过）
- [x] TASK-003: `packages/sovei-core/src/cli/commands/workflow.ts` — 新增 `workflow explore` 命令，支持 --prd/--brief，内部 bootstrap + 复制 PRD/brief
- [x] TASK-004: `packages/sovei-core/src/cli/commands/project.ts` — onboard 新增 Step 6 指导生成 business-coverage.md
- [x] TASK-005: `packages/sovei-core/src/cli/commands/feature.ts` — feature split --json 前置条件改为需 exploration.md，回退到 spec.md + scope.md
- [x] TASK-006: `packages/sovei-core/src/stages/index.ts` — scope 阶段"拆分评估"段改为"拆分修正"
- [x] TASK-007: `packages/sovei-core/src/adapters/registry.ts` — WORKFLOW_STAGES 新增 explore；Claude/CodeBuddy/Codex/Trae 适配器更新 slash command 和节点表格
- [x] TASK-008: `packages/sovei-core/test/explore-stage.test.mjs` — 9 个测试覆盖 stageOrder、explore 命令、向后兼容、feature split 前置条件

## 行为变更

- **向后兼容**：现有 Feature（无 explore 事件）replay 时静默跳过 explore，不阻塞推进。老项目 12 阶段配置仍被接受（验证逻辑放宽）。
- **新增能力**：`workflow explore` 命令（兼任入口）、`--prd`/`--brief` 参数、explore 阶段产出 exploration.md + sub-change-map.md。
- **阶段顺序**：12 阶段 → 13 阶段（explore → load → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync）。
- **feature split 前置放宽**：explore 完成后（有 exploration.md）即可拆分，不需等到 scope。
- **scope 阶段调整**：拆分评估 → 拆分修正（基于代码影响面修正 explore 的拆分提议）。
- **IDE 适配器**：Claude/CodeBuddy 新增 /sovei-explore slash command；Codex skillPackage 和 Trae 文本指令更新节点表格。
- **onboard 增强**：新增 Step 6 指导 AI 生成 business-coverage.md（业务覆盖面报告）。

## 测试

- 214/214 全部通过（原 205 + 新增 9 个 explore 测试），零回归
- 新增 `test/explore-stage.test.mjs` 覆盖：stageOrder 顺序、explore 阶段定义与产物校验、向后兼容（老 Feature 跳过 explore）、explore --brief 入口、explore --prd 入口、explore --complete 验证、feature split after explore

## 剩余工作

- 无（全部 TASK 完成）
