# 覆盖矩阵 — P2-7-quick-overdefense-fix

| 维度 | 覆盖状态 | 证据 |
|---|---|---|
| 入口/路由 | ✅ `evaluateQuickRun()` | `src/quick/run.ts` |
| 参数 | ✅ `target`/`declaredPaths`/`baselineRevision` | `src/quick/run.ts` L148-151 |
| 异步生命周期 | ✅ `verifyGitChanges` 调用链 | `src/quick/run.ts` L170-175 |
| 成功/失败 | ✅ expanded 降级 + git 验证 | 本 Feature 新增 |
| 兼容入口 | ✅ 无 `--paths` 时 escalation 不变 | `src/quick/run.ts` |
| 测试 | ✅ `quick-cli.test.mjs` | `test/quick-cli.test.mjs` |
| 运行时证据 | ✅ usage 事件流不变 | `src/quick/run.ts` `appendEnd` |