# Feature 016 — Load

## 问题陈述

外部 Skills 配置了但从未被使用。根本原因：`completeStage` 不检查 `prepareStage` 是否被调用过。AI 可以直接写产物文件然后 `--complete`，完全跳过 skill 注入步骤。

## 源码分析

### 两步流程设计

Sovei 每个阶段设计为两步：
1. `sovei workflow <stage> <feature>` — 调用 `prepareStage()`，生成 prompt（含 skill 注入），创建模板文件
2. `sovei workflow <stage> <feature> --complete` — 调用 `completeStage()`，校验产物，追加 STAGE_COMPLETE 事件

### 缺失的环节

`completeStage`（workflow-engine.ts:281-326）通过 `createStageContext` 创建上下文，校验产物，但**不检查 prepare 是否发生过**。没有状态字段记录"某阶段是否已被 prepare"。

### 影响范围

- `prepareStage` 中的 skill 注入（line 163-264）被完全绕过
- `prepareStage` 中的模板创建（line 266-274）被绕过（AI 自己写文件）
- 外部 skill 绑定形同虚设

## 解决方向

在 `WorkflowState` 中追踪 `preparedStages`，在 `WorkflowEvent` 中添加 `STAGE_PREPARED` 事件：
1. `prepareStage` 追加 `STAGE_PREPARED` 事件
2. `completeStage` 检查当前阶段是否在 `preparedStages` 中
3. `STAGE_COMPLETE` 从 `preparedStages` 中移除该阶段

## 红线检查

- PERSISTED_SCHEMA_COMPAT：新增事件类型是 additive 的，旧事件日志不受影响
- CLI_CONTRACT_STABILITY：不修改 CLI 命令签名，只是 `--complete` 新增前置检查
- AUDIT_LOG_APPEND_ONLY：仍然只 append，不修改历史事件
