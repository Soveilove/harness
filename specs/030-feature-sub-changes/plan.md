# 实现计划

> 由 Sovei 阶段生成：plan
> Feature：030-feature-sub-changes

---

## 1. 模块边界与改动顺序

按依赖关系从底层到上层：

```
Layer 1: 类型定义        engine/types.ts          (SubChangeState + 4 事件类型)
Layer 2: 状态机          engine/state-machine.ts   (4 事件 reducer + canExecuteStage 重载)
Layer 3: 事件存储        engine/event-store.ts     (replay 分桶 + subChangeId 序列化)
Layer 4: 产物仓库        artifacts/repository.ts   (子变更产物路径)
Layer 5: 工作流引擎      engine/workflow-engine.ts (subChangeId 路由 + 聚合门禁)
Layer 6: CLI 命令        cli/commands/feature.ts   (split + sub-change list)
                        cli/commands/workflow.ts  (--sub-change 选项)
                        cli/commands/context.ts   (--sub-change 选项)
Layer 7: 上下文构建      context/builder.ts        (子变更聚焦)
Layer 8: 测试            test/sub-change.test.mjs  (新增)
```

每层改动依赖下层完成。Layer 1-3 是数据层，Layer 4-5 是引擎层，Layer 6-7 是接口层，Layer 8 是验证层。

---

## 2. 状态/数据流

### 2.1 创建子变更流

```
feature split <feature>
  → 读取 spec.md + scope.md
  → 输出拆分提议（sub-change-map.md 草稿，AI 填充）
  → 用户确认
  → appendEvent(SUBCHANGE_CREATED) × N
  → 创建 sub-changes/<id>/ 脚手架
  → 更新 workflow-state.yaml (subChanges 数组)
```

### 2.2 子变更阶段推进流

```
workflow plan <feature> --sub-change SC-030-01
  → prepareStage('plan', feature, { subChangeId: 'SC-030-01' })
    → 检查依赖：dependsOn 中的子变更是否 merged
    → 检查子变更 currentStage === null（首次）或上一阶段完成
    → appendEvent(SUBCHANGE_STAGE_PREPARE, { subChangeId })
  → AI 填充 sub-changes/SC-030-01/plan.md
  → completeStage('plan', feature, { subChangeId })
    → appendEvent(SUBCHANGE_STAGE_COMPLETE, { subChangeId })
    → 子变更 currentStage 推进到 tasks
```

### 2.3 聚合门禁流

```
workflow learn <feature>
  → prepareStage('learn', feature)  // 无 subChangeId
    → 检查 state.subChanges 全部 status === 'merged'
    → 有未 merged → 失败，返回未完成清单
    → 全部 merged → 通过，父 Feature 进入 learn
```

### 2.4 事件 replay 分桶

```
replay(events)
  → state = initialState (subChanges: [])
  → for event in events:
      if event.subChangeId === null or undefined:
        state = reducer(state, event)           // 顶层
      else:
        state = reducer(state, event)           // reducer 内部按 subChangeId 路由
  → return state
```

reducer 处理子变更事件时，定位 `state.subChanges.find(sc => sc.id === event.subChangeId)` 并更新其字段。

---

## 3. 契约定义

### 3.1 SubChangeState（types.ts）

```typescript
interface SubChangeState {
  id: string;                    // SC-030-01
  name: string;                  // kebab-case
  goal: string;                  // 一句话目标
  dependsOn: string[];           // 依赖的子变更 id
  currentStage: string | null;   // plan|tasks|implement|converge|verify|null
  completedStages: string[];
  completedTaskIds: string[];
  status: 'pending' | 'planning' | 'implementing' | 'verifying' | 'merged';
  createdAt: string;             // ISO
}
```

### 3.2 新增事件类型（types.ts）

所有事件继承基础 `subChangeId: string | null` 字段：

- `SUBCHANGE_CREATED` — `{ type, subChangeId, name, goal, dependsOn, createdAt }`
- `SUBCHANGE_STAGE_PREPARE` — `{ type, subChangeId, stage }`
- `SUBCHANGE_STAGE_COMPLETE` — `{ type, subChangeId, stage }`
- `SUBCHANGE_MERGED` — `{ type, subChangeId, mergedAt }`

### 3.3 sub-change-map.md schema

```yaml
---
feature: 030-feature-sub-changes
createdAt: 2026-08-12
---
sub-changes:
  - id: SC-030-01
    name: sub-change-name
    goal: "一句话目标"
    dependsOn: []
    status: pending
```

### 3.4 CLI 契约

| 命令 | 参数 | 输出 |
|---|---|---|
| `feature split <feature>` | feature id | 读取 spec+scope，输出拆分提议草稿，用户确认后创建 |
| `feature sub-change list <feature>` | feature id | 表格：id/name/status/currentStage/dependsOn/blocked |
| `workflow <stage> <feature> --sub-change <id>` | stage, feature, sub-change id | 在子变更上下文执行阶段 |
| `context build --feature <f> --stage <s> --sub-change <id>` | feature, stage, sub-change | 聚焦子变更的上下文包 |

---

## 4. 迁移策略（向后兼容）

### 4.1 状态文件兼容

- `workflow-state.yaml` 读取时，`subChanges` 字段缺失则初始化为 `[]`
- 现有 Feature（001-029）的状态文件无需修改

### 4.2 事件流兼容

- 旧事件 JSON 无 `subChangeId` 字段时，反序列化默认为 `null`（顶层事件）
- replay 时 `null` 走顶层 reducer 分支，行为与当前完全一致

### 4.3 CLI 兼容

- 所有新选项（`--sub-change`）都是可选的
- 不带 `--sub-change` 的命令行为完全不变
- `feature split` 是新命令，不影响现有 `feature archive`/`feature summary`

### 4.4 产物兼容

- 无子变更的 Feature 不产生 `sub-change-map.md` 和 `sub-changes/` 目录
- `feature archive` 的白名单排除法需加入 `sub-changes/` 到保留列表

---

## 5. 验证方式

### 5.1 单元测试（新增 test/sub-change.test.mjs）

- 子变更创建：SUBCHANGE_CREATED 事件正确更新 subChanges 数组
- 子变更阶段推进：SUBCHANGE_STAGE_PREPARE/COMPLETE 正确更新 currentStage
- 依赖约束：有未 merged 依赖时 prepareStage(plan) 失败
- 聚合门禁：有未 merged 子变更时 prepareStage(learn) 失败
- 子变更合并：completeStage(verify) 后 status 变为 merged
- replay 分桶：混合顶层 + 子变更事件正确还原状态
- 向后兼容：旧格式事件（无 subChangeId）replay 结果与当前一致

### 5.2 现有测试不破坏

- 192 个现有测试全部通过（无子变更路径不变）

### 5.3 集成验证

- 创建测试 Feature → split → 两个子变更并行推进 → 聚合门禁 → learn→sync
