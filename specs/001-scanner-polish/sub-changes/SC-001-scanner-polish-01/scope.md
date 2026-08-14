# 影响范围：SC-001-scanner-polish-01

## 入口与数据流

`project onboard/rescan` → `ProjectScanner.scan` → `RedlineScanner.scan` → `scanCodeSurfaces` → `CandidateRedline[]` → `redlines-seed.json` 与 `BusinessMapScanner.redlineCandidateIds`。

## 影响文件

| 文件 | 作用 | 改动 |
|---|---|---|
| `src/config/redline-scanner.ts` | 代码面 pattern 扫描、候选 ID 生成 | 核心 |
| `src/config/business-map-scanner.ts` | 消费候选 ID | 仅验证，不改 |
| `src/change-control/redline-view.ts` | 渲染候选视图 | 仅验证，不改 |
| `test/scanner-polish.test.mjs` | 多文件聚合与 ID 稳定性 | 补充/复用 |

## 边界

- 只处理 `CODE_PATTERNS` 代码面扫描。
- governance docs、spec files、结构性红线保持原行为。
- 不处理 workspace 包发现和 rescan 增量。

## 验收覆盖

- 多文件命中同一 pattern 只生成一个候选。
- source 聚合所有命中文件。
- 文件名变化不改变候选 ID。
- 既有候选视图和业务地图关联不回归。

## 恢复与风险

候选仍为 candidate，不自动激活；失败时可通过重新 onboard/rescan 重建种子文件。主要风险是 source 聚合格式变化，需保留逗号分隔兼容。
