# 收敛报告

> Feature: 020-quick-context-governance
> 阶段: converge

## 差距分类

对照 Spec、Scope、Plan、Tasks 与 Change Manifest，逐一核对了 020 的实现。所有声明的产物均已落地，未发现 missing / partial / contradicts 差距；存在若干按规格有意延后（unrequested / deferred）项，已记录如下。

| 发现 | 分类 | 证据 | 处置 |
|---|---|---|---|
| QuickRun 六阶段状态机与终态规则 | 已满足 | `src/quick/types.ts`（createQuickRun/transitionQuickRun/finishQuickRun/interruptQuickRun），`quick-contract.test.mjs` 覆盖跳步拒绝、升级后不可继续、中断原因保留 | 无 |
| append-only Usage Recorder + unknown/null token 语义 | 已满足 | `src/quick/usage.ts`，`UsageTokenSchema` 允许 null，`unknownTokenUsage()`；`usage-git.test.mjs` 验证初始化一次、追加不覆盖、interrupted 识别 | 无 |
| 只读 Git baseline/diff 验证 + 越界报告 | 已满足 | `src/quick/git-verifier.ts`（execFile 不 shell 拼接），真实临时 Git 仓库测试覆盖 in-scope / out-of-scope / not-a-repository / baseline-unreadable | 无 |
| Context Policy full/scoped/index+on-demand 影子解释 | 已满足 | `src/context/policy.ts`，`buildContextPolicy` 保留 actual=full、compatibility=preserved；`context-policy.test.mjs` 覆盖全局红线保留 | 无 |
| `sovei quick` CLI 六步闭环与升级/越界报告 | 已满足 | `src/cli/commands/quick.ts` + `src/quick/run.ts`；`quick-cli.test.mjs` 覆盖 escalate / completed / stopped 三态 | 无 |
| usage 初始化 + gitignore 兼容路径 | 已满足 | `src/cli/commands/project.ts`（writeIfAbsent + 保留历史），`quick-cli.test.mjs` 验证 --force 不清空历史 | 无 |
| 全链路回归（check + 121 tests） | 已满足 | `pnpm check` 通过；`pnpm test` 121/0；020 相关 12 个测试全绿 | 无 |

## 修正与重开记录

本次实施过程中修复了提交 `0fed844` 携带的两个导致 `check` 必失败的缺陷：
1. `src/quick/usage.ts`：`UsageBaseSchema` 定义缺少 `z.object({` 前缀，语法错误 TS1005 → 已补齐。
2. `src/engine/workflow-engine.ts`：`prepareStage` 调用未实现的 `recordContextObservation`（TS2339）→ 已实现（影子观测，try/catch 静默，不阻断阶段准备）。

无实现差距需返回 tasks，无契约差距需重开更早阶段。

## 架构健康检查

- **热点加剧**：Quick 通道与标准 workflow 共用 `buildContextPolicy`，属于既定的统一治理目标（决策 D3），未向既有模块新增职责。
- **依赖循环**：Quick/usage/git-verifier 仅依赖 context/change-control/rules/storage 现有模块，未引入新循环。
- **责任归属**：`src/quick/` 独立承载快速通道运行时，避免污染普通 workflow state（quick 不写 workflow-events，已由测试断言）。

## 未请求/按规格延后（unrequested / deferred）

| 项 | 说明 |
|---|---|
| 标准 workflow 切换为 scoped 交付 | 规格 D5 明确先观测、后受控实验；actual 保持 full。 |
| usage 导出 / 计费 / telemetry | 规格明确不纳入首版。 |
| 自动回滚 | 越界时停止并报告未验证项，不自动回退。 |

## 结论

无未关闭的高严重度发现，converge 阶段满足完成条件。
