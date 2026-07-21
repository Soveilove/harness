# Pino Front 稳定 Harness

本目录是 A/B/C 工程共享的稳定发布源。这里只保存经过审查、适用于三个工程的知识、规则、导航、模板和工具。

## 所有权边界

- 中枢拥有：`memory/`、`spec-harness/`、`codegraph/`、`templates/`、`scripts/`、`workflows/`、`extensions/`、`integrations/`。
- 工程拥有：`.specify/feature.json`、`specs/`、项目 Baseline、项目根 `AGENTS.md`/`CLAUDE.md` 和分支候选知识。
- 中枢内容可以向工程分发；工程实例状态不得反向覆盖中枢或其它工程。
- 新版 Sovei 架构仍按发布阶段落地。设计文档中尚不存在的命令或能力不得假定为可用。

## Sovei Workflow 0.2.0

- Codex 显式入口：`$sovei-workflow`
- 每次调用只执行一个阶段，禁止阶段串联；下一阶段必须由用户在新调用中显式触发。
- 阶段 Skill 依赖：`workflows/sovei/skill-map.yaml`；必须区分实际启用与候选未安装。
- Active：`load`、`grill`、`spec`、`scope`、`plan`
- Future：`wayfind`、`tasks`、`implement`、`converge`、`verify`、`learn`、`sync`
- 状态机：`workflows/sovei/workflow.yaml`
- 使用指引：`workflows/sovei/USAGE.md`
- Feature 状态：项目 `specs/<feature>/workflow-state.yaml`，不参与分发
- 状态与实际 Artifact 冲突时必须停止，不根据聊天历史修复或猜测

## 加载顺序

1. 读取 `memory/MEMORY.md` 了解可用知识。
2. 读取 `memory/user-preferences.md` 和 `memory/constitution.md`。
3. 按任务类型加载：
   - Bug：`memory/vue-pitfalls.md`、`workflows/systematic-debugging.md`
   - 架构：`memory/project-architecture.md`
   - 技术决策：`memory/design-decisions.md`
   - 实现：`spec-harness/implementation-rules.md`
   - 代码导航：`codegraph/index.md` 及其直接链接的地图
4. 在产品工程中，再读取该工程自己的 `.specify/feature.json` 和当前 `specs/<feature>/`。

只加载当前任务需要的直接资料，不把全部 Memory、Code Map 或历史 Spec 一次性注入上下文。

## 稳定知识晋级

```text
来源工程发现候选知识
  -> 在来源 Feature 和真实代码链路中验证
  -> 判断是否适用于 A/B/C
  -> 人工提炼到中枢对应文件
  -> 检查引用、适用范围和证据状态
  -> 从中枢分发到目标工程
```

单次观察进入 pending/candidate，不得直接写成稳定规则。项目专属路径或行为留在项目实例，除非三个工程共享同一代码基线且已重新验证。

## 目录

```text
harness/
├── index.md
├── memory/              # 稳定知识、偏好、宪法、ADR、领域 Skill
├── spec-harness/        # stable/pending/rejected 规则与审计清单
├── codegraph/           # 当前共享代码导航
├── templates/           # SpecKit 文档模板
├── scripts/             # 工程脚本和同步脚本
├── workflows/           # 已注册且真实存在的工作流
├── extensions/          # SpecKit 扩展
├── integrations/        # 集成清单
└── ide-adapters/        # 仅用于缺失时初始化的项目规则模板
```

ABC 的同步命令、保护范围和晋级流程只以 `E:\memory\SYNC.md` 为准。
