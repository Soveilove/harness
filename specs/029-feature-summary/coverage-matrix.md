# Coverage Matrix — 029-feature-summary

> Feature：`sovei feature summary <id>`（P1-2）
> 阶段：scope（验收标准 ↔ 实现覆盖追踪）

| 验收标准 | 覆盖点 | 测试用例 | 状态 |
|---|---|---|---|
| **AC1** 已完成 Feature 生成含六章节的 summary.md | `summaryFeature()` 组装需求/决策/变更/验证/经验/结论；写 `summary.md` | `feature-summary.test.mjs`：「completed Feature 生成 summary.md」 | 待实现 |
| **AC2** 归档后 Feature（`_archive/` 回退）仍还原变更/验证章节 | 顶层优先 + `_archive/` 回退的产物读取 | 「归档后 Feature 回退读取 _archive/ 产物」 | 待实现 |
| **AC3** `--json` 输出合法 JSON 含关键字段 | `--json` 分支打印 `featureId/stages/decisions/tasks/overrides` | 「--json 输出结构化字段」 | 待实现 |
| **AC4** in_progress Feature 生成进度快照，未执行阶段显示"未执行" | 状态容忍 + 缺失产物降级 | 「in_progress Feature 生成进度快照」 | 待实现 |
| **AC5** 不存在 Feature 报错且退出码非 0 | Feature 目录/状态缺失检测 | 「Feature 不存在时报错」 | 待实现 |
| **AC6** summary.md 走 `StorageBackend.write` | 核心函数用 storage 注入 | 「写入走 StorageBackend（可用 MemoryStorage 断言）」 | 待实现 |
| **AC7** 既有测试零回归 + 新增测试 | 新增 test 文件，跑全量 | 全量 test 运行 | 待实现 |

## 覆盖缺口

- `summary.md` 加入 `feature.ts` 的 `PERSISTENT_FILES` 白名单（reconciliation Q2 决策）——需在实现 archive 侧同步，否则 archive 会折叠 summary。
- 各产物章节的**段落提取**规则需在实现时确定（如 decision-log 的 `## D<n>:` 正则、spec 的 `## 目标` 段、sync-report 的 `## 结论` 段），并在测试中用真实/构造 fixture 断言。
