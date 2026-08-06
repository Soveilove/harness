# 覆盖矩阵

> 由 Sovei 阶段生成：scope
> Feature: 018-adapted-rule-dedup

## 必需覆盖项

| 覆盖项 | 证据 | 状态 |
|--------|------|------|
| 规则生成（scanProjectRuleCandidates）按 id 去重 | 新增单测：同章节重复语句只产生一条候选 | ✅ 计划中 |
| 同一文件内重复 id 报错信息可诊断 | 单测：同文件重复断言报错含「同一文件内」提示 | ✅ 计划中 |
| 跨文件重复 id 报错保留双路径 | 已有单测 `rules.test.mjs:27` 保留 | ✅ 已有 |
| 现有合法规则不受影响 | 全部现有 rules 测试通过 | ✅ 已有 |
| 端到端复跑不报错 | `xmiles/ad-materials-frontend` 复跑 adapt | 🔶 发布前 smoke |

## 无需覆盖（范围外）
- 命令契约 / CLI 入口：无改动，不新增覆盖。
- Node 版本兼容：本 feature 与 017-node14-compat 无关，不在范围。

## 缺失证据
- 无。除端到端复跑（发布前 smoke）外，其余覆盖均有单测支撑。
