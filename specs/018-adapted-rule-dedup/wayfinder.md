# 决策地图

> 由 Sovei 阶段生成：wayfind
> Feature: 018-adapted-rule-dedup

## 结论：无需决策地图（Wayfinder marked not required）

本次修复为**单会话小型工作**，决策树已在 grill 阶段全部澄清，无剩余未知决策或 fog，因此走 `wayfinder skip` 标记无需跨会话决策地图。

## 已澄清的决策（详见 decision-log.md）

| 编号 | 类型 | 决策内容 |
|------|------|----------|
| D1 | 可推断 | `scanProjectRuleCandidates` 生成候选后按 id 去重（治本） |
| D2 | 可推断 | 增强 `repository.ts` 重复 id 报错信息，区分同文件/跨文件 |
| D3 | 可推断 | 补充单元测试覆盖「同一章节重复语句只生成一条候选」 |

## 目标（Destination）

修复 `adapted.rules.json` 因重复 id 导致的 `Duplicate project rule id` 错误，从源头杜绝文档适配器生成重复规则 id。

## 范围外（Out of scope）
- 不修改 `adapted.rules.json` 中已有规则的语义内容。
- 不做发布产物/Node 版本兼容改造（与 017-node14-compat 无关，仅恰好在该场景被发现）。
