# Sovei Harness — 本地知识管理引擎

本目录是 Sovei 的稳定知识层。它通过类型化 JSON 管理项目知识，通过工作流引擎管理开发流程。

## 壳料分离

| 层 | 内容 | 换项目时 |
|---|---|---|
| 壳（工具层） | CLI 引擎、阶段定义（产物模板内嵌生成） | 原样保留 |
| 料（项目层） | 踩坑库、代码地图、架构文档、ADR、规则 | 清空重填 |

## 目录

```
harness/
├── index.md                      # 本文件
├── project/                      # 料（项目专属，换项目清空重填）
│   ├── project.config.json       # 项目声明（项目名、技术栈）
│   ├── knowledge/                # 类型化知识（JSON，替代 markdown 约定）
│   │   ├── pitfall.json
│   │   ├── rule.json
│   │   ├── decision.json
│   │   ├── code-map.json
│   │   ├── architecture.json
│   │   ├── preference.json
│   │   └── constitution.json
│   ├── architecture/             # 演进式架构健康、趋势和技术债
│   ├── codegraph/                # 代码地图
│   └── rules/                    # 项目工程规范（*.rules.json）
```
> 说明：`project init` 不再创建 `templates/` 占位目录。产物模板由引擎内嵌生成
> （`getArtifactTemplate`），历史 `harness/templates/` 目录已废弃，可安全删除。

## 知识管理

知识存储在 `project/knowledge/` 下的 JSON 文件中，每类知识一个文件。每个知识条目有：

- **类型**：pitfall / rule / decision / code-map / architecture / preference / constitution
- **生命周期**：candidate → pending → stable → deprecated
- **证据**：来源 Feature、日期、描述、验证状态
- **标签**：用于按任务类型自动加载

使用 CLI 管理知识：

```bash
sovei knowledge add --type pitfall --title "..." --content "..." --feature 001-my-feature --tags "..."
sovei knowledge list
sovei knowledge promote <id>
sovei knowledge stats
```

## 项目工程规范

`project/rules/*.rules.json` 是项目明确声明的工程约束，不等同于
`knowledge/rule.json` 的经验知识，也不等同于 `governance/redlines.json` 的业务红线。
active 规范会按工作流阶段和目标路径进入上下文；required 是必选项，advisory 是建议项。

```bash
# 严格校验 schema 和跨文件重复 ID
sovei rules validate

# 查看实现阶段对目标文件生效的规范
sovei rules resolve --stage implement --paths "packages/sovei-core/src/rules/repository.ts"

# 老项目只生成 candidate；人工确认后才激活并记录审查事件
sovei rules adapt
sovei rules list --lifecycle candidate
# AI code agent 精炼候选：读候选 + 真实代码判断有效/过时，批量废弃噪声
sovei rules refine --reviewer <agent> --reason "<结论>" --discard <噪声ID,逗号分隔>
# 人工确认后激活并记录审查事件
sovei rules activate ADAPTED_... --reviewer maintainer --reason "已核对当前约定"
```

`project init` 无论是否使用 `--blank` 都只创建空 Rules 容器，不猜测默认规范。
`project onboard`（含 `--evidence-only`）会自动从以下来源提取 candidate 规范，
并在重复运行时保留已审查状态：
- Agent/IDE Rules：`AGENTS.md`、`CLAUDE.md`、`.cursorrules`、`.claude/rules/`、`.cursor/rules/`
- 团队规范文档：`doc/`、`docs/`、`CONTRIBUTING.md`、`STYLEGUIDE.md`（含中文文件名/正文）
- 以 markdown 章节为单位提取，自动跳过 Sovei 自身工作流声明与非规范章节
  （目录、快速开始、更新日志、命令示例等）。
- 若文档规范能在 `commitlint.config.*`、`.prettierrc*`、`eslint.config.*`、`package.json`
  等配置文件中找到对应证据，标记 `confidence: high`。

包脚本、TypeScript 配置和技术栈本身不是 Rules 来源；没有原有 Rules 时不生成候选文件。
自动适配不得直接生成 active 规范。

## 演进式架构

使用 `sovei architecture scan` 持续采集文件体积、长函数、复杂度、Git churn、
依赖耦合、循环依赖和职责混杂。单一行数信号不会强制重构；只有多个压力维度
叠加才会进入 `refactor-candidate` 或 `refactor-required`。

```bash
sovei architecture scan --paths src
sovei architecture status
sovei architecture accept <path-or-ARC-id> --reason "重复修改且边界持续恶化"
sovei architecture check --fail-on required
```

## 重大需求变更

业务红线采用双轨存储：事实源是机器可读的 `project/governance/redlines.json`（当前状态）
和 `redline-events.jsonl`（审计事件），AI 上下文从这里读取；人工审查视图是自动派生的
`project/governance/redlines.md`（只读，不要手改）。每次 add/update/deactivate/import 后
视图自动重新生成，也可手动 `sovei governance redline render`。重大需求变化使用 Change
Request，不能让 AI 直接沿用或覆盖旧 Spec：

```bash
sovei governance redline add AUTH_REQUIRED --title "Authentication" \
  --rule "Protected actions require authentication" --enforcement absolute \
  --rationale "未认证调用会造成越权操作" --scope "所有写操作接口" --owner "backend-team"
sovei governance redline update AUTH_REQUIRED --reviewer "maintainer" --rationale "..."
sovei governance redline render   # 重新生成人工审查视图 redlines.md
sovei workflow change 001-my-feature --target grill \
  --summary "New business direction" --reason "Approved product pivot" \
  --dimensions "business-direction,business-redline"
# 填写生成的 CHG-*.json、授权字段和所有红线结论
sovei workflow apply-change 001-my-feature CHG-1234567890
# 放弃变更时显式取消，解除普通工作流冻结
sovei workflow cancel-change 001-my-feature CHG-1234567890 --reason "Direction retained"
```

应用后失效产物归档到 Feature 的 `history/revision-*`。历史文件只能用于显式 diff，
不能作为当前需求或验收标准。没有 active 红线、缺少授权、红线漏审、绝对红线例外、
未授权例外或审查基线过期都会阻止应用。

## 换项目流程

1. 修改 `project/project.config.json` 中的项目名和技术栈
2. 清空 `project/knowledge/*.json` 为 `[]`
3. 清空 `project/codegraph/` 和 `project/rules/`
4. 重新积累知识

## 工作流

Sovei 工作流引擎在 `packages/sovei-core/` 中实现，不依赖本目录。

```bash
# 查看所有阶段
sovei workflow list-stages

# 创建新 Feature
sovei workflow bootstrap 001-my-feature

# 准备阶段，不推进状态
sovei workflow load 001-my-feature
sovei workflow load 001-my-feature --complete
sovei workflow grill 001-my-feature
# 填写 decision-log.md 后
sovei workflow grill 001-my-feature --complete

# 大型工作：建立决策地图，每次只处理一张 frontier 票据
sovei workflow wayfind 001-my-feature
sovei wayfinder chart 001-my-feature --destination "可进入 Spec 的决策闭环"
sovei wayfinder ticket add 001-my-feature --title "确认契约" \
  --question "哪个接口契约有效" --type research --interaction AFK
sovei wayfinder frontier 001-my-feature
sovei wayfinder claim 001-my-feature D-001 --actor research-agent
sovei wayfinder resolve 001-my-feature D-001 --actor research-agent \
  --resolution "使用 v2 契约" --evidence "docs/api-v2.md"
sovei workflow wayfind 001-my-feature --complete

# 小型工作：显式记录不需要地图
sovei wayfinder skip 002-small-fix --reason "单会话可完成且没有未决依赖"
sovei workflow wayfind 002-small-fix --complete

# implement 按 tasks.md 中的稳定任务 ID 逐项完成
sovei workflow implement 001-my-feature --task TASK-001
sovei workflow implement 001-my-feature --task TASK-001 --complete
# 所有任务完成后推进到 converge
sovei workflow implement 001-my-feature --complete

# 返工
sovei workflow reopen 001-my-feature --target scope --reason "..."
```

Wayfinder 的规范数据是 `wayfinder-events.jsonl`；`wayfinder.json` 只做地图索引，
`decision-tickets/*.json` 保存单张票据详情，`wayfinder.md` 是自动生成视图。票据用于
消除规划前的不确定性，不等同于 `tasks.md` 中的实现任务。票据必须先 claim 后 resolve；
HITL/调研票需要证据或上下文引用；fog 必须先毕业成票据，再解决或按 Destination 边界排除。
