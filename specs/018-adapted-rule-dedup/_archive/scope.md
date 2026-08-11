# 范围分析

> 由 Sovei 阶段生成：scope
> Feature: 018-adapted-rule-dedup

## 变更入口与影响面

本次为 bug 修复，改动聚焦在规则适配与加载链路，无新功能、无对外契约变化。

### 涉及模块

| 模块 | 文件 | 角色 | 影响 |
|------|------|------|------|
| 规则适配 | `src/rules/adaptation.ts` | `scanProjectRuleCandidates` 生成候选 | 返回前按 id 去重（核心修复） |
| 规则加载 | `src/rules/repository.ts` | `load()` 校验重复 id | 增强报错信息，区分同/跨文件 |
| 测试 | `test/rules.test.mjs` | 回归覆盖 | 新增「同章节重复语句去重」用例 |

### 影响面边界
- **入口/路由**：`sovei project adapt` / `rules` 命令触发的适配流程。命令契约不变。
- **参数/I/O**：无新增参数、无 I/O 结构变化。`adapted.rules.json` 的 schemaVersion 仍为 1。
- **消费者**：`repository.load()` 的调用方（`resolveProjectRules`、`activate`、`deprecate`、`adaptProjectRules`）行为一致，仅错误信息更清晰。
- **兼容路径**：已存在的合法 `*.rules.json`（无重复 id）完全不受影响。
- **恢复路径**：对已污染的历史文件（含重复 id）不做自动迁移，一次性人工清理即可。
- **架构压力**：无。本改动不增加模块体积、churn 或耦合；不改职责边界。

## 结论

影响面清晰、边界确定，无需扩大 Feature 范围。S1 低风险，符合原定级别。
