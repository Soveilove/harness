# 覆盖矩阵：SC-001-scanner-polish-01

| 验收项 | 证据/验证方式 | 状态 |
|---|---|---|
| 同一 pattern 多文件只生成一条候选 | `scanner-polish.test.mjs` M2 聚合测试 | covered |
| source 聚合全部命中文件 | `source.split(', ')` 断言 | covered |
| 文件改名不改变 ID | M2 稳定性测试 | covered |
| 结构性红线不回归 | scanner/redline-view 回归测试 | covered |
| 业务地图关联 ID 收敛 | scanner business-map 测试 | covered |
| 无鉴权/计费/API 外部链路 | 纯仓库扫描逻辑 | n/a |
