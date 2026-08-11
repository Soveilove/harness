# 功能规格：load 阶段增强

> Feature：025-load-stage-enhancement
> 风险等级：S1

## 问题陈述

load 是 12 阶段工作流中最薄的一环：唯一不产出文件、唯一无 postExecute、无 skill 绑定、知识加载最浅层。设计文档 §6.1 要求 load 加载 Code Map + 规则 + Baseline，但实现未覆盖。这导致 grill 阶段从零开始理解代码库现状，load→grill 之间存在信息断层。

## 用户可见行为

### 1. load 阶段产出 load-summary.md

执行 `sovei workflow load <feature>` 后，Feature 目录下新增 `load-summary.md`，包含：
- 代码库现状摘要（关键模块/入口/架构）
- 与当前 Feature 可能相关的已有实现
- 潜在风险点

### 2. load 阶段加载更完整的知识

load 阶段 preExecute 加载的知识类型从 `['constitution', 'preference', 'architecture']` 扩展为 `['constitution', 'preference', 'architecture', 'code-map', 'rule']`，与设计文档 §6.1 对齐。

### 3. load 阶段有 postExecute 校验

load 完成时校验 workflow-state.yaml 的一致性（currentStage 正确、revision 合法）。

### 4. grill 阶段依赖 load-summary.md

grill 的 `requiredArtifacts` 从 `[]` 改为 `['load-summary.md']`，确保 grill 启动时能引用 load 的探索成果。

### 5. load prompt 增加探索方法论

load prompt 从纯状态校验指令扩展为包含探索方法论指导，告知 AI「不只是校验状态，还要理解现状+识别风险」。

## 验收标准

| # | 标准 | 验证方式 |
|---|---|---|
| AC1 | `TASK_TYPE_MAP['general']` 包含 `code-map` 和 `rule` | 单元测试：loadByTaskType('general') 后 getLoadedSources() 包含 knowledge/code-map.json 和 knowledge/rule.json |
| AC2 | loadStage.contract.producesArtifacts 包含 `load-summary.md` | 单元测试：检查 stageRegistry.get('load').contract.producesArtifacts |
| AC3 | loadStage 有 postExecute 钩子 | 单元测试：postExecute 存在且不抛出异常（正常状态） |
| AC4 | grillStage.contract.requiredArtifacts 包含 `load-summary.md` | 单元测试：检查 stageRegistry.get('grill').contract.requiredArtifacts |
| AC5 | load prompt 包含探索方法论指导 | 代码审查：prompt 文本包含「探索」「风险」「现状」等关键词 |
| AC6 | 完整工作流可通过：load → grill → ... → sync | 集成测试：bootstrap 新 Feature，prepare load 后 load-summary.md 模板生成，complete load 通过 postExecute 校验 |
| AC7 | 新增测试全部通过 | `node scripts/test.mjs` 通过，测试数量在 173 基础上增加 |

## 边界

### 做什么
- 修改 `stages/index.ts`：loadStage 定义（producesArtifacts + postExecute + prompt）
- 修改 `stages/index.ts`：grillStage 定义（requiredArtifacts）
- 修改 `knowledge/store.ts`：TASK_TYPE_MAP['general']
- 新增测试用例

### 不做什么
- 不绑定外部 skill（P3 延后，已决策 D3）
- 不修改 completeStage 逻辑（现有逻辑已支持空 producesArtifacts 和有 producesArtifacts 两种情况）
- 不修改 CLI 命令结构（`sovei workflow load <feature>` 不变）
- 不修改 workflow.version（stage 契约变更不 tracked by workflow.version，参见 engine/types.ts 注释）

## 排除项

- load-summary.md 的具体内容由 AI agent 根据 prompt 生成，本 Feature 只定义产物契约和 prompt 指导
- 不做 drift detection（问题三，第一期不做）
- 不做统一关系模型（问题四，3.0.0 范围）
