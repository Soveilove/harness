# Reconciliation: 030-feature-sub-changes Feature 拆分为多个子变更

## Need Translation

**PM 原话**：一个 feature 拆出几个大 change 开发的能力；AI 分析出多少就同步实现多，然后聚合；类似 OpenSpec/SpecKit + webplugin 的需求拆分模式，大 feature 多 agents 架构。

**技术理解**：
- 在不破坏现有 12 阶段线性工作流的前提下，为 Feature 增加可选的"子变更"维度
- 子变更是 Feature 内的可独立开发单元：共享 load→scope（理解与范围），各自走 plan→verify（开发与验证），父 Feature 聚合 learn→sync
- AI 在 scope 阶段分析并提议拆分方案（子变更划分 + 依赖图），用户确认后生效
- 子变更可并行推进（各自由不同 agent/会话驱动），受依赖图约束
- 不做实时 agent 调度——sovei 只管理状态与依赖，不调度 agent

## Current State

### 引擎是"一 Feature 一管线"线性模型

- `WorkflowState`（[types.ts:26-42](file:///d:/project/harness/packages/sovei-core/src/engine/types.ts)）只有一个 `currentStage` 游标，`activeChangeId` 是单值
- `canExecuteStage`（state-machine.ts:256-274）强制只能执行当前阶段
- 每 Feature 一条 `workflow-events.jsonl`，replay 还原单一状态
- 产物扁平：`change-manifest.md`/`tasks.md`/`evidence.md` 都是整 Feature 单份
- `feature` CLI 只有 archive/summary；`workflow` 无 split/sub-change

### 为什么是这样

- **Feature 015-workflow-version-semantics**：确立了 revision 语义——重大变更回退重走 + revision+1，不是派生并行线
- **Feature 020-quick-context-governance**：快速通道与完整工作流二选一，不叠加
- **Feature 022-context-budget-subagent**：跨 Feature 子代理并行读取，但这是"读"的并行，不是"开发"的并行
- **Feature 026-feature-archive**：归档白名单排除法，`_archive/` 子目录模式可复用
- **Feature 029-feature-summary**：事件流聚合，summary 从事件 + 产物生成——子变更 summary 可复用此模式
- **TECH_SHARING_MATERIAL_POLISHED.md:326-359**：项目自身已声明"任务负责人和泳道状态不是一等数据"

### change-control 的语义不匹配

`ChangeRequest`（change-control/schemas.ts:61-83）是"回退重开请求"（targetStage + 截断 + revision+1），`assertNoPendingChanges` 有 draft 时冻结整个 Feature。这与"派生并行子线"语义完全不同——子变更不是回退，是分叉。

## Solutions

### Solution A: 嵌入式子变更状态（采用）

**描述**：子变更状态嵌入父 `WorkflowState.subChanges` 数组，单状态文件 + 单事件流 + 事件加 `subChangeId` 字段。

**Schema 设计**：

```typescript
// engine/types.ts 新增
interface SubChangeState {
  id: string;              // SC-030-01
  name: string;            // kebab-case
  goal: string;            // 一句话目标
  dependsOn: string[];     // 依赖的子变更 id
  currentStage: string | null;  // plan..verify 之间
  completedStages: string[];
  completedTaskIds: string[];
  status: 'pending' | 'planning' | 'implementing' | 'verifying' | 'merged';
  createdAt: string;
}

// WorkflowState 扩展
interface WorkflowState {
  // ...现有字段不变
  subChanges: SubChangeState[];  // 新增，默认空数组
}
```

**事件类型新增**（所有带 `subChangeId` 字段，顶层事件为 null）：
- `SUBCHANGE_CREATED` — 创建子变更
- `SUBCHANGE_STAGE_PREPARE` — 子变更阶段准备
- `SUBCHANGE_STAGE_COMPLETE` — 子变更阶段完成
- `SUBCHANGE_MERGED` — 子变更完成 verify，合并到父

**产物布局**：
```
specs/<feature>/
├── load-summary.md          # 父共享
├── decision-log.md          # 父共享
├── wayfinder.*              # 父共享
├── spec.md                  # 父共享
├── reconciliation.md        # 父共享
├── scope.md                 # 父共享
├── sub-change-map.md        # 父产物（scope 阶段，可选）
├── sub-changes/
│   ├── SC-030-01/
│   │   ├── plan.md
│   │   ├── tasks.md
│   │   ├── change-manifest.md
│   │   ├── evidence.md
│   │   └── convergence-report.md
│   └── SC-030-02/
│       └── ...
├── learning-report.md       # 父聚合
└── sync-report.md           # 父聚合
```

**CLI 新增**：
- `feature split <feature>` — AI 分析 spec+scope，提议子变更，用户确认后创建
- `feature sub-change list <feature>` — 列出所有子变更及状态
- `workflow <stage> <feature> --sub-change <id>` — 在子变更上下文执行阶段
- `context build --sub-change <id>` — 聚焦子变更上下文

**cost**：
- 改动 `engine/types.ts`、`state-machine.ts`（新增 4 事件 reducer）、`workflow-engine.ts`（stage 执行路由到子变更）、`event-store.ts`（replay 分桶）、`artifacts/repository.ts`（子变更产物路径）、`cli/commands/feature.ts`（新增 split/sub-change）、`cli/commands/workflow.ts`（--sub-change 选项）、`context/builder.ts`（子变更聚焦）
- 预估改动：~8 个文件，新增 ~600 行，修改 ~200 行
- 风险：replay 兼容性（旧事件无 subChangeId）、canExecuteStage 的子变更上下文路由

### Solution B: 独立子变更状态文件（不采用）

**描述**：每个子变更独立 `sub-changes/<id>/state.yaml` + 独立事件流 `workflow-events.<subId>.jsonl`。

**cost**：
- 状态分散，原子性难保证（跨文件事务）
- replay 逻辑复杂（多文件合并时序）
- 文件 proliferation（N 子变更 = N 状态文件 + N 事件文件）
- 与 Feature summary/archive 的聚合逻辑冲突大

### Solution C: 轻量任务分组（不采用）

**描述**：子变更只是 implement 阶段的任务分组标签，不引入独立状态。

**cost**：无法支持独立 plan/converge/verify，不满足"大 change 独立开发验证"诉求

## Questions

### [tech] Q1: 子变更阶段执行如何路由到子变更状态？

- recommendation: `workflow-engine.ts` 的 `prepareStage`/`completeStage`/`completeTask` 接受可选 `subChangeId` 参数。有 `subChangeId` 时，操作路由到 `state.subChanges.find(sc => sc.id === subChangeId)` 的子状态；无时操作顶层状态（当前行为）。`canExecuteStage` 检查子变更的 `currentStage` 而非顶层。
- 已决（wayfind D-001/D-002）

### [tech] Q2: 事件 replay 如何分桶？

- recommendation: `event-store.ts` 的 `replay` 遍历事件流时，按 `event.subChangeId` 分桶：`subChangeId === null` 的事件作用于顶层状态，`subChangeId === 'SC-030-01'` 的作用于对应子变更状态。旧事件无 `subChangeId` 字段时视为 `null`（顶层）。
- 已决（wayfind D-002 + AC-6 兼容性）

### [tech] Q3: 聚合门禁如何实现？

- recommendation: `workflow-engine.ts` 的 `prepareStage('learn', feature)` 时，检查 `state.subChanges` 是否全部 `status === 'merged'`。有未 merged 的子变更时，prepare 失败并返回未完成清单。
- 已决（wayfind D-003）

### [tech] Q4: sub-change-map.md 的 AI 拆分如何触发？

- recommendation: `feature split <feature>` 命令读取 spec.md + scope.md，输出拆分提议（sub-change-map.md 草稿）。AI agent（IDE 侧）执行此命令后，基于输出的 spec/scope 内容分析并填充子变更划分，用户确认后落盘 + 创建脚手架。sovei CLI 本身不做 AI 分析——它提供数据输入和脚手架输出，AI 分析由宿主 agent 完成。
- 已决（wayfind D-004 + spec 边界"不调度 agent"）

### [product] Q5: 本 Feature 是否需要确认门禁？

- recommendation: 本 Feature 风险等级 S1（引擎核心改动），建议 spec 后走产品+技术确认门禁。但用户已授权自主推进，故标记为"自主决策通过"。
- 已决（用户授权）

## Sign-off

- [x] product: by: user (授权自主决策) date: 2026-08-12 ref: 用户"这些你决定吧...我没空理你"
- [x] tech: by: ai date: 2026-08-12 ref: decision-log.md Q1-Q5 全收敛 + wayfind D-001~D-005 全解决
