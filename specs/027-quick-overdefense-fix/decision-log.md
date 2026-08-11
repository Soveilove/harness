# decision-log.md — P2-7-quick-overdefense-fix

## 决策树

### D1: `status='expanded'` 是否应阻塞 quick 流程？

- **类型:** 可推断决策
- **决策:** 不阻塞。`expanded` 表示"上下文相关性不确定"（有未命中的红线/规则候选），但 Git diff 验证与上下文相关性无关。应降级为警告而非硬性 escalated。
- **理由:** 当前 `run.ts` L148-151 将 `expanded` 作为 escalated 条件，导致几乎所有带 `--paths` 的 quick 调用都 escalated，从未走到 git 验证。`expanded` 的本质是"上下文可能有遗漏"，不是"不能实施"。
- **被拒绝方案:**
  - 保持现状（过度防御，用户体验差，几乎必然 escalated）
  - 完全移除 `expanded` 状态（失去上下文警告价值）
- **状态:** ✅ 已决

### D2: `declaredPaths.length !== 1` 是否应放宽？

- **类型:** 可推断决策
- **决策:** 改为 `declaredPaths.length === 0`。0 paths 时确实无法确定范围需要 escalation，但 2+ paths 应正常工作。
- **理由:** 多文件修改场景（如同时改 `src/foo.ts` 和 `src/bar.ts`）是合法的 quick 场景，不应被阻断。
- **被拒绝方案:** 保持 `!== 1`（过度严格，误伤多文件场景）
- **状态:** ✅ 已决

### D3: 冷启动时是否添加引导信息？

- **类型:** 可推断决策
- **决策:** 当 escalated 且 `baselineRevision` 为 null 时，在 report 中添加冷启动引导。
- **理由:** 用户看到 `git: null` 容易误解为"无 commit 导致 escalated"，实际根因是 `needsEscalation` 提前拦截。引导用户创建基线 commit 可提升首次体验。
- **被拒绝方案:** 保持模糊 escalated 消息（用户困惑，dev backlog 指出问题）
- **状态:** ✅ 已决

### D4: expanded 状态下如何处理 report？

- **类型:** 可推断决策
- **决策:** 在 report 中添加 `contextWarning`，说明上下文相关性不确定，建议人工确认。不阻塞流程。
- **理由:** 用户仍然能获得 git diff 验证结果，上下文警告作为补充信息而非阻断条件。
- **被拒绝方案:** 忽略 expanded（失去警告价值）；在 `--json` 中通过 `policy.controlPlane.status` 传递（间接，不够显式）
- **状态:** ✅ 已决

## 未决项

- 无

## 实施范围

| 文件 | 改动 |
|---|---|
| `src/quick/run.ts` | `needsEscalation` → `hardEscalation`，移除 `expanded` 条件，放宽 paths 条件，添加冷启动引导，添加 expanded 上下文警告 |
| `test/quick-cli.test.mjs` | 更新 "quick CLI escalates" 测试的 report 断言（新增冷启动引导行） |