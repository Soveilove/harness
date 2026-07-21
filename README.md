# Sovei Harness 中枢

`E:\memory` 只承担两件事：

1. 在 `harness/` 维护经过确认的稳定开发知识、规则、模板和工具。
2. 按 [SYNC.md](SYNC.md) 将稳定 Harness 分发到 A/B/C 工程。

## 生效边界

| 路径 | 定位 | 是否分发 |
|---|---|---|
| `harness/` | 当前稳定 Harness 的唯一源 | 是 |
| `.agents/`、`.codebuddy/` | 中枢自身的 Agent/IDE 适配 | 仅分发脚本明确列出的适配文件 |
| `design-docs/SOVEI_HARNESS_WORKFLOW_DESIGN.md` | 新版 Sovei 架构基线 | 否 |
| `.agents/skills/sovei-workflow/` | Sovei 1.1 核心 Skill 和确定性脚本 | 按同步脚本分发 |
| `.codebuddy/`、`.trae/` | CodeBuddy 命令/Skill 与 Trae Skill 薄适配 | 按同步脚本分发明确列出的 Sovei 文件 |
| `packages/sovei-system/` | 中枢系统的私有 pnpm package、依赖和审计 CLI | 否 |
| `specs/` | 中枢自身的 Feature 实例和验证证据 | 否 |
| `SYNC.md` | A/B/C 同步的唯一操作指引 | 否 |

Sovei 1.1.0 已启用 `load`、`grill`、`wayfind`、`spec`、`scope`、`plan`、`tasks`、`implement`、`converge`、`verify`、`learn`、`sync`，并支持 `reopen` 返工控制动作。Codex、Claude Code、CodeBuddy 和 Trae 共用同一状态机；每次调用只执行一个阶段，然后输出下一条需要在新上下文中调用的命令。阶段的真实 Skill 依赖和可替换第三方候选统一登记在 `harness/workflows/sovei/skill-map.yaml`。

工作流的场景选择、命令格式、阶段停止条件和常见问题统一见 [Sovei 工作流使用指引](harness/workflows/sovei/USAGE.md)。

当前执行任一阶段都只实际使用仓库内的 `sovei-workflow` 和 `knowledge-loader`；所有 Matt Pocock Skills 仍是 `candidate_not_installed`，不会被自动调用。Cursor Adapter 和外部 Skill 生命周期仍未实现；不得因为设计文档或 Skill Map 中出现某项候选能力，就让 Agent 假定系统已经具备该能力。

## 中枢 Package

`packages/sovei-system` 是本仓库自己的私有项目。Node 依赖安装在该目录的 `node_modules`，版本锁定在同目录 `pnpm-lock.yaml`，不参与 A/B/C 分发。

```powershell
pnpm --dir packages\sovei-system install
pnpm --dir packages\sovei-system run check
pnpm --dir packages\sovei-system run skills -- load
```

新增系统依赖时，在该 package 中执行 `pnpm add <package>` 或 `pnpm add -D <package>`，不要把依赖散装到仓库根目录或 Harness 发布目录。

## 数据所有权

- 中枢只保存已经审查并可跨工程复用的稳定内容。
- `specs/`、`.specify/feature.json`、项目根 `AGENTS.md`/`CLAUDE.md` 和项目 Baseline 属于工程实例，不得跨工程覆盖。
- 分支中的候选知识不能直接覆盖中枢。先在来源工程验证，再人工提炼和晋级。
- A/B/C 之间禁止相互复制 `.specify/`；所有稳定分发都从 `E:\memory\harness` 发出。

架构设计见 [SOVEI_HARNESS_WORKFLOW_DESIGN.md](design-docs/SOVEI_HARNESS_WORKFLOW_DESIGN.md)，日常同步只看 [SYNC.md](SYNC.md)。
