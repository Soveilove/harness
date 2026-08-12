# Feature Summary — P2-7-quick-overdefense-fix

> 由 `sovei feature summary` 生成。

## 概览

- **状态**: completed
- **风险等级**: S1
- **阶段进度**: 12/12（load → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync）
- **任务完成**: 2
- **门禁覆盖**: 2

## 需求

1. `quick` 命令在 `status='expanded'` 时**不再阻塞**，而是继续执行 git diff 验证并在报告中附加上下文相关性警告
2. `quick` 命令支持 `--paths` 传入 2 个及以上路径（当前仅允许恰好 1 个）
3. `quick` 命令 escalated 时若无基线 commit，报告中包含冷启动引导信息
4. 所有现有测试继续通过，`quickCLI` 集成测试中 escalated 无 `--paths` 的场景行为不变

## 关键决策

### D1: 不阻塞。`expanded` 表示"上下文相关性不确定"（有未命中的红线/规则候选），但 Git diff 验证与上下文相关性无关。应降级为警告而非硬性 escalated。

- **决策**: 不阻塞。`expanded` 表示"上下文相关性不确定"（有未命中的红线/规则候选），但 Git diff 验证与上下文相关性无关。应降级为警告而非硬性 escalated。
- **理由**: 当前 `run.ts` L148-151 将 `expanded` 作为 escalated 条件，导致几乎所有带 `--paths` 的 quick 调用都 escalated，从未走到 git 验证。`expanded` 的本质是"上下文可能有遗漏"，不是"不能实施"。
- **被拒绝方案**: - 保持现状（过度防御，用户体验差，几乎必然 escalated）

### D2: 改为 `declaredPaths.length === 0`。0 paths 时确实无法确定范围需要 escalation，但 2+ paths 应正常工作。

- **决策**: 改为 `declaredPaths.length === 0`。0 paths 时确实无法确定范围需要 escalation，但 2+ paths 应正常工作。
- **理由**: 多文件修改场景（如同时改 `src/foo.ts` 和 `src/bar.ts`）是合法的 quick 场景，不应被阻断。
- **被拒绝方案**: 保持 `!== 1`（过度严格，误伤多文件场景）

### D3: 当 escalated 且 `baselineRevision` 为 null 时，在 report 中添加冷启动引导。

- **决策**: 当 escalated 且 `baselineRevision` 为 null 时，在 report 中添加冷启动引导。
- **理由**: 用户看到 `git: null` 容易误解为"无 commit 导致 escalated"，实际根因是 `needsEscalation` 提前拦截。引导用户创建基线 commit 可提升首次体验。
- **被拒绝方案**: 保持模糊 escalated 消息（用户困惑，dev backlog 指出问题）

### D4: 在 report 中添加 `contextWarning`，说明上下文相关性不确定，建议人工确认。不阻塞流程。

- **决策**: 在 report 中添加 `contextWarning`，说明上下文相关性不确定，建议人工确认。不阻塞流程。
- **理由**: 用户仍然能获得 git diff 验证结果，上下文警告作为补充信息而非阻断条件。
- **被拒绝方案**: 忽略 expanded（失去警告价值）；在 `--json` 中通过 `policy.controlPlane.status` 传递（间接，不够显式）

## 变更

TASK-001: 重构 run.ts needsEscalation 逻辑 — 移除 `status === 'expanded'` 阻塞条件，`declaredPaths.length !== 1` 改为 `=== 0`，添加冷启动引导和 expanded 上下文警告
TASK-002: 更新测试用例 — 验证 expanded 不再 escalated，冷启动引导正确输出

## 验证

- **verify**（product）: Small technical fix, all 179 tests pass, no user-facing behaviour change beyond improvement
- **verify**（tech）: All 179 tests pass, code review confirms spec compliance, no regression

## 经验

*见 learning-report.md / knowledge-delta.md*

## 结论

✅ 全部就绪，可完成 Feature
