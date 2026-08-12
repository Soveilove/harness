# 加载摘要

> 由 Sovei 阶段生成：load
> Feature：030-feature-sub-changes（Feature 拆分为多个子变更的能力）

---

## 1. 代码库现状摘要

### 1.1 项目结构

`d:\project\harness` 是 sovei 引擎的自托管仓库（monorepo + pnpm）：

- `packages/sovei-core/`：引擎本体，TypeScript 源码在 `src/`，零运行时依赖，构建为单文件 `dist/release/sovei.cjs`（CommonJS）。
- `harness/`：init 产物目录（运行时治理资产：project/、skills/、vendor/、knowledge/、governance/、rules/）。
- `specs/`：所有 Feature 的工作流产物存放处（001 ~ 029 已存在，030 为本 Feature）。
- `web-plugins/`：EC 前端 AI 插件素材源（agents/ + skills/ 分离，未与 sovei 打通）。

### 1.2 引擎关键模块（与子变更拆分强相关）

| 模块 | 路径 | 职责 |
|---|---|---|
| **状态机** | `src/engine/state-machine.ts` | 纯函数 reducer，处理 12 阶段推进 + CHANGE_DECLARED/REOPEN 回退 |
| **工作流引擎** | `src/engine/workflow-engine.ts` | bootstrap/prepareStage/completeStage/completeTask/reopen/applyChange |
| **类型** | `src/engine/types.ts` | `WorkflowState`、`WorkflowEvent` 联合类型 |
| **事件存储** | `src/engine/event-store.ts` | 每 Feature 一条 `workflow-events.jsonl`，replay 还原状态 |
| **change-control** | `src/change-control/` | 重大变更重开请求（ChangeRequest），治理 + 红线审查 |
| **wayfinder** | `src/wayfinder/` | 决策工单 + 雾区，`blockedBy` 依赖 |
| **产物仓库** | `src/artifacts/repository.ts` | 读写 Feature 产物文件 |
| **Feature CLI** | `src/cli/commands/feature.ts` | 仅 archive/summary 两个子命令 |
| **Workflow CLI** | `src/cli/commands/workflow.ts` | bootstrap + 12 阶段 + reopen/change/apply-change |
| **上下文构建** | `src/context/builder.ts`、`cross-feature.ts` | 跨 Feature 子代理并行读取（`_subagentContract`） |

### 1.3 技术栈与约束

- TypeScript（`type: module`），构建链 tsc → esbuild → javascript-obfuscator。
- **零运行时依赖**（`dependencies: {}`），单文件分发。
- Node >= 14.18.0 兼容（Feature 017 刻意保留）。
- 测试基线：192/192 通过（Feature 029 后）。

---

## 2. 与当前 Feature 相关的已有实现

### 2.1 核心结论：引擎不支持 Feature 拆分为子变更

全链路是"一 Feature 一管线"的线性模型，代码中**不存在** sub-change / sub-feature / epic / swimlane 一等概念。

### 2.2 现有线性模型的关键证据

**状态机是单游标**（[types.ts:26-42](file:///d:/project/harness/packages/sovei-core/src/engine/types.ts)）：
```
WorkflowState { featureId, currentStage, completedStages[], completedTaskIds[], activeChangeId, revision }
```
- 只有一个 `currentStage`，任意时刻只能执行一个阶段。
- `canExecuteStage`（state-machine.ts:256-274）显式拒绝非当前阶段执行。
- `activeChangeId` 是单值不是列表。

**事件流是单条**：每 Feature 只有一条 `workflow-events.jsonl`，子变更无法各自维护独立进度。

**产物是扁平单份**：`change-manifest.md`/`tasks.md`/`evidence.md` 都是整 Feature 一份，无 `sub-changes/<id>/` 命名空间。

**CLI 无拆分命令**：`feature` 只有 archive/summary；`workflow` 无 split/sub-change/branch。

### 2.3 可复用的基础设施

| 已有能力 | 位置 | 复用方向 |
|---|---|---|
| 12 阶段线性管线 | workflow-engine.ts:53-61 | 每个子变更复用这条管线 |
| 任务级完成（TASK-xxx） | workflow-engine.ts:360-376 | 已支持任务粒度，但全归在同一份 manifest |
| 重大变更重开 + revision | state-machine.ts:124-150、change-control/ | "回退 + 失效归档"审计模型，可作子变更调度治理底座 |
| 决策工单 + 依赖 + 认领 | wayfinder/schemas.ts:16-33 | `blockedBy`/`claim` 可上提为子变更间依赖与认领 |
| 跨 Feature 子代理并行 | context/cross-feature.ts | `_subagentContract` 并行模式可借鉴到子变更并行 |
| 失效产物归档 | workflow-engine.ts:671-710 | `history/revision-N/` 模式可承载子变更更迭 |

### 2.4 现有 CHANGE_DECLARED / REOPEN 的本质

这两个事件最易被误读为"子变更"，但实际是**同一条工作流回退重走**：
- `CHANGE_DECLARED`（state-machine.ts:124-150）：设 `currentStage = target`，截断 `completedStages`，`revision + 1`，清空 `completedTaskIds`。
- `REOPEN`（state-machine.ts:152-187）：同样截断逻辑。
- `assertNoPendingChanges`（workflow-engine.ts:649-658）：有 draft ChangeRequest 时**冻结整个工作流**——与并行开发完全对立。

### 2.5 项目自身已声明此缺口

[TECH_SHARING_MATERIAL_POLISHED.md:326-359](file:///d:/project/harness/technical-sharing/TECH_SHARING_MATERIAL_POLISHED.md) 明确：
> "当前 CLI 的使用方式是一个需求只建立一个 Feature，前后端任务都登记在同一份 tasks.md 中"
> "任务负责人和泳道状态不是一等数据……当前 CLI 可以支撑这套协作方法，但不能宣称已经提供完整的前后端并行编排平台。"

---

## 3. 潜在风险点

### 3.1 架构耦合风险（高）

- **状态机单游标假设深植全链路**：`canExecuteStage`、`completeStage`、`completeTask`、`createStageContext` 都假设单一 `currentStage`。引入子变更后，游标从单值变为按子变更索引，影响面波及 `workflow-engine.ts` 全文（737 行）。
- **`assertNoPendingChanges` 的冻结语义**与子变更并行直接冲突，需细化为"冻结某子变更"而非"冻结整个 Feature"。
- **事件 replay 逻辑**（event-store.ts）假设单条事件流还原单一状态，子变更需独立事件流或事件加分桶维度。

### 3.2 产物命名空间风险（中）

- 产物路径在 `artifacts/repository.ts` 和 `getArtifactTemplate`（workflow-engine.ts:712-737）中扁平拼接。引入 `sub-changes/<id>/` 前缀后，archive/history/coverage-matrix 等机制都需兼容。
- `feature summary`（feature.ts:260-487）的聚合逻辑需支持多子变更汇总到父 Feature。

### 3.3 向后兼容风险（中）

- 现有 Feature（001-029）都是单管线模型。子变更能力上线后，必须保证：
  - 无子变更的 Feature 行为完全不变（降级为"单子变更"或"无子变更"路径）。
  - 现有 `change-manifest.md`/`tasks.md` 扁平产物仍可被读取。
  - `workflow-events.jsonl` 的 replay 兼容旧事件。

### 3.4 约束红线

- **零运行时依赖**：子变更状态管理不能用第三方状态机库，需自研。
- **Node 14 兼容**：不能用 `??=`、顶层 await 等 Node 16+ 语法。
- **单文件分发**：所有新增代码最终打进 `sovei.cjs`，不能引入动态 import 外部文件。

### 3.5 测试覆盖风险（中）

- 现有 192 个测试基于单管线模型。子变更引入后需新增子变更生命周期测试，且不能破坏现有测试。
- 事件 replay 的兼容性测试是关键：旧格式事件流 + 新格式事件流混合时必须正确还原。

### 3.6 本 Feature 的自指风险（dogfooding 悖论）

- 本 Feature（030）本身要用子变更能力来开发，但子变更能力此时还不存在。
- **解法**：本 Feature 仍走当前线性 12 阶段开发；子变更能力实现后，后续 7 项大需求（code agent 适配、skills 基座等）才作为子变更开发。本 Feature 是"建拆分能力本身"，不是"用拆分能力开发"。

---

## 4. 状态校验

- Feature 030 状态：`in_progress`，revision 0，当前阶段 load，风险 S1。
- workflow-state.yaml 已初始化，无版本冲突，无产物冲突。
- 本仓库 sovei 版本 2.5.10，与发布一致。
