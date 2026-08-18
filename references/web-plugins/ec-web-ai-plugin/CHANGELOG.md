# Changelog

## [1.0.25] - 2026-07-31

- 重构 1-6 SDD 流程：补齐 change 依赖与规格验收场景，编码、轻量审查和测试交互链路的职责边界更清晰
- 移除失效 `Explore` 依赖，新增独立 `7-变更归档` Agent，并同步 README 与流程说明

## [1.0.24] - 2026-07-31

- 编码规范技能重构：将 API 服务、CLI、React 组件、Rematch、Web Worker、Zustand 等专项规范整合到 `coding-standards` 的 references 中，统一规范维护入口并清理重复技能目录
- Agent 与 README 同步调整，优化方案设计、全栈编码等流程说明并移除废弃 `Explore` Agent

## [1.0.23] - 2026-07-06

- 修复 `4-spec编码` Agent tools 配置语法错误，移除 `tools:` 多余前缀

## [1.0.22] - 2026-07-06

- `4-spec编码` tools 配置新增 Figma MCP 和 ec-design MCP 工具，支持设计稿还原时直接调用组件文档与 Figma API

## [1.0.21] - 2026-07-06

- `3-方案设计` 设计讨论流程优化：将"先探索再 grill-me 强制对齐"改为"随挖随确认 + 收尾归纳确认"，每个设计要点当场确认不再积压待裁决项，收尾时按"整体思路→实体→分层→接口"逐段归纳复述

## [1.0.20] - 2026-07-03

- Agent 合并精简：删除 `Figma 还原`、`前端编码` 两个 Agent，功能收敛至 `全栈编码` 和 `4-spec编码`；Agent 总数从 10 缩减为 8
- `4-spec编码` 重构为独立完成单个 OpenSpec change 的全栈实现，不再委托子 Agent
- `2-需求拆解` 新增 change 分组与映射文档生成（`doc/vX.X-change划分.md`），作为 `3-方案设计` 的输入
- `3-方案设计` 重构为单 change 聚焦模式：按 change 名称定位需求、跨 change 实体复用、新增 grill-me 强制对齐关卡；design.md 新增「接口契约」章节；api.md 改为按需汇总生成
- `全栈编码` 约束细化：明确规范要求的标准产出物（mockFetch、JSDoc）不属于新增功能

## [1.0.19] - 2026-07-02

- `Figma 还原`、`前端编码`、`全栈编码` Agent 默认模型从 `deepseek-v4-pro` 切换为 `doubao-seed-2.1-pro`

## [1.0.18] - 2026-07-01

- `前端编码` Agent 新增「视图层组件库强制规则」：调用 `ec-design` MCP 获取组件文档后方可编写视图层代码，禁止凭记忆猜测组件 API
- `前端编码`、`全栈编码`、`Figma 还原` Agent 模型列表移除 `deepseek-v4-flash`，仅保留 `deepseek-v4-pro` 和 `Auto`；Markdown 表格对齐与格式优化

## [1.0.17] - 2026-06-30

- `方案设计` Agent `api.md` 接口收录范围收紧：只收录有变更（新增/改造）的接口，复用接口不记录；变更类型选项移除"复用"
- `需求拆解` Agent 疑问管控升级：禁止在对话回复中以任何形式展示问题/疑问清单，疑问只能通过 `vscode/askQuestions` 工具发起；表格对齐格式修复；移除重复的步骤标题

## [1.0.16] - 2026-06-29

- `react-component-standards` skill 术语规范化（代码符号添加反引号），Props 约束增强（禁止参数列表解构），示例代码修正类型标注
- `编码指挥官` Agent 新增「绝对禁令」：自身不得编写业务代码（移除 `edit` 工具），强制子 agent 自行更新 `tasks.md`，新增子 agent 产出验证步骤
- `方案设计` Agent 新增「规范加载」机制：根据涉及层按需加载对应 skill，设计产出遵循项目规范约定
- `需求拆解` Agent 三大原则升级：需求疑问改为实时讨论确认而非写入文档留空，结论融合入文，用户确认后才落盘；对应流程新增讨论步骤和收敛确认步骤，移除输出文件中的"需求疑问"章节

## [1.0.15] - 2026-06-29

- `figma-component-implementation` skill 重构 Figma 转代码流程：新增「组件匹配与 Props 映射」步骤，补充 Figma variant 到组件库 props 的转换规则（如同名 prop 优先、`none` 语义处理、图标导入等），并增加 Modal+ActSession 组合使用、className 样式定制等规范

## [1.0.14] - 2026-06-29

- 修复 Figma 还原、全栈编码 Agent 的 model 拼写错误（`flush` → `flash`），改为多模型数组格式并增加 `Auto (copilot)` 选项
- 编码指挥官 Agent 内部引用统一为 `前端编码`，与 Agent 实际名称一致
- 审查与方案设计 Agent 格式微调

## [1.0.13] - 2026-06-29

- 全部 Agent 文档结构统一为「全局提示 + 全局约束 + 场景」模式，强化角色定位、约束边界与工作流程
- 新增 `grill-me` skill，用于对方案/设计进行深度追问式审查
- 方案设计 Agent 强化提问规范：探索阶段所有问题必须通过 `vscode/askQuestions` 工具发起
- 需求拆解 Agent 生成梳理文档前自动检查并删除同名旧版本文件
- 全栈编码 Agent 构建迁移 skill 触发条件描述优化

## [1.0.12] - 2026-06-24

- 方案设计 Agent 架构从三层升级为四层，新增防腐层（Anti-corruption），服务层不再做字段映射
- 新增实体结构与关系设计前置步骤，所有设计必须先收敛实体再进入分层设计
- 新增工具内聚原则，独立逻辑须抽取为独立文件
- `design.md` 输出新增结构化规范（实体→分层→工具→防腐转换四章节）

## [1.0.11] - 2026-06-23

- 新增 `rematch-store-standards` skill，覆盖 Rematch store 设计、异步 actions、selector hooks 及组件集成规范
- `前端编码` 和 `全栈编码` Agent 同步引入该 skill

## [1.0.10] - 2026-06-23

- 需求拆解 Agent 新增空项目模式，无需 `BUSINESS_COVERAGE.md` 也可从 PRD 反推项目范围

## [1.0.9] - 2026-06-22

- Agent 名称加序号前缀（`1-业务扫描` ~ `6-链路梳理`），便于按执行顺序排列
- 输出路径统一收敛到 `doc/` 目录（业务覆盖报告、接口文档）
- 落地审查新增百分制评分体系（任务完成率/代码落地率/需求一致性）与 openspec 归档流程
- 链路梳理表格格式化对齐
- 需求拆解「需求疑问」章节改为 QA 模式（Q + A 占位），方便产品直接填写答复

## [1.0.8] - 2026-06-22

- Agent 名称微调：`变更调度` → `spec编码`、`需求解析` → `需求拆解`
- `业务扫描` Agent 工具权限新增 execute
- Agent 文档表格格式化对齐

## [1.0.7] - 2026-06-22

- 移除 `hooks.json` 及 plugin.json 中的 hooks 引用，OpenSpec 环境初始化逻辑移入业务扫描 Agent 第一步

## [1.0.6] - 2026-06-22

- Agent 合并收尾：删除已废弃的 `frontend-fullstack-implementer`、`typescript-engineer`，`fullstack-engineer` 更名 全栈工程→全栈编码、`frontend-implementer` 更名 前端实现→前端编码
- 技能表格格式化对齐
- `hooks.json` SessionStart 自动安装 openspec CLI

## [1.0.5] - 2026-06-22

- Agent 全面重命名：文件名英文化，中文名精简（如 `sprint-orchestrator` → `change-execution-orchestrator` 变更调度，`view-layer-coder` → `figma-view-implementer` Figma 还原 等）
- 合并 `typescript-engineer` + `frontend-fullstack-implementer` → `fullstack-engineer` / `frontend-implementer`
- 修正 README Agent 数量：9 → 10
- Skill 重命名：`cli-command-service-standards` → `cli-standards`
- 新增 `hooks.json`：SessionStart 自动初始化 openspec
- 移除 `openspec-*` 5 个技能，改为内置 agent skills

## [1.0.4] - 2026-06-17

- 交互链路分析师：拆分维度从业务模块改为业务页面，新增全局接口独立章节，移除场景级需求来源标注，触发时机强制纯业务语言，业务闭环改为纯文字描述，汇总索引表简化

## [1.0.3] - 2026-06-17

- 交互链路分析师：输出方式从按 change 改为按业务模块拆分，新增完整 URL 拼接、返回数据用途分析、业务闭环（Mermaid）、汇总索引，文档模板扩展

## [1.0.2] - 2026-06-17

- 移除服务层/状态层编码专家，能力合并到 web 前端项目开发专家
- web 前端项目开发专家扩展为全栈编码 agent，编码总指挥路由策略从四分支简化为两分支，README 更新

## [1.0.1] - 2026-06-17

- 新增 TypeScript 开发专家、CLI 命令服务标准技能
- `web-frontend-coder` 重命名为 `web-frontend-expert`，README 更新为 14 个技能

## [1.0.0] - 2026-06-17

- 首次发布：10 个自定义 Agent、13 个技能、plugin.json、.mcp.json、README.md
