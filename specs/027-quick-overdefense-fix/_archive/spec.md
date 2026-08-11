# Spec: P2-7-quick-overdefense-fix

## 验收标准

1. `quick` 命令在 `status='expanded'` 时**不再阻塞**，而是继续执行 git diff 验证并在报告中附加上下文相关性警告
2. `quick` 命令支持 `--paths` 传入 2 个及以上路径（当前仅允许恰好 1 个）
3. `quick` 命令 escalated 时若无基线 commit，报告中包含冷启动引导信息
4. 所有现有测试继续通过，`quickCLI` 集成测试中 escalated 无 `--paths` 的场景行为不变

## 边界

- `status='escalated'`（非 expanded）仍立即阻塞
- `target` 为空时仍立即阻塞
- `declaredPaths` 为空（无 `--paths`）时 escalation 行为不变
- `context/policy.ts` 的 `expanded` 状态语义不变，仅消费方处理方式变化

## 排除

- 不修改 `--json` 输出格式
- 不修改 CLI 命令接口
- 不做 `context build --paths` 语义修正（P2-5，独立项）