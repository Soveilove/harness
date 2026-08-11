# Plan: P2-7-quick-overdefense-fix

## 模块边界

仅 `src/quick/run.ts` 的 `evaluateQuickRun()` 函数，约 15 行逻辑重构。

## 状态/数据流

```
evaluateQuickRun() {
  check phase →
    hardEscalation? (target empty || status=escalated || no paths) → escalated + git:null + 冷启动引导
    expanded? → 添加上下文警告到 riskSignals，继续
  confirm phase → implement phase → git verify → verify phase → finish
    (expanded 时 report 附加 contextWarning)
}
```

## 变更内容

1. `hardEscalation` 条件：移除 `status === 'expanded'`，`declaredPaths.length !== 1` 改为 `=== 0`
2. 冷启动引导：`hardEscalation` 且 `!baselineRevision` 时添加引导文本
3. expanded 警告：在 report 中附加 `contextWarning`
4. 测试更新：`quick-cli.test.mjs` 中 escalated 测试断言更新

## 验证方式

- `pnpm test` 全部通过
- 人工确认：expanded 场景不再 escalated