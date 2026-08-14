# 需求探索：业务地图 / 红线扫描算法打磨

> 由 Sovei 阶段生成：explore
> Feature：001-scanner-polish

---

## 一、需求理解

### 真实意图
`packages/sovei-core` 的 `project onboard` / `rescan` 会扫描仓库并产出三类治理证据：
业务地图（`business-map.json`）、红线候选（`redlines-seed.json`）、知识条目。当前
扫描算法存在三个数据质量 / 覆盖 / 性能问题，导致产物不可信、跨 rescan 不稳定、monorepo
覆盖不完整。本 Feature 目标是系统性地打磨这三个算法点，而非改动上层产物消费方。

### 核心目标
- **M1 单包检测**：`discoverPackages` 只匹配 `packages/<一层>/package.json` 单一形态，
  漏掉 `apps/`、`libs/`、`modules/` 等 workspace 目录、嵌套包、以及 `pnpm-workspace.yaml` /
  `lerna.json` / 根 `package.json` `workspaces` 字段声明的包。目标：按多源 workspace 配置
  发现并展开包，提升 monorepo 覆盖。
- **M2 红线 ID 翻倍**（数据质量根因）：`scanCodeSurfaces` 把命中文件名嵌入红线标题，
  `makeId` 按 `(category, title)` 派生 ID，导致同一逻辑红线在多个文件上产生多个不同 ID，
  污染 `redlines-seed.json` 与 `business-map.json` 的 `redlineCandidateIds`，且破坏跨 rescan
  的 ID 稳定性。目标：按 pattern 聚合去重，`makeId` 稳定不依赖文件名。
- **M3 rescan 冗余**：`rescan` 是 `onboard` 的纯别名，每次全量重扫、整体覆写，无增量。
  目标：在 M2 提供稳定 ID 的前提下，实现增量 / 差分式 rescan。

### 功能项清单
1. 多源 workspace 配置感知 + 包发现扩展（M1）
2. 代码面红线按 pattern 聚合去重，`source` 聚合命中文件（M2）
3. `makeId` 稳定化，不随文件名/顺序 churn（M2）
4. rescan 增量：按变更文件裁剪重扫范围，复用稳定产物（M3）

### 非功能约束
- 不破坏既有产物 schema（`BusinessMap`、`CandidateRedline` 字段保持不变）。
- 结构性红线（Step 2，标题固定）行为不变。
- 既有测试（`scanner.test.mjs`、`redline-view.test.mjs` 等）保持通过。

---

## 二、代码现状摘要

### 相关模块
- **`packages/sovei-core/src/config/scanner.ts`** — `ProjectScanner` 主扫描器，含
  `discoverPackages`（单包检测 M1 所在）、`scanDirectory`（目录遍历）、`detectPatterns`。
- **`packages/sovei-core/src/config/redline-scanner.ts`** — `RedlineScanner`，三源发现
  （governance docs / spec files / code surfaces）。`scanCodeSurfaces` 的 Step 3 是 M2 根因，
  `makeId` 是 ID 派生函数。
- **`packages/sovei-core/src/config/business-map-scanner.ts`** — `BusinessMapScanner`，
  消费 `candidateRedlines` 并回填每个 capability 的 `redlineCandidateIds`（受 M2 影响）。
- **`packages/sovei-core/src/cli/commands/project.ts`** — `onboard` / `rescan` 命令，
  两者同体调 `runOnboardScan`（M3 所在）。
- **`packages/sovei-core/src/change-control/redline-view.ts`** — 渲染 `redlines.md` 人工
  审查视图，消费 `redlines-seed.json`（候选膨胀直接影响人工审查成本）。

### 关键代码位置（现状证据）
- `scanner.ts:263-295` — `discoverPackages` 用 `/^packages\/[^/]+\/package\.json$/` 正则，
  仅匹配单层 `packages/`。
- `redline-scanner.ts:350-362` — `scanCodeSurfaces` Step 3 标题嵌文件名：
  `title: pattern.title + ' (' + file.path.split('/').pop() + ')'`。
- `redline-scanner.ts:378-382` — `makeId` 由 `(category, title)` 派生，`add()` 只按 ID 去重。
- `project.ts:452-462` — `rescan` 命令与 `onboard` 同体。

---

## 三、相关已有实现与模块关系

- **依赖链**：`ProjectScanner.scan` → `RedlineScanner.scan`（产候选）→
  `BusinessMapScanner.scan`（回填 `redlineCandidateIds`）。M2 的 ID 稳定性会沿此链传导：
  候选红线的 ID 变稳定后，`business-map.json` 的关联也稳定。
- **消费方**：`redlines-seed.json` → `redline-view.ts`（人工视图）；`business-map.json` →
  `sovei project map`（业务拓扑展示）。两者都直接受 M2 候选数量影响。
- **rescan 现状**：`runOnboardScan` 每次全量重扫，覆盖旧产物；`artifact-version-guard`
  在读取旧版产物时提示需刷新。

---

## 四、业务关联分析

- **范围内**：本 Feature 属于「演进式架构治理」能力域内的扫描算法内部打磨，无新业务实体。
- **外部依赖**：无（纯仓库内自迭代，作用于 `packages/sovei-core` 自身）。
- **红线约束**：需遵守本仓库已有的扫描产物契约与既有测试约定，改动不得破坏 `CandidateRedline`
  与 `BusinessMap` 的结构。

---

## 五、风险点清单

| 风险 | 说明 | 缓解 |
|---|---|---|
| ID 变更破坏既有引用 | M2 改 `makeId` 会影响已激活红线 ID 匹配 | 只改候选生成逻辑，不触碰人工声明的红线；结构性红线 ID 不变 |
| `source` 聚合过长 | 多文件聚合可能使 `source` 字段超长 | 沿用 Step 2 结构化红线用逗号分隔的做法，可限制条数 |
| workspace 配置解析复杂度 | 多种 manifest（pnpm/lerna/npm workspaces）解析易出错 | 分阶段实现，先覆盖根 `package.json` workspaces + `packages/`，再扩展 |
| rescan 增量误判 | 增量裁剪可能漏扫新增/删除文件 | 增量实现依赖 M2 稳定 ID 做差异匹配，且保留全量兜底 |

---

## 六、变更拆分理由（依赖图分析）

### 依赖图
```
M2 redline-id-dedup  ──(稳定 ID 是 M3 增量匹配的前置)──▶  M3 rescan-incremental
M1 package-detection  ──────────────────────────────────────────（与 M2/M3 无耦合）
```

### 分析
- **M2 与 M3**：强先后依赖。M3 增量 rescan 需要稳定 ID 才能在旧产物与新增候选之间做差异匹配，
  故 M3 `dependsOn` M2。
- **M1 与 M2/M3**：无耦合。M1 只改 `discoverPackages`（包发现），M2/M3 改红线生成与 rescan
  流程，互不重叠，可完全独立验证。
- 三者在同一父 Feature 下，共享同一批扫描产物（`business-map.json`、`redlines-seed.json`），
  宜统一规划避免产物互相覆写冲突。

### 分组结论：拆分为 3 个可并行的子变更（图呈「星型 + 一条有向边」）
- **SC-1 redline-id-dedup（M2）** — 无依赖，最独立、改动最小，先行。
- **SC-2 package-detection（M1）** — 无依赖，独立。
- **SC-3 rescan-incremental（M3）** — `dependsOn: SC-1`（依赖稳定 ID）。

> 推荐执行顺序：SC-1 → SC-3（SC-2 可随时并行）。
