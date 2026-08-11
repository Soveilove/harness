# Feature 015 — Reconciliation

## 1. PM 需求翻译

| PM 需求 | 技术理解 |
|---|---|
| "workflow.version 是对的吗" | 值与源码一致（2.0.0），但字段本身无运行时语义 |
| "走工作流修复" | 用 Sovei 12 阶段工作流处理，产出代码变更 |

## 2. 当前状态还原

`workflow.version` 从 CLI 2.0.0（2026-07-16 TypeScript 重写）设定以来从未被修改。期间经历了：

- 2.2.0：确认门系统添加 — 硬编码在 `state-machine.ts:76-92`，不在 `WorkflowDefinition` 中
- 2.3.2：spec 阶段补 `wayfinder.md` 依赖 + `reconciliation.md` 产物 — 修改了 `DEFAULT_WORKFLOW.stages.spec`，但这是修 bug（拓扑断链），旧 Feature replay 不受影响
- 2.5.x：Skills 子系统 — 通过构造函数 `skillResolver` 参数注入，旁路 `WorkflowDefinition`

结论：`WorkflowDefinition` 的**结构**（stageOrder + 12 stages + maxStagesPerInvocation + allowChaining）从 2.0.0 至今确实未变，version 不需要 bump。

## 3. 解决方案与成本

### 方案 A: 仅加 warning + 文档（推荐）

- `loadConfig` 添加 mismatch warning（~10 行）
- 补充 JSDoc（~15 行注释）
- 成本：低，不引入新机制，不破坏现有行为
- 覆盖：未来 version 变更时可被感知

### 方案 B: 加 warning + migration 注册表

- 额外实现 `WorkflowMigrationRegistry`，按 version 区间注册迁移函数
- 成本：中，引入新抽象
- 必要性：低 — workflow.version 不持久化到 Feature 事件中，事件回放始终用当前 `WorkflowDefinition`，不存在"旧版本事件需要迁移"的场景

### 方案 C: 只加文档，不加 warning

- 成本：最低
- 缺点：mismatch 仍静默，用户不会注意到

**选择方案 A。**

## 4. 确认问题

### 产品确认
- 无需产品确认（S1 风险，无 UI / 用户体验影响）

### 技术确认
- 无需技术确认（S1 风险，不涉及架构决策、红线变更或 CLI 契约修改）
