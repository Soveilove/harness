# 影响范围

> 由 Sovei 阶段生成：scope
> Feature：008-review-gate-alignment

## 修改入口

1. `AGENTS.md` 第 24-38 行：补充确认门禁与 review-pack 的关系澄清。
2. `harness/index.md`：如有门禁/review 相关说明则对齐；如无则确认现状无需改。

## 消费者与影响

### AGENTS.md 修改点
- **第 24-28 行（Confirmation Gates）**：在现有说明基础上补充：
  - 确认依据是阶段产物（evidence.md / reconciliation.md），非 review 文件。
  - `workflow confirm` 是标准确认路径，`review-pack import` 是便捷的产品确认入口，二者等效。
- **第 30-38 行（Reconciliation）**：补充说明 review-pack 是**可选**的深入对齐工具，不强制作为门禁前置。

### harness/index.md 影响
- 需核查 index.md 中是否已有门禁/review-pack 说明，有则对齐，无则不动。

## 明确不覆盖
- 源码：`confirmGate`、`overrideConfirmation`、`state-machine.ts`、`workflow.ts`、`governance.ts`。
- 命令、阶段定义、产物契约、门禁触发逻辑。
- 任何强制校验逻辑。

## 架构压力记录
- 无。本 Feature 仅消除文档-实现脱节，不新增债务。

## 兼容路径
- 文档修改不影响任何运行时行为。
- 已 completed feature（001-008）不受影响。
