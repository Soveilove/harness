# Reconciliation: 001-scanner-polish 业务地图/红线扫描算法打磨

## Need Translation

| PM 原话 | 技术理解 |
|---|---|
| "红线 ID 翻倍" | `redline-scanner.ts` 的 `scanCodeSurfaces` Step 3 把命中文件名嵌入红线标题，`makeId` 按 `(category, title)` 派生 ID，导致同一逻辑红线在 N 个文件上产生 N 个不同 ID。修复：按 pattern 聚合去重，标题不带文件名，`source` 聚合命中文件。 |
| "单包检测" | `scanner.ts` 的 `discoverPackages` 只匹配 `packages/<一层>/package.json` 单一形态。修复：按多源 workspace 配置（根 `package.json` workspaces / `pnpm-workspace.yaml` / `lerna.json`）发现并展开包，扩展目录名集合。 |
| "rescan 冗余" | `project.ts` 的 `rescan` 是 `onboard` 的纯别名，每次全量重扫。修复：浅层增量——按 git diff 裁剪重扫范围 + 用 M2 稳定 ID 复用未变候选。 |
| "留到单独打磨轮" | 三个问题作为一个 Feature 的三组任务推进，不过度拆分为独立 Feature。 |

## Current State

### 代码现状（已查证）
- **`redline-scanner.ts:350-362`**：`scanCodeSurfaces` Step 3 标题构造 `pattern.title + ' (' + file.path.split('/').pop() + ')'`，每文件一条候选。
- **`redline-scanner.ts:378-382`**：`makeId(category, title)` 按 `(category, title)` 派生 ID；`add()`（`:123-128`）只按 ID 去重。
- **`redline-scanner.ts:299-341`**：Step 2 结构性红线标题固定，ID 稳定，不受影响。
- **`scanner.ts:265`**：`discoverPackages` 用 `/^packages\/[^/]+\/package\.json$/`，仅匹配单层 `packages/`。
- **`project.ts:452-462`**：`rescan` 与 `onboard` 同体调 `runOnboardScan`，全量重扫、整体覆写。
- **`business-map-scanner.ts:147-155`**：逐个 `capability.redlineCandidateIds.add(redline.id)`，受 M2 传导自动收敛。

### 为什么是这样
- 红线扫描器最初设计时，代码面红线用 per-file 粒度以便定位证据文件。但随着项目规模增长，60 个文件命中同一 pattern 会产生 60 条近似候选，反而降低人工审查效率。
- `discoverPackages` 的单一正则是为简单 monorepo（`packages/` 单层）设计，未覆盖现代 monorepo 的多目录、多工具配置。
- `rescan` 复用 `onboard` 的全量逻辑是为了保证产物一致性，但缺乏增量导致大型项目 rescan 缓慢。

## Solutions

### Solution A: 按 pattern 聚合去重（M2，已选）
- Step 3 改为同一 pattern 只产出一条候选，`source` 聚合所有命中文件（逗号分隔），标题用 `pattern.title` 不带文件名。
- Step 2 结构性红线行为不变。
- cost: 改动集中在 `redline-scanner.ts` 一个文件；`business-map-scanner.ts` 被动受益无需改；需补回归测试验证 ID 稳定性。

### Solution B: 保留 per-file 但改 makeId（M2，被拒）
- 用 pattern hash + category 派生 ID，使 per-file 候选共享 ID。
- cost: 仍产生大量候选条目（治标不治本）；`redlines-seed.json` 仍膨胀；`source` 仍单文件。

### Solution C: 多源 workspace 包发现（M1，已选）
- 优先级：根 `package.json` workspaces → `pnpm-workspace.yaml` → `lerna.json` packages → 兜底扫描 `packages/`、`apps/`、`libs/`、`modules/`、`services/`、`components/`。
- cost: 需解析多种 manifest 格式；glob 展开逻辑；需测试覆盖各 monorepo 工具。

### Solution D: 浅层增量 rescan（M3，已选）
- 按 git diff 裁剪重扫文件范围，未变更文件的红线候选用 M2 稳定 ID 复用旧产物。
- cost: 需 git diff 集成；产物合并逻辑（新旧候选集合 union）；需处理新增/删除文件边界。

### Solution E: 深层增量 rescan（M3，被拒）
- 完整差异匹配 + 产物合并 + 增量失效检测。
- cost: 复杂度高；本轮范围膨胀；留后续 Feature。

## Questions

### [product] Q1: M1 是否纳入本轮
- recommendation: 纳入，优先级最低（SC-02 无依赖，在 SC-01/SC-03 后推进）
- options: [纳入本轮] [推迟到下一 Feature]
- **已决**：纳入，优先级最低。

### [tech] Q2: M3 实现深度
- recommendation: 浅层（git diff 裁剪 + 稳定 ID 复用）
- **已决**：浅层。

## Sign-off
- [ ] product: by: ____ date: ____ ref: ____
- [ ] tech: by: ____ date: ____ ref: ____

## 停止条件
所有产品/技术疑问已在 grill 阶段获用户回复。spec 阶段无新增未决事项。
