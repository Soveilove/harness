# Load Summary — 026-feature-archive

## 代码库现状摘要

### 项目结构
- **CLI 入口**：`packages/sovei-core/src/cli/index.ts` 注册所有命令模块（workflow/workspace/governance/knowledge/rules/skills/adapters/context/quick/project/agent/architecture/wayfinder）
- **命令注册模式**：每个模块导出 `registerXxxCommands(program: Command): void`，在 `cli/index.ts` 中调用
- **存储抽象**：`StorageBackend` 接口（`storage/types.ts`）提供 `read/write/delete/list/listRecursive` 方法，`FilesystemStorage` 实现
- **Feature 路径**：`config/loader.ts` 的 `getFeaturePath(config, featureId)` → `specs/{featureId}`，`getFeatureFullPath` → 绝对路径
- **DI 容器**：`providers/container.ts` 提供 `container.inject<T>(TOKENS.Storage)` 和 `container.inject<Logger>(TOKENS.Logger)`

### 已有归档逻辑
- **`engine/workflow-engine.ts` L671-710**：私有方法 `archiveInvalidatedArtifacts`，在 `reopen`/`applyChange` 时被调用
  - 归档路径：`{featurePath}/history/revision-{N}/{reasonDirectory}/`
  - 语义：读取 → 写入 history 目录 → 删除原文件（移动语义）
  - 只归档 stage 产物（从 stageRegistry 的 contract.producesArtifacts 推导），不归档 decision-log/workflow-state 等持久文件
- **`change-control/` 模块**：重大变更控制，`applyChange` 调用 `archiveInvalidatedArtifacts` 归档被失效的产物

### Feature 目录典型内容（以 022 为例）
```
specs/022-context-budget-subagent/
  workflow-state.yaml          ← 持久状态
  workflow-events.jsonl        ← 事件流
  decision-log.md              ← 决策记录（人可读）
  wayfinder.json               ← 决策地图
  wayfinder-events.jsonl       ← 决策事件
  wayfinder.md                 ← 决策地图人可读
  load.md / load-summary.md    ← load 产出
  reconciliation.md            ← spec 产出
  scope.md                     ← scope 产出
  plan.md                      ← plan 产出
  tasks.md                     ← tasks 产出
  spec.md                      ← spec 产出
  evidence.md                  ← verify 产出
  convergence-report.md        ← converge 产出
  coverage-matrix.md           ← verify 产出
  change-manifest.md           ← implement 产出
  learning-report.md           ← learn 产出
  knowledge-delta.md           ← learn 产出
  sync-report.md               ← sync 产出
  history/                     ← 已有归档目录（reopen/change 时产生）
```

### 与当前 Feature 相关的已有实现
- **`workspace.ts`**：`workspace` 命令组，有 `register/list/sync/promote/preflight/unregister` 子命令。`feature archive` 是新的顶层命令组，不放在 workspace 下（语义不同：workspace 管理多工作区，feature 管理 Feature 生命周期）
- **`workflow.ts`**：`workflow` 命令组，有 `bootstrap/status/reopen/change/confirm/override-confirm/list-stages` + 12 阶段命令。`feature archive` 不放在 workflow 下（archive 是 Feature 管理操作，不是工作流阶段操作）
- **没有 `feature.ts` 命令文件**——需要新建

### Stage 产物契约（来自 stageRegistry）
从 `stages/` 目录的各阶段定义可以推导出哪些文件是"过程产物"（可归档），哪些是"持久文件"（不可归档）：

**持久文件（必须保留在顶层）**：
- `workflow-state.yaml` — 工作流状态
- `workflow-events.jsonl` — 事件流
- `decision-log.md` — 决策记录
- `wayfinder.json` / `wayfinder-events.jsonl` / `wayfinder.md` — 决策地图
- `sync-report.md` — sync 产出（Feature 完成的最终标志）

**过程产物（可归档到 _archive/）**：
- `load-summary.md` — load 产出
- `reconciliation.md` — spec 产出
- `scope.md` — scope 产出
- `plan.md` — plan 产出
- `tasks.md` — tasks 产出
- `spec.md` — spec 产出
- `change-manifest.md` — implement 产出
- `evidence.md` — verify 产出
- `convergence-report.md` — converge 产出
- `coverage-matrix.md` — verify 产出
- `learning-report.md` — learn 产出
- `knowledge-delta.md` — learn 产出

## 潜在风险点

1. **cross-feature 引用**：`context build --cross-feature` 读取其他 Feature 的 `decision-log.md`。归档后 decision-log 保留在顶层，不受影响。但 `context build` 也读取 Feature 下的所有 `.md` 产物（required 项），如果过程产物被移到 `_archive/`，`storage.list` 可能扫不到它们——需确认 `list` 是否递归
2. **`redline-scanner.ts`** 枚举 `specs/` 下所有 Feature 的 `.md`/`.yaml` 文件提取约束——如果归档后的文件仍在 Feature 目录下（`_archive/` 子目录），scanner 可能重复扫描。需检查 `list` 是否递归
3. **`history/` 目录已存在**：现有 `archiveInvalidatedArtifacts` 在 reopen/change 时已使用 `history/` 目录。新归档用 `_archive/` 避免冲突
4. **幂等性**：多次运行 `feature archive` 不应报错——已归档的文件跳过，未归档的继续归档
5. **状态检查**：应只对 `completed` 状态的 Feature 执行归档，避免归档进行中的 Feature
6. **FilesystemStorage.list()** 的已知 bug（Feature 022 修过）：`list` 不返回子目录。归档时如果 `_archive/` 目录不存在需先创建
