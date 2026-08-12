# 范围

> 由 Sovei 阶段生成：scope
> Feature：030-feature-sub-changes

---

## 影响模块清单

### 1. engine/types.ts — 类型定义（核心改动）

- **入口**：被 state-machine.ts、workflow-engine.ts、event-store.ts 导入
- **改动**：新增 `SubChangeState` 接口；`WorkflowState` 新增 `subChanges: SubChangeState[]` 字段（默认 `[]`）；`WorkflowEvent` 联合新增 4 个子变更事件类型
- **既有压力**：无（类型文件，纯声明）
- **兼容**：`subChanges` 默认空数组，旧状态文件无此字段时初始化为 `[]`

### 2. engine/state-machine.ts — 状态机 reducer（核心改动）

- **入口**：被 workflow-engine.ts 调用 `reducer(state, event)`
- **改动**：新增 4 个事件的 reducer 分支：`SUBCHANGE_CREATED`、`SUBCHANGE_STAGE_PREPARE`、`SUBCHANGE_STAGE_COMPLETE`、`SUBCHANGE_MERGED`；`canExecuteStage` 新增子变更上下文重载
- **既有压力**：reducer 已是纯函数，扩展分支不破坏现有分支
- **兼容**：旧事件无 `subChangeId` 字段时，reducer 走现有分支（顶层状态）

### 3. engine/workflow-engine.ts — 工作流引擎（核心改动）

- **入口**：被 cli/commands/workflow.ts 调用 `prepareStage`/`completeStage`/`completeTask`
- **改动**：上述方法新增可选 `subChangeId` 参数；有参数时路由到子变更状态；`prepareStage('learn')` 新增聚合门禁检查；`completeStage('verify', feature, { subChangeId })` 后自动标记子变更 `merged`
- **既有压力**：文件 737 行，已有 `assertNoPendingChanges`/`archiveInvalidatedArtifacts` 等复杂逻辑
- **兼容**：无 `subChangeId` 参数时行为完全不变

### 4. engine/event-store.ts — 事件存储（中等改动）

- **入口**：被 workflow-engine.ts 调用 `appendEvent`/`replay`
- **改动**：`replay` 逻辑按 `event.subChangeId` 分桶还原子变更状态；事件序列化包含 `subChangeId` 字段
- **既有压力**：replay 是状态还原的核心，改动需谨慎
- **兼容**：旧事件 JSON 无 `subChangeId` 字段时，读取时默认为 `null`

### 5. artifacts/repository.ts — 产物仓库（中等改动）

- **入口**：被 workflow-engine.ts 调用读写产物
- **改动**：新增子变更产物路径构造 `sub-changes/<id>/<artifact>`；`getArtifactTemplate` 支持子变更级模板
- **既有压力**：无
- **兼容**：无子变更时走现有路径

### 6. cli/commands/feature.ts — Feature CLI（中等改动）

- **入口**：CLI `sovei feature <subcommand>`
- **改动**：新增 `feature split <feature>` 子命令（读取 spec+scope，输出拆分提议，用户确认后创建脚手架）；新增 `feature sub-change list <feature>` 子命令
- **既有压力**：已有 archive/summary 子命令，新增不冲突

### 7. cli/commands/workflow.ts — Workflow CLI（中等改动）

- **入口**：CLI `sovei workflow <stage> <feature>`
- **改动**：12 个阶段命令新增 `--sub-change <id>` 选项；`workflow status` 显示子变更进度
- **既有压力**：无

### 8. context/builder.ts — 上下文构建（轻量改动）

- **入口**：被 cli/commands/context.ts 调用
- **改动**：`buildContextPack` 新增 `--sub-change <id>` 选项；有子变更时聚焦父共享产物 + 当前子变更专属产物 + 其他子变更摘要
- **既有压力**：已有预算/过滤逻辑
- **兼容**：无 `--sub-change` 时退化为当前行为

---

## 不涉及的模块

- **change-control/**：子变更不复用 ChangeRequest，不改动
- **wayfinder/**：子变更共享父 Feature 的决策地图，不改动
- **knowledge/**：子变更不引入独立知识，不改动
- **preflight/**：代码合并冲突由现有 preflight 处理，不改动
- **skills/**：子变更继承父 Feature 的 skill-map，不改动
- **stale/**：过期感知基于 Feature 级，不改动

---

## 架构压力评估

| 模块 | 体积 | churn | 耦合 | 复杂度 | 升级治理? |
|---|---|---|---|---|---|
| engine/types.ts | 小 | 低 | 低 | 低 | 否 |
| engine/state-machine.ts | 中 | 中 | 中 | 中 | 否（纯函数扩展） |
| engine/workflow-engine.ts | 大 | 高 | 高 | 高 | **关注**（737 行，核心路径） |
| engine/event-store.ts | 中 | 中 | 中 | 中 | 否 |
| artifacts/repository.ts | 小 | 低 | 低 | 低 | 否 |
| cli/commands/feature.ts | 中 | 中 | 低 | 低 | 否 |
| cli/commands/workflow.ts | 中 | 中 | 低 | 低 | 否 |
| context/builder.ts | 中 | 低 | 中 | 中 | 否 |

> workflow-engine.ts 是唯一需关注的模块——改动集中在 `prepareStage`/`completeStage`/`completeTask` 的参数扩展 + learn 门禁，不重构现有逻辑，采用"参数可选 + 路由"模式最小化侵入。
