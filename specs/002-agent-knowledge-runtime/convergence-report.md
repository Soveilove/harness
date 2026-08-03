# 收敛报告

## 契约对照

| 验收项 | 结论 | 证据 |
| --- | --- | --- |
| AC-1 红线候选落盘 | 满足 | project onboard 写入 redlines-seed.json，含 schemaVersion 和 scannerVersion |
| AC-2 红线导入 | 满足 | governance redline import 支持 seed 对象和 raw 数组；未 import 不激活 |
| AC-3 无 Provider context | 满足 | buildContextPack 在无 EmbeddingProvider 时生成 required/suggested |
| AC-4 required 隔离 | 满足 | active redlines 和 stable rules 进入 required；candidate 只进 suggested |
| AC-5 stale 判定 | 满足 | isStale 比较内容哈希；修改后检测到 stale |
| AC-6 adapter 画像 | 满足 | 四宿主能力不同；CodeBuddy 用 SOVEI 前缀；Trae 无 toolExecution |
| AC-7 回归 | 满足 | 完整 test 40/40 通过 |
| AC-8 版本与文档 | 满足 | package.json 升至 2.1.0-dev.2；未 publish/commit |

## 差距分类

- missing：无
- partial：无
- contradicts：无
- unrequested：向量数据库、云 LLM SDK、IDE 自动安装、publish 均按计划延期

## 架构检查

新增 context/ 和 providers/contracts.ts 为纯增量；scanner.ts 只增加一行 seed 写入；adapters/registry.ts 扩展接口但保持薄层；KnowledgeStore 只增加跳过 dotfile。无新依赖循环或职责叠加。

## 处置

无需纠正任务，可以进入验证。
