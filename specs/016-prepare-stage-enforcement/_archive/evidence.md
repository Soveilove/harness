# Feature 016 — Evidence

## V1: TypeScript 编译通过
```
npx tsc --noEmit → 无错误
```

## V2: 全量测试通过
```
node --test test/*.test.mjs
→ 104 tests, 104 pass, 0 fail
```

## V3: 新增测试验证
- `completeStage throws when stage was not prepared` — 未 prepare 时 throw
- `prepareStage enables completeStage and records STAGE_PREPARED event` — prepare 后可以 complete，事件被记录

## V4: 红线无违反
- AUDIT_LOG_APPEND_ONLY: STAGE_PREPARED 是 append 事件
- PERSISTED_SCHEMA_COMPAT: 新增事件类型 additive，旧事件日志不受影响
- CLI_CONTRACT_STABILITY: 不修改 CLI 命令签名
- CONFIRMATION_GATE_INTEGRITY: 不修改门禁逻辑

## V5: 向后兼容
- 旧 Feature 事件日志无 STAGE_PREPARED，replay 时 preparedStages 为 []
- 已完成的 Feature 不会再调用 completeStage，不受影响
- 新 Feature 必须先 prepare 再 complete
