# 影响范围

> 由 Sovei 阶段生成：scope
> Feature：001-scanner-polish

---

## 涉及模块与影响面

| 模块 | 路径 | M2 | M1 | M3 | 架构压力 |
|---|---|---|---|---|---|
| RedlineScanner | `src/config/redline-scanner.ts` | ✏️ 核心改（Step 3 聚合 + 标题） | — | — | 低：单文件内部逻辑调整 |
| ProjectScanner | `src/config/scanner.ts` | — | ✏️ 核心改（`discoverPackages` 扩展） | ✏️ 改（增量裁剪入口） | 中：M1/M3 都改此文件，但改不同函数 |
| BusinessMapScanner | `src/config/business-map-scanner.ts` | 被动受益（`redlineCandidateIds` 自动收敛） | — | — | 低：无需改 |
| project 命令 | `src/cli/commands/project.ts` | — | — | ✏️ 核心改（`rescan` 增量路径） | 低：单命令分支 |
| redline-view | `src/change-control/redline-view.ts` | 被动受益（候选收敛） | — | — | 低：无需改 |
| 测试 | `test/scanner.test.mjs`、`test/redline-*.test.mjs` | ✏️ 补回归 | ✏️ 补覆盖 | ✏️ 补增量测试 | — |

**影响模块数**：核心改动 3 个源文件（`redline-scanner.ts`、`scanner.ts`、`project.ts`），被动受益 2 个，测试 3 个。

## 入口与数据流

```
sovei project onboard/rescan
  → ProjectScanner.scan (scanner.ts)
    → discoverPackages (M1 改) → packages[]
    → scanDirectory → files[]
    → RedlineScanner.scan (redline-scanner.ts)
      → scanGovernanceDocs / scanSpecFiles / scanCodeSurfaces (M2 改 Step 3)
      → candidateRedlines[]
    → BusinessMapScanner.scan (business-map-scanner.ts, 被动受益)
      → capabilities[].redlineCandidateIds (M2 后自动收敛)
  → 落盘 business-map.json / redlines-seed.json / knowledge
  (M3: rescan 增量路径 → git diff 裁剪 → 复用稳定 ID 旧候选)
```

## 异步生命周期与状态

- 扫描为同步流程（无异步回调）。
- 产物为 JSON 文件，整体覆写（M3 后部分复用）。
- 无鉴权/计费/API 边界。

## 恢复路径与兼容

- **恢复**：rescan 失败时保留旧产物（不覆写）。M3 增量失败回退全量。
- **兼容**：`CandidateRedline`、`BusinessMap` schema 不变；产物版本兼容。
- **验证面**：既有 `scanner.test.mjs`、`redline-view.test.mjs`、`redline-scanner.test.mjs` 覆盖核心行为。

---

## 拆分修正（基于代码影响面）

### 判定：当前 3-SC 拆分**不合理**，建议合并为单管线（no-split）

**依据（对照拆分信号标准）**：

| 信号 | 阈值 | 实际 | 结论 |
|---|---|---|---|
| 影响模块数 | ≥4 且耦合低 | 核心 3 个源文件；M2/M3 都改 `scanner.ts`+`project.ts` | 未达，且有重叠 |
| 预计 TASK 数 | ≥15 | M2≈4 + M1≈5 + M3≈5 = ~14 | 未达 |
| 可独立验证 | 完全独立无交叉 | M2/M3 改同一批文件，M3 dependsOn M2 | 不独立 |

**核心问题**：
1. M2 与 M3 强耦合（M3 依赖 M2 的稳定 ID，且都改 `scanner.ts`/`project.ts`），plan→verify 无法真正独立。
2. M1 体量小（单函数扩展），独立走完整 5 阶段协调成本远超收益。
3. 三者实为"一个打磨轮的三个任务组"，非"三个独立功能域"。

### 建议：合并为单管线

- 取消 3 个 SC，改为单管线 Feature。
- 在 `tasks.md` 里分三组 TASK（M2 组、M1 组、M3 组），用 task 依赖表达 M2→M3 顺序。
- verify 一次性验证整个扫描算法打磨。

### 决策：保留 3-SC 拆分（路径 B）

**用户决策**：虽然 scope 判定拆分过细（三个信号均未达阈值），但保留 3-SC 拆分，目的是
**验证多 change 机制的端到端流程是否跑顺**——包括子变更目录产物写入、plan→verify 独立推进、
verify 后自动 merged、aggregation gate 合并等关键节点。

**已知风险（接受）**：
- M2（SC-01）与 M3（SC-03）改同一批文件（`scanner.ts`/`project.ts`），plan/tasks 会有重叠。
- M3 `dependsOn` M2，需等 SC-01 merged 后才进 plan。
- implement 阶段 SC-01/SC-03 可能踩脚——届时在各自 change-manifest.md 里明确文件分工。

**验证目标**：多 change 机制本身跑顺，而非追求本 Feature 的最优拆分粒度。

> 注：此判定与用户在 grill 前的讨论一致——"留到单独打磨轮"指一个 Feature 一个轮次；
> 保留拆分是为验证子变更机制，非否定单管线更优。
