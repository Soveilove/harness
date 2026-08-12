# Load Summary — 031-explore-stage

## 问题陈述

当前 Sovei 工作流的拆分评估在 scope 阶段（第 5 阶段）之后，但此时还没分析过 PRD/需求文档。流程是 load→grill→wayfind→spec→scope→拆分评估，scope 做的是"沿代码链路找涉及模块"，但**没有 PRD 分析就没有拆分依据**——不知道需求有哪些功能域，无法判断该拆成几个子变更。

## 源码关键位置

| 文件 | 行 | 内容 |
|---|---|---|
| packages/sovei-core/src/engine/workflow-engine.ts | 57-60 | DEFAULT_WORKFLOW.stageOrder = [load, grill, wayfind, spec, scope, plan, tasks, implement, converge, verify, learn, sync] |
| packages/sovei-core/src/stages/index.ts | 19-82 | load 阶段定义（状态校验 + 现状探索 + 风险识别） |
| packages/sovei-core/src/stages/index.ts | 303-312 | scope 阶段"拆分评估"段（scope 完成后才评估拆分） |
| packages/sovei-core/src/cli/commands/feature.ts | 584-618 | feature split --json 提议契约 |
| packages/sovei-core/src/cli/commands/workflow.ts | 64-75 | bootstrap 命令（只接受 feature ID，无 PRD 输入） |
| packages/sovei-core/src/config/scanner.ts | - | ProjectScanner（onboard 扫描器，技术视角） |
| packages/sovei-core/src/config/business-map-scanner.ts | - | BusinessMapScanner（正则推断能力图，非业务描述） |

## 上下文要点

- webplugin 的 `1-业务扫描` agent 产出 BUSINESS_COVERAGE.md（业务视角），是 `2-需求拆解` 的输入
- webplugin 的 `Explore` agent 已被自身废弃（CHANGELOG 记录）
- DEV_BACKLOG WP-7「load 业务视角扫描」标记为 P3 待吸收，尚未实现
- 当前 onboard 产出 business-map.json（技术能力图），缺业务覆盖面报告

## 风险初判

- **S2 风险**：新增阶段影响 stageOrder（状态机核心），所有 IDE 适配器 slash command 需更新，向后兼容性需保证
- 红线：NO_SILENT_DATA_LOSS（CLI 升级不静默重写）、CONFIRMATION_GATE_INTEGRITY（门禁完整性）
