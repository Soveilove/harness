# 技术方案：load 阶段增强

> Feature：025-load-stage-enhancement

## 模块边界

| 模块 | 变更范围 | 职责 |
|---|---|---|
| `stages/index.ts` | loadStage + grillStage 定义 | 阶段契约（产物/依赖/校验/prompt） |
| `knowledge/store.ts` | TASK_TYPE_MAP | 知识加载类型映射 |
| `test/load-stage-enhancement.test.mjs` | 新文件 | 测试覆盖 |

## 数据流

```
sovei workflow load <feature> --complete
  → prepareStage: preExecute(loadByTaskType('general'))
    → TASK_TYPE_MAP['general'] 现在返回 ['constitution','preference','architecture','code-map','rule']
    → knowledge.load() 加载 5 个 JSON 文件
  → execute: 返回 prompt（含探索方法论）
  → AI agent 根据 prompt 写 load-summary.md
  → completeStage: 
    → validateProduced(['load-summary.md']) — 校验文件存在且非模板
    → postExecute: 校验 workflow-state 一致性

sovei workflow grill <feature>
  → prepareStage: checkRequired(['load-summary.md']) — 校验 load-summary.md 存在
  → preExecute: loadByTaskType('decision-making')
  → execute: 返回 grill prompt
```

## 契约变更

### loadStage 契约

```typescript
// Before
contract: {
  requiredArtifacts: [],
  producesArtifacts: [],
},
// After
contract: {
  requiredArtifacts: [],
  producesArtifacts: ['load-summary.md'],
},
```

### grillStage 契约

```typescript
// Before
contract: {
  requiredArtifacts: [],
  producesArtifacts: ['decision-log.md'],
},
// After
contract: {
  requiredArtifacts: ['load-summary.md'],
  producesArtifacts: ['decision-log.md'],
},
```

### TASK_TYPE_MAP

```typescript
// Before
'general': ['constitution', 'preference', 'architecture'],
// After
'general': ['constitution', 'preference', 'architecture', 'code-map', 'rule'],
```

## postExecute 设计

```typescript
async postExecute(ctx) {
  // 校验 workflow-state 一致性
  const state = ctx.workflowState;
  if (!state.featureId) throw new Error('workflow-state missing featureId');
  if (state.revision < 0) throw new Error(`invalid revision: ${state.revision}`);
  // currentStage 在 completeStage 已推进，不在此校验
}
```

## prompt 增强

load prompt 从纯状态校验扩展为包含三个操作维度：
1. **状态校验**（保留原有）：校验 Feature 状态、版本匹配、产物冲突
2. **现状探索**（新增）：主动读取代码库关键文件，理解架构、模块、入口
3. **风险识别**（新增）：识别与当前 Feature 可能相关的风险点

## 迁移策略

无数据迁移。变更仅涉及 TypeScript 源码（阶段定义 + 知识映射），不修改持久化 schema。

### 向后兼容

- 已完成 sync 的 Feature 不受影响
- 卡在 in_progress 的 Feature reopen grill 时会要求 load-summary.md——给出明确错误提示，手动补写
- TASK_TYPE_MAP 扩展是增量的，已有知识加载不受影响

## 验证方式

1. 单元测试（新增 `test/load-stage-enhancement.test.mjs`）
2. 集成测试（bootstrap 新 Feature 走完整流程）
3. 全量测试通过（173 + 新增）
