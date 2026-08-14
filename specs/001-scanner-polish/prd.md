# PRD：业务地图 / 红线扫描算法打磨（scanner-polish）

> 父 Feature 承载三个相关打磨点。由 explore 阶段画依赖图后拆分为子变更（change）。
> 本文件为父 Feature 的 PRD，落盘位置 `specs/001-scanner-polish/prd.md`。

## 背景

`packages/sovei-core` 的 onboard/rescan 会扫描仓库产出三类证据：业务地图
（`business-map.json`）、红线候选（`redlines-seed.json`）、知识条目。当前扫描算法存在
三个问题，影响产物可信度、跨 rescan 稳定性与覆盖完整性。

## 打磨点

### M1. 单包检测（覆盖缺口）
`discoverPackages`（`scanner.ts`）只匹配 `packages/<一层>/package.json` 这个单一形态，
漏掉 `apps/`、`libs/`、`modules/` 等 workspace 目录、嵌套包、以及由
`pnpm-workspace.yaml` / `lerna.json` / 根 `package.json` 的 `workspaces` 字段声明的包。
目标：按多源 workspace 配置发现并展开包，提升 monorepo 覆盖。

### M2. 红线 ID 翻倍（数据质量根因）
`redline-scanner.ts` 的 `scanCodeSurfaces`（Step 3）在生成代码面红线时把命中文件名嵌入
标题（`title: pattern.title + ' (' + file.name + ')'`），`makeId` 按 `(category, title)`
派生 ID，`add()` 只按 ID 去重。同一逻辑红线（如 `AUTH_GUARD_DETECTED`）命中 N 个文件就
产生 N 个不同 ID，导致：
- `redlines-seed.json` 候选列表被近似重复项污染；
- `business-map.json` 的 `redlineCandidateIds` 随文件数量膨胀；
- 文件改名/增删改变 ID → 跨 rescan 候选集 churn，破坏后续增量匹配能力。
目标：按 pattern 聚合去重，同一 pattern 只产出一条候选，`source` 聚合命中文件，
`makeId` 稳定不依赖文件名。

### M3. rescan 冗余（性能/体验症状）
`rescan` 命令是 `onboard` 的纯别名（`runOnboardScan`），每次全量重扫所有源码并整体覆写
三类证据，无增量、不按变更裁剪。目标：在 M2 提供稳定 ID 的前提下，实现增量/差分式 rescan。

## 依赖关系

- M2 是数据质量根因，是 M3 增量匹配的前置（稳定 ID 才能匹配新旧候选）。
- M1 与 M2/M3 无强耦合，但都作用于同一批扫描产物，宜放在同一父 Feature 下按 change 推进。

## 拆分子变更（explore 阶段细化）

按 explore 依赖图原则，本 PRD 预期拆为独立可验证的子变更：
- SC-1：红线 ID 翻倍（M2）—— 最独立、改动最小，先行；
- SC-2：单包检测（M1）—— 覆盖增强，独立；
- SC-3：rescan 冗余（M3）—— 依赖 SC-1 的稳定 ID。

## 验收标准（父级）

- 各子变更独立可验证，互不阻塞；
- M2 优先落地：同一 code pattern 命中多文件只产出一条候选，`source` 聚合，ID 跨 rescan 稳定；
- 既有测试保持通过；无回退。
