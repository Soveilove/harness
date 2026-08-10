# Reconciliation: 025-load-stage-enhancement load 阶段增强

## Need Translation

**PM 原话**：「现在开发哪个，走一下标准工作流吧」→ 选取 DEV_BACKLOG 步骤 5（load 阶段增强，P1），走完整 12 阶段工作流。

**技术理解**：load 阶段是 12 阶段链中最薄的一环，存在设计文档与实现的 bug 级差距（TASK_TYPE_MAP 缺失 code-map/rule），且 load→grill 信息断层导致 grill 从零开始理解代码库。本 Feature 补齐知识加载 + 增加主动探索产出 load-summary.md + grill 依赖联动。

## Current State

### 代码现状

1. **loadStage 定义**（`stages/index.ts:19-58`）：
   - `producesArtifacts: []` — 全工作流唯一不产出文件
   - `preExecute` 只调 `loadByTaskType('general')`
   - 无 `postExecute`
   - prompt 纯指令性（状态校验 + 初始化），无探索方法论

2. **TASK_TYPE_MAP**（`knowledge/store.ts:25-34`）：
   - `'general': ['constitution', 'preference', 'architecture']`
   - 设计文档 §6.1 要求加载 Code Map + 规则 + Baseline，实现未覆盖

3. **grillStage 定义**（`stages/index.ts:63-112`）：
   - `requiredArtifacts: []` — 不依赖任何 load 产物
   - prompt 写 `## 输入：有效的 load 结果`，但 load 不产出文件

4. **completeStage**（`engine/workflow-engine.ts:283-314`）：
   - `validateProduced(stageDef.contract.producesArtifacts)` — 空数组直接通过
   - 对 wayfind 有特殊校验（wayfinder.validateCompletion）
   - load 无特殊校验

### 为什么是这样

- load 最初设计为"状态恢复"阶段，不做主动探索
- 随着项目演进（24 个 Feature 积累），load→grill 信息断层日益明显
- 设计文档 §6.1 的要求从未被完整实现（遗漏，非有意设计）
- Feature 019（契约单一源）将 stage contract 集中到 stageRegistry，修改契约定点明确

## Solutions

### Solution A: 补齐知识加载 + postExecute（方向一）

- **描述**：TASK_TYPE_MAP['general'] 加 code-map/rule + loadStage 加 postExecute 校验状态一致性
- **cost**：极小（~10 行代码 + 2 个测试），但单独做过于轻量

### Solution B: 方向一 + load-summary.md 主动探索（方向一 + 方向二）

- **描述**：在方向一基础上，loadStage 产出 load-summary.md（AI agent 根据 prompt 生成），grill requiredArtifacts 增加 load-summary.md，prompt 增加探索方法论
- **cost**：中等（~40 行代码 + 5-8 个测试），但解决核心痛点

### 选择：Solution B

方向一是 bugfix 性质的前置，方向二是实质性增强，二者自然耦合。单独做方向一价值不足以独立成 Feature。

## Questions

### [tech] Q1: load-summary.md 的内容结构是否需要严格模板？

- recommendation: 不需要严格模板，prompt 中给出指导性结构（代码库现状/相关实现/风险点），AI agent 自由发挥。与 decision-log.md 模式一致——阶段给出 prompt 指导，AI 写内容，postExecute 只校验存在性。

### [tech] Q2: postExecute 校验什么？

- recommendation: 校验 workflow-state.yaml 的一致性（currentStage === 'load' 且 revision ≥ 0）。不做更深层校验——load 不产出文件，状态文件是唯一可校验对象。

## Sign-off

- [x] product: by: user date: 2026-08-10 ref: 用户确认「可以」
- [x] tech: by: AI date: 2026-08-10 ref: 本 reconciliation.md
