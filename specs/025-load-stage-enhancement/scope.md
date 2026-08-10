# 影响范围：load 阶段增强

> Feature：025-load-stage-enhancement

## 涉及文件

| # | 文件 | 变更类型 | 说明 |
|---|---|---|---|
| 1 | `packages/sovei-core/src/stages/index.ts` | 修改 | loadStage 定义：producesArtifacts + postExecute + prompt；grillStage：requiredArtifacts |
| 2 | `packages/sovei-core/src/knowledge/store.ts` | 修改 | TASK_TYPE_MAP['general'] 增加 code-map 和 rule |
| 3 | `packages/sovei-core/test/load-stage-enhancement.test.mjs` | 新增 | 测试：知识加载、产物契约、postExecute、grill 依赖 |

## 入口分析

### 代码入口

1. **loadStage 定义**（`stages/index.ts:19-58`）：
   - `producesArtifacts: []` → `['load-summary.md']`
   - 新增 `postExecute` 钩子
   - prompt 字符串更新

2. **grillStage 定义**（`stages/index.ts:63-112`）：
   - `requiredArtifacts: []` → `['load-summary.md']`
   - 影响：`prepareStage` 调用 `checkRequired` 时会校验 load-summary.md 存在

3. **TASK_TYPE_MAP**（`knowledge/store.ts:25-34`）：
   - `'general'` 数组增加两个元素

### 运行时入口

- `sovei workflow load <feature>` — prepare 时自动生成 load-summary.md 模板
- `sovei workflow load <feature> --complete` — postExecute 校验状态一致性
- `sovei workflow grill <feature>` — prepare 时校验 load-summary.md 存在

## 影响面

### 直接影响

| 模块 | 影响 | 风险 |
|---|---|---|
| `stages/index.ts` | loadStage 和 grillStage 定义变更 | 低 — 只增不减，向后兼容 |
| `knowledge/store.ts` | TASK_TYPE_MAP 扩展 | 低 — 只增加加载的知识类型 |
| `engine/workflow-engine.ts` | completeStage 对 load 的 postExecute 调用 | 低 — 框架已支持 postExecute 调用 |

### 间接影响

| 模块 | 影响 | 风险 |
|---|---|---|
| 已有 24 个 Feature | grill 的 requiredArtifacts 变更会影响已有 Feature 的 reopen | **中** — 已完成 sync 的 Feature 不受影响；卡在 in_progress 的 Feature reopen grill 时会要求 load-summary.md，需兼容处理 |
| `context/builder.ts` | load 阶段 context build 现在会加载 code-map 和 rule 知识 | 低 — 增加知识条目数量，但有预算截断保护 |
| 测试基线 | 新增测试 + 可能需要调整现有测试 | 低 |

## 兼容性处理

### 已有 Feature 的 grill requiredArtifacts 变更

grill 的 `requiredArtifacts` 从 `[]` 变为 `['load-summary.md']`。已完成 sync 的 Feature 不受影响（不会重新 grill）。卡在 in_progress 的 Feature（002/009/012/015-learn-reconcile-verify）如果需要 reopen grill，会要求 load-summary.md。

**处理策略**：checkRequired 校验失败时给出明确提示「load-summary.md 是 Feature 025 新增的必需产物，请补写后重试」。不做自动生成——手动补写更安全。

## 验证面

| # | 验证项 | 方法 |
|---|---|---|
| 1 | TASK_TYPE_MAP['general'] 包含 code-map 和 rule | 单元测试 |
| 2 | loadStage.contract.producesArtifacts 包含 load-summary.md | 单元测试 |
| 3 | loadStage.postExecute 存在且正常执行 | 单元测试 |
| 4 | grillStage.contract.requiredArtifacts 包含 load-summary.md | 单元测试 |
| 5 | load prompt 包含探索方法论关键词 | 单元测试 |
| 6 | prepare load 生成 load-summary.md 模板 | 集成测试 |
| 7 | complete load 通过 postExecute | 集成测试 |
| 8 | 全部测试通过 | `node scripts/test.mjs` |
