# Plan — 031-explore-stage

## 模块边界

### 1. 阶段定义层（stages/index.ts）
新增 exploreStage，定义 prompt 契约和产物校验。

### 2. 状态机层（engine/workflow-engine.ts + state-machine.ts）
stageOrder 改为 13 阶段；向后兼容老 Feature。

### 3. 命令层（cli/commands/workflow.ts）
新增 explore 命令，兼任 Feature 入口。

### 4. onboard 增强层（cli/commands/project.ts）
增加业务覆盖面采集步骤。

### 5. feature split 放宽层（cli/commands/feature.ts）
前置条件改为 exploration.md。

### 6. 适配器层（adapters/registry.ts）
WORKFLOW_STAGES + slashCommands 更新。

## 数据流

```
用户运行 explore <prd-path>
  ↓
explore 命令读取 PRD 文件
  ↓
engine.bootstrap(feature) 创建 Feature
  ↓
复制 PRD 到 specs/<feature>/prd.md
  ↓
exploreStage.execute() 返回 prompt 契约
  ↓
AI 读 PRD + business-coverage.md → 产出 exploration.md + sub-change-map.md
  ↓
--complete 校验产物 + 推进状态
```

## 契约

- explore 阶段 requiredArtifacts: [] （第一个阶段，无前置产物）
- explore 阶段 producesArtifacts: ['exploration.md', 'sub-change-map.md']
- load 阶段 requiredArtifacts 增加 'exploration.md'（explore 完成后才能 load）
