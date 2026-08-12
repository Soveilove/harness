# 同步报告

> Feature：031-explore-stage
> 阶段：sync

---

## 目标

新增 `explore` 阶段作为工作流第 1 阶段（load 之前），承担"需求分析 + 业务理解 + 拆分提议"职责。增强 `onboard` 命令产出业务覆盖面报告。支持 `workflow explore` 命令兼任 Feature 入口。

## 同步状态

| 目标 | 状态 | 说明 |
|---|---|---|
| 源码 | ✅ 已实施 | exploreStage 定义、stageOrder 更新、状态机兼容、CLI 命令、IDE 适配器全部完成 |
| 测试 | ✅ 已实施 | 214/214 通过（原 205 + 新增 9 个 explore 专项测试） |
| 文档 | ✅ 已实施 | AGENTS.md 阶段顺序已更新为 13 阶段 |
| 配置 | ✅ 已实施 | config/loader.ts DEFAULT_STAGE_ORDER 已更新，老配置兼容 |
| IDE 适配器 | ✅ 已实施 | Claude/CodeBuddy/Codex/Trae 全部适配 explore 阶段 |

## 变更文件清单

### 源码
- `packages/sovei-core/src/stages/index.ts` — 新增 exploreStage，scope 阶段拆分评估改为拆分修正
- `packages/sovei-core/src/engine/workflow-engine.ts` — stageOrder 改为 13 阶段
- `packages/sovei-core/src/engine/state-machine.ts` — skippedStages 兼容逻辑
- `packages/sovei-core/src/cli/commands/workflow.ts` — 新增 explore 命令
- `packages/sovei-core/src/cli/commands/project.ts` — onboard 新增 Step 6
- `packages/sovei-core/src/cli/commands/feature.ts` — feature split 前置条件放宽
- `packages/sovei-core/src/adapters/registry.ts` — IDE 适配器更新
- `packages/sovei-core/src/config/loader.ts` — DEFAULT_STAGE_ORDER 更新

### 测试
- `packages/sovei-core/test/explore-stage.test.mjs` — 新增 9 个 explore 专项测试
- 多个现有测试文件添加 skipExplore 辅助函数

### 规范
- `AGENTS.md` — 阶段顺序更新为 13 阶段

## 结论

✅ 全部就绪。Feature 031-explore-stage 的所有变更已同步到源码、测试、文档和配置。214/214 测试通过，零回归。
