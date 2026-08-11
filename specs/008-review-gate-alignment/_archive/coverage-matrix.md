# 覆盖矩阵

> 由 Sovei 阶段生成：scope
> Feature：008-review-gate-alignment

| 必需覆盖 | 证据 | 状态 |
|---|---|---|
| **入口/路由** | 修改入口为 `AGENTS.md`（文档）；无代码入口。 | 已覆盖 |
| **UI 状态** | 不涉及 UI。 | N/A |
| **store/service** | 不涉及。 | N/A |
| **参数** | 无参数变化。 | N/A |
| **API** | 不改 `confirmGate`/`overrideConfirmation`/`state-machine`/`governance` API。 | 已覆盖 |
| **鉴权/计费** | 不涉及。 | N/A |
| **异步回调** | 不涉及。 | N/A |
| **成功/失败/清理** | 文档修改无运行时成功/失败。 | 已覆盖 |
| **历史/详情/重试** | 已 completed feature 不受影响。 | 已覆盖 |
| **兼容入口** | `workflow confirm` 与 `review-pack import` 行为不变。 | 已覆盖 |
| **测试/文档/运行时证据** | 需人工阅读 AGENTS.md 验证澄清内容；运行时 confirm 流程不变。 | 已覆盖 |

## 明确不覆盖
- 所有源码与命令行为
- 门禁触发/确认逻辑
- 任何强制校验

## 结论
影响面封闭：仅 `AGENTS.md` 文档更新。`harness/index.md` 无相关说明，无需改动。
