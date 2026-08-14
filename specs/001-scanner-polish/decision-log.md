# 决策日志

> 由 Sovei 阶段生成：grill
> Feature：001-scanner-polish

---

## 一、事实核实（已从代码查证，不问用户）

### F1. 红线 ID 翻倍的根因机制
- **结论**：`redline-scanner.ts:350-362` 的 `scanCodeSurfaces` Step 3 把命中文件名嵌入标题
  （`pattern.title + ' (' + file.path.split('/').pop() + ')'`），`makeId`（`:378-382`）按
  `(category, title)` 派生 ID，`add()`（`:123-128`）只按 ID 去重。故同一 pattern 命中 N 文件
  产生 N 个不同 ID。
- **证据**：`toScan = surfaceFiles.slice(0, 60)`（`:344`），最多读 60 个文件，每命中一个 pattern
  产出一条候选。
- **状态**：已决。

### F2. 结构性红线（Step 2）不受影响
- **结论**：`scanCodeSurfaces` Step 2（`:299-341`）的标题是固定字符串（如
  "Authentication surface detected in code structure"），不嵌文件名，ID 稳定。
- **状态**：已决。修复 M2 时 Step 2 行为保持不变。

### F3. business-map 的 redlineCandidateIds 受 M2 传导
- **结论**：`business-map-scanner.ts:147-155` 逐个 `capability.redlineCandidateIds.add(redline.id)`。
  M2 修复后候选 ID 收敛，此字段自动收敛，无需单独改 business-map-scanner。
- **状态**：已决。

### F4. discoverPackages 的单一正则
- **结论**：`scanner.ts:265` 用 `/^packages\/[^/]+\/package\.json$/`，仅匹配单层 `packages/`。
  漏 `apps/`、`libs/`、`modules/`、嵌套包、workspace 配置声明的包。
- **状态**：已决。

### F5. rescan 是 onboard 的纯别名
- **结论**：`project.ts:452-462`，`rescan` 与 `onboard` 同体调 `runOnboardScan`，全量重扫、
  整体覆写，无增量。
- **状态**：已决。

### F6. makeId 当前不依赖文件名（结构性红线），但代码面红线因标题嵌文件名而间接依赖
- **结论**：`makeId` 本身只看 `(category, title)`。M2 修复点是 Step 3 的标题构造，不是 `makeId`
  函数本身。修复后标题不带文件名 → ID 自然稳定。
- **状态**：已决。

---

## 二、可推断决策（证据指向明确最优解，自行决策）

### D1. M2 修复方式：按 pattern 聚合去重
- **决策**：Step 3 改为同一 pattern 只产出一条候选，`source` 聚合所有命中文件（逗号分隔，
  与 Step 2 一致），标题用 `pattern.title` 不带文件名。
- **理由**：结构性红线（Step 2）已是此模式，代码面红线对齐即可；`add()` 的 ID 去重天然生效。
- **被拒绝方案**：①保留 per-file 候选但改 `makeId` 加 pattern hash——仍会产生大量候选，治标不治本；
  ②完全删除 Step 3——丢失代码级 pattern 证据，降低候选质量。
- **状态**：已决。

### D2. M2 的 source 聚合上限
- **决策**：沿用 Step 2 的做法，`source` 字段聚合命中文件路径，逗号分隔，不设硬上限（Step 2
  也没设）。若过长由 `redline-view.ts` 的 `cell()` 渲染时自然截断。
- **理由**：保持与既有结构性红线一致，不引入新约定。
- **状态**：已决。

### D3. M1 workspace 配置解析优先级
- **决策**：按以下优先级发现包：①根 `package.json` 的 `workspaces` 字段（npm/yarn）→
  ②`pnpm-workspace.yaml` → ③`lerna.json` 的 `packages` 字段 → ④保留现有 `packages/` 目录扫描
  作为兜底。同时扩展目录名集合：`apps`、`libs`、`modules`、`services`、`components`。
- **理由**：主流 monorepo 工具的声明顺序；兜底扫描保证无配置项目仍能发现包。
- **被拒绝方案**：只读配置不扫描目录——无 workspace 配置的项目会漏包。
- **状态**：已决。

### D4. M3 增量 rescan 的差异匹配基础
- **决策**：M3 用 M2 产出的稳定 ID 作为新旧候选的差异匹配键。未变更文件的红线候选复用旧产物，
  仅对变更文件重扫并合并。
- **理由**：稳定 ID 是增量匹配的必要前提，M2 先行（SC-01），M3 依赖之（SC-03 的 dependsOn）。
- **状态**：已决。

### D5. 不改 CandidateRedline / BusinessMap schema
- **决策**：M1/M2/M3 均不修改 `CandidateRedline`、`BusinessMap`、`BusinessCapability` 的字段结构。
- **理由**：既有消费方（`redline-view.ts`、`project map` 命令、`change-control`）依赖这些结构。
- **状态**：已决。

---

## 三、范围性决策（无法从证据推断，需用户确认）

> 按 grill 纪律逐个提问。以下先列出待决项，将逐个向用户确认。

### Q1. M1（单包检测）是否纳入本轮
- **问题**：M1 与 M2/M3 无耦合，可独立。但本轮重点是验证多 change 场景跑顺 + 先敲定 M2。
  M1 可纳入本轮（作为 SC-02 并行），也可推迟到下一 Feature。
- **决策**：纳入本轮，优先级最低（SC-02 无依赖，在 SC-01/SC-03 后推进）。
- **理由**：M1 改动面小且独立，顺势完成避免另开 Feature；不阻塞主线。
- **状态**：已决（用户确认）。

### Q2. M3（rescan 增量）的实现深度
- **问题**：M3 增量可浅可深——浅：仅按 git diff 裁剪重扫文件范围；深：完整差异匹配 +
  产物合并 + 增量失效检测。
- **决策**：浅层（git diff 裁剪重扫范围 + M2 稳定 ID 复用未变候选）。
- **理由**：浅层已解决"全量重扫"的主要冗余，不引入复杂产物合并逻辑，风险可控；深层差异合并留后续。
- **状态**：已决（用户确认）。

---

## 未决项清单
- ~~Q1：M1 是否纳入本轮~~ → 已决：纳入，优先级最低
- ~~Q2：M3 实现深度~~ → 已决：浅层 git diff 裁剪 + 稳定 ID 复用

> 所有事实已核实、所有可推断决策已记录、所有范围性决策已获用户回复。grill 阶段可完成。
