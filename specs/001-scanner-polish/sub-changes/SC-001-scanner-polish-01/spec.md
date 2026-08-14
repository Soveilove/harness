# Spec：SC-001-scanner-polish-01 redline-id-dedup

> Feature：001-scanner-polish
> 父级决策：`../decision-log.md`

## 问题定义

代码面红线扫描在多个文件命中同一 `CODE_PATTERNS` 时，把文件名嵌入候选标题，导致同一逻辑红线产生多个 ID，污染 `redlines-seed.json` 与业务地图关联。

## 用户可见行为

- 同一代码 pattern 命中多个文件时，只生成一条候选红线。
- 候选 `source` 聚合全部命中文件。
- 候选 ID 由稳定的类别和 pattern 标题决定，不因文件名变化而变化。
- 结构性红线和 governance/spec 红线行为不变。

## 范围

- 修改 `packages/sovei-core/src/config/redline-scanner.ts` 的代码面扫描聚合逻辑。
- 保持 `CandidateRedline` schema、`makeId` 签名和候选生命周期不变。
- 补充多文件命中、聚合 source、文件改名 ID 稳定性回归测试。

## 排除项

- 不改人工声明红线和 `redlines.json`。
- 不在本子变更中实现 rescan 增量或 workspace 包检测。
- 不改变结构性红线的固定标题和 ID。

## 验收标准

- [ ] 同一 pattern 命中 N 个文件时，候选数量为 1。
- [ ] `source` 包含 N 个命中文件路径。
- [ ] 文件名增删改后同一 pattern 的 ID 保持不变。
- [ ] 既有 scanner/redline 测试与新增回归测试通过。
