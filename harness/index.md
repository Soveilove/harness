# Sovei Harness — 本地知识管理 CLI

本目录是一个本地知识管理 CLI。它定义"怎么沉淀知识"(工作流 + 蒸馏 + 晋级机制)，不定义"知识是什么"(那是项目专属内容)。换项目时壳原样复用，料清空重填。

## 壳料分离

本系统分两层：

| 层 | 内容 | 换项目时 |
|---|---|---|
| 壳(工具层) | 工作流、模板、脚本、skill、IDE 适配、分类法、审计清单 | 原样保留 |
| 料(项目层) | 踩坑库、代码地图、架构文档、ADR、实现规则、宪法 Vue 段、环境约束 | 清空重填 |

当前项目声明见 [project.yaml](project.yaml)。料文件头部标有 `<!-- PROJECT-SPECIFIC -->` 标注。

## 所有权边界

- 中枢拥有：`memory/`、`spec-harness/`、`codegraph/`、`templates/`、`scripts/`、`workflows/`、`extensions/`、`integrations/`。
- 工程拥有：`.specify/feature.json`、`specs/`、项目 Baseline、项目根 `AGENTS.md`/`CLAUDE.md` 和分支候选知识。
- 中枢内容可以向工程分发；工程实例状态不得反向覆盖中枢或其它工程。
- 新版 Sovei 架构仍按发布阶段落地。设计文档中尚不存在的命令或能力不得假定为可用。

## Sovei Workflow 1.1.0

- 研发工作流总手册(场景选择 + 知识飞轮)：`workflows/USAGE.md`
- Codex 显式入口：`$sovei-workflow`
- Claude Code 显式入口：`/sovei/<stage>`
- CodeBuddy 显式入口：命令面板 `SOVEI: <stage>`
- Trae 显式入口：自然语言要求“使用 sovei-workflow skill 执行 `<stage>`”
- 每次调用只执行一个阶段，禁止阶段串联；下一阶段必须由用户在新调用中显式触发。
- 阶段 Skill 依赖：`workflows/sovei/skill-map.yaml`；必须区分实际启用与候选未安装。
- Active：`load`、`grill`、`wayfind`、`spec`、`scope`、`plan`、`tasks`、`implement`、`converge`、`verify`、`learn`、`sync`
- 返工控制：`reopen TARGET=<stage> REASON=<reason>`，失效目标阶段及其已完成后继并记录历史
- 状态机：`workflows/sovei/workflow.yaml`
- 使用指引：`workflows/sovei/USAGE.md`
- IDE Adapter 清单：`ide-adapters/sovei-adapters.yaml`
- Feature 状态：项目 `specs/<feature>/workflow-state.yaml`，不参与分发
- 状态与实际 Artifact 冲突时必须停止，不根据聊天历史修复或猜测
- `sync` 完成后进入 `status: completed`、`next_stage: null` 的正式终态

## 加载顺序

1. 读取 `project/memory/MEMORY.md` 了解可用知识。
2. 读取 `project/memory/user-preferences.md` 和 `project/memory/constitution.md`。
3. 选工作流：新功能/需求变更走 Sovei，缺陷修复走 systematic-debugging，场景对照见 [研发工作流使用手册](workflows/USAGE.md)。
4. 按任务类型加载知识：
   - Bug：`project/memory/vue-pitfalls.md`、`workflows/systematic-debugging.md`
   - 架构：`project/memory/project-architecture.md`
   - 技术决策：`project/memory/design-decisions.md`
   - 实现：`project/rules/implementation-rules.md`
   - 代码导航：`project/codegraph/index.md` 及其直接链接的地图
5. 在产品工程中，再读取该工程自己的 `.specify/feature.json` 和当前 `specs/<feature>/`。

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
├── project/             # 料(项目专属，换项目清空重填)
│   ├── project.yaml     # 项目声明(项目名、技术栈、料文件清单)
│   ├── memory/          # 知识库(踩坑、架构、ADR、宪法、偏好)
│   ├── codegraph/       # 代码地图
│   └── rules/           # 规则库(implementation-rules / rejected-patterns / pending-rules)
├── spec-harness/        # 壳(分类法 failure-taxonomy + 审计清单 memory-audit)
├── templates/           # 壳(SpecKit 文档模板)
├── scripts/             # 壳(脚本，含 sync-harness.ps1 + init-project.ps1)
├── workflows/           # 壳(工作流: Sovei / debugging / speckit + USAGE.md 总手册)
├── extensions/          # 壳(SpecKit 扩展)
├── integrations/        # 壳(集成清单)
└── ide-adapters/        # 壳(IDE 适配: Codex / Claude / CodeBuddy / Trae)
```

ABC 的同步命令、保护范围和晋级流程只以 `E:\memory\SYNC.md` 为准。
