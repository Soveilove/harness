# Sovei Harness — 本地知识管理引擎

本目录是 Sovei 的稳定知识层。它通过类型化 JSON 管理项目知识，通过工作流引擎管理开发流程。

## 壳料分离

| 层 | 内容 | 换项目时 |
|---|---|---|
| 壳（工具层） | CLI 引擎、阶段定义、模板 | 原样保留 |
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
│   └── rules/                    # 规则库
└── templates/                    # 壳（文档模板）
```

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

业务红线存储在 `project/governance/redlines.json`，变更审计追加到
`project/governance/redline-events.jsonl`。重大需求变化使用 Change Request，不能让 AI
直接沿用或覆盖旧 Spec：

```bash
sovei governance redline add AUTH_REQUIRED --title "Authentication" \
  --rule "Protected actions require authentication" --enforcement absolute
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
