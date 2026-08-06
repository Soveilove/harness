# Feature 016 — Spec

## 验收标准

### AC1: completeStage 在未 prepare 时 throw

当 `completeStage(featureId, stageName)` 被调用，且 `stageName` 不在 `state.preparedStages` 中时，throw 错误：

```
Error: Cannot complete '<stage>': stage was not prepared. Run `sovei workflow <stage> <feature>` first to trigger skill injection and template creation.
```

### AC2: prepareStage 追加 STAGE_PREPARED 事件

`prepareStage` 在返回前追加 `STAGE_PREPARED` 事件到事件日志。事件结构：
```typescript
{ type: 'STAGE_PREPARED', stage: stageName }
```

### AC3: STAGE_COMPLETE 消费 preparedStages

`STAGE_COMPLETE` 事件将已完成阶段从 `preparedStages` 中移除。

### AC4: REOPEN 和 CHANGE_DECLARED 清除 preparedStages

重开阶段时，`preparedStages` 中该阶段及其后继被清除。

### AC5: 向后兼容

旧 Feature 的事件日志中没有 `STAGE_PREPARED` 事件。replay 时 `preparedStages` 为 `[]`。已完成的 Feature 不受影响（不会再调用 completeStage）。

### AC6: WorkflowState 新增 preparedStages 字段

```typescript
export interface WorkflowState {
  // ... existing fields ...
  preparedStages: string[];
}
```

`createInitialState` 中 `preparedStages: []`。

## 非目标

- 不修改 CLI 命令签名
- 不修改 schemaVersion
- 不修改 skill-map / skill-lock 结构
- 不实现"跳过 prepare"的 escape hatch
