# Spec：001-scanner-polish 业务地图/红线扫描算法打磨

> 由 Sovei 阶段生成：spec
> Feature：001-scanner-polish
> 详细需求对齐见 `reconciliation.md`

---

## 范围

本 Feature 打磨 `packages/sovei-core` 扫描算法的三个问题，不改动上层产物消费方。
三个打磨点按依赖顺序推进（M2 先行，M3 依赖 M2，M1 独立）。

## 验收标准

### M2：红线 ID 翻倍（核心，先行）

**用户可见行为**
- 同一 code pattern 命中多个文件时，`redlines-seed.json` 只产出**一条**候选红线（而非 N 条）。
- 该候选红线的 `source` 字段列出全部命中文件（逗号分隔）。
- 候选红线的 ID 跨 rescan 稳定：文件改名/增删不改变已有候选的 ID。

**边界**
- 结构性红线（Step 2，标题固定）行为不变，ID 保持稳定。
- `makeId` 函数签名不变，仍按 `(category, title)` 派生。
- `CandidateRedline` schema 不变（不新增字段）。
- `business-map.json` 的 `redlineCandidateIds` 自动收敛（被动受益，无需单独改）。

**排除项**
- 不改 `makeId` 函数本身的派生算法（只改 Step 3 的标题构造，使标题不带文件名）。
- 不处理 governance docs / spec files 红线源（只改 code surfaces 源）。

### M1：单包检测（独立）

**用户可见行为**
- `sovei project onboard` / `rescan` 能发现 `apps/`、`libs/`、`modules/`、`services/`、`components/` 等 workspace 目录下的包。
- 能读取根 `package.json` 的 `workspaces` 字段、`pnpm-workspace.yaml`、`lerna.json` 的 `packages` 字段声明的包。
- 嵌套包（如 `packages/group/tool/package.json`）能被发现。

**边界**
- 保留现有 `packages/` 单层扫描作为兜底（无 workspace 配置的项目仍能发现包）。
- `BusinessMap` schema 不变。

**排除项**
- 不解析 `rush.json`、`nx.json`（本轮不覆盖）。
- 不做包去重合并（如 `@scope` 按 name 合并）。

### M3：rescan 冗余（依赖 M2，浅层）

**用户可见行为**
- `sovei project rescan` 不再全量重扫所有源文件，仅重扫 git diff 标记为变更的文件。
- 未变更文件的红线候选用 M2 的稳定 ID 从旧产物复用，不重新生成。
- 新增/删除文件被正确纳入/移除。

**边界**
- 仅做文件级裁剪（按 git diff），不做候选级差异合并。
- 保留全量 rescan 作为兜底（如无 git 仓库或 diff 不可用时回退全量）。

**排除项**
- 不做增量失效检测（如 import 链变更触发的级联重扫）。
- 不做候选级差异合并（深层差异匹配留后续）。

---

## 依赖与顺序

- M2 先行（SC-01，无依赖）。
- M3 `dependsOn` M2（需稳定 ID 做差异匹配）。
- M1 独立（SC-02，无依赖，优先级最低）。

## 非功能约束

- 既有测试（`scanner.test.mjs`、`redline-view.test.mjs`、`redline-scanner.test.mjs`）保持通过。
- 不破坏 `CandidateRedline`、`BusinessMap`、`BusinessCapability` 的字段结构。
- 产物 schema 版本兼容（不 bump major）。
