# 同步报告

> 由 Sovei 阶段生成：sync
> Feature：030-feature-sub-changes（Feature 拆分为多个子变更）

---

## 同步目标

| # | 目标 | 类型 | 说明 |
|---|---|---|---|
| 1 | `packages/sovei-core/src/engine/types.ts` | 代码 | 新增 SubChangeState 接口、WorkflowState.subChanges 字段、4 个子变更事件类型 |
| 2 | `packages/sovei-core/src/engine/state-machine.ts` | 代码 | createInitialState 初始化 subChanges；reducer 4 个子变更 case；aggregationGate 函数 |
| 3 | `packages/sovei-core/src/engine/event-store.ts` | 代码 | subChanges YAML 序列化/解析 |
| 4 | `packages/sovei-core/src/engine/workflow-engine.ts` | 代码 | 子变更路由 + 聚合门禁 + splitFeature/listSubChanges |
| 5 | `packages/sovei-core/src/artifacts/repository.ts` | 代码 | getSubChangePath helper |
| 6 | `packages/sovei-core/src/cli/commands/feature.ts` | 代码 | feature split + feature sub-change list + sub-change-map.md 加入 PERSISTENT_FILES |
| 7 | `packages/sovei-core/src/cli/commands/workflow.ts` | 代码 | 12 阶段 --sub-change 选项 |
| 8 | `packages/sovei-core/src/cli/commands/context.ts` | 代码 | --sub-change 选项（子变更聚焦上下文） |
| 9 | `packages/sovei-core/src/stages/index.ts` | 代码 | scope 阶段提示契约新增"拆分评估"段（P0-A） |
| 10 | `packages/sovei-core/test/sub-change.test.mjs` | 测试 | 13 个单元测试覆盖子变更全生命周期 |
| 11 | `harness/project/knowledge/` | 知识库 | 3 个 candidate 知识条目新增（嵌入式子状态、聚合门禁、AI 自主评估提示） |

## 受保护文件

- `packages/sovei-core/dist/release/sovei.cjs` — 发布产物，由 build 重新生成，不在本 sync 直接写入
- `packages/sovei-core/README.md` — 发布说明，由 N5（开源 + README 重写）单独处理
- 现有 Feature 001-029 的产物和状态文件 — 不受影响（向后兼容）

## 同步前后差异

### 同步前

- 引擎不支持 Feature 拆分：所有 Feature 走单管线 12 阶段
- 无子变更概念、无 splitFeature API、无 `feature split` CLI
- scope 阶段提示无"拆分评估"段，AI 不能自主建议拆分

### 同步后

- 引擎支持 Feature 拆分：scope 后可拆分为多个子变更，子变更独立推进 plan→verify，全部 merged 后聚合 learn→sync
- 新增 `SubChangeState` 数据结构、4 个子变更事件类型、`aggregationGate()` 门禁纯函数
- 新增 CLI：`feature split <id> [--json]`、`feature sub-change list <id> [--json]`、`workflow <stage> --sub-change <id>`、`context build --sub-change <id>`
- scope 阶段提示契约含"拆分评估"段（P0-A）：AI 在 scope 完成后可主动建议运行 `feature split --json` 获取提议契约

### 命令结果

| 命令 | 结果 |
|---|---|
| `pnpm run sovei:build` | ✅ 构建成功（dist/release/sovei.cjs 重新生成） |
| `node --test "test/**/*.test.mjs"` | ✅ 205/205 全部通过（原 192 + 新增 13），零回归 |

## 跳过目标

- 无。所有授权目标均已同步。

## 验证结论

- ✅ 所有授权目标通过同步后检查
- ✅ 测试基线从 192 → 205（新增 13 个子变更测试），零回归
- ✅ 向后兼容验证通过：旧 Feature（001-029）和未 split 的新 Feature 行为不变
- ✅ P0-A 已落地：scope 阶段提示契约含"拆分评估"段，AI 可自主触发拆分
- ✅ 知识库新增 3 个 candidate 条目（learn 阶段已对账入库）

工作流可标记为 completed，next_stage 为 null。
