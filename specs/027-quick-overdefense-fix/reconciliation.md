# Reconciliation: P2-7-quick-overdefense-fix

## Need Translation

PM: 修复 quick 通道「过度防御 + 冷启动」缺陷

技术理解:
- `status='expanded'` 当前被当作硬性 escalated，导致几乎所有带 `--paths` 的 quick 调用都提前返回
- `declaredPaths.length !== 1` 阻止多文件 quick 场景
- escalated 时 `git: null` 用户无法理解，需要冷启动引导

## Current State

- `src/quick/run.ts` L148-151: `needsEscalation` 包含 `status === 'expanded'` 和 `declaredPaths.length !== 1`
- `src/context/policy.ts` L177: `uncertain` 在 paths 提供且存在未命中候选时设为 true，导致 `status='expanded'`
- 当前 escalated 分支返回 `{ git: null }`，用户误以为"无 commit 导致"
- 详见 Feature 025 的 decision-log.md 和 DEV_BACKLOG.md §3.7.1

## Solutions

### Solution A (selected): 区分硬性 escalation 与 expanded 警告
- 移除 `status === 'expanded'` 从 `needsEscalation`
- 将 `declaredPaths.length !== 1` 改为 `length === 0`
- expanded 时继续 git 验证，报告中附加警告
- escalated 且无基线时添加冷启动引导
- cost: 低，仅修改 `run.ts` 一个文件，测试微调

### Solution B: 完全移除 expanded 状态
- 在 `policy.ts` 中直接移除 `expanded` 状态
- 所有 `uncertain` 场景都视为 `stable`
- cost: 低，但失去上下文警告价值，不推荐

## Questions

无（全部决策已在 grill 完成）

## Sign-off

- [ ] product: by: ____ date: ____ ref: ____
- [ ] tech: by: ____ date: ____ ref: ____