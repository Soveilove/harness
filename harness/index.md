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
sovei knowledge add --type pitfall --title "..." --content "..." --tags "..."
sovei knowledge list
sovei knowledge promote <id>
sovei knowledge stats
```

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

# 执行阶段
sovei workflow load 001-my-feature
sovei workflow grill 001-my-feature
# ...

# 返工
sovei workflow reopen 001-my-feature --target scope --reason "..."
```
