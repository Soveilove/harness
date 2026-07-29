# Sovei — 便携式开发 SOP 引擎

Sovei 是一个本地知识管理工作流引擎。它定义"怎么沉淀知识"（工作流 + 知识生命周期），不定义"知识是什么"（那是项目专属内容）。

## 设计思想

Sovei 2.0 借鉴五个主流框架的核心思想：

| 借鉴来源 | 核心思想 | 应用层 |
|---|---|---|
| Vite Plugin | hook 生命周期 + 可组合插件 | Stage 定义和扩展 |
| XState | 形式化状态机 + 可序列化 context | Workflow Engine |
| Redux | reducer 纯函数 + typed actions | Knowledge Store |
| NestJS DI | 依赖注入 + 模块化 | Service Container |
| Express Middleware | pipeline + context 传递 | Stage Pipeline |

## 壳料分离

| 层 | 内容 | 换项目时 |
|---|---|---|
| 壳（工具层） | 工作流引擎、模板、CLI、阶段定义 | 原样保留 |
| 料（项目层） | 踩坑库、代码地图、架构文档、ADR、实现规则 | 清空重填 |

当前项目声明见 [harness/project/project.config.json](harness/project/project.config.json)。

## 快速开始

```bash
# 安装依赖
pnpm --dir packages/sovei-core install

# 构建
pnpm --dir packages/sovei-core run build

# 使用 CLI
node packages/sovei-core/dist/cli/index.js --help

# 初始化新项目
node packages/sovei-core/dist/cli/index.js project init ./my-project --name "My Project"

# 创建新 Feature
node packages/sovei-core/dist/cli/index.js workflow bootstrap 001-my-feature

# 执行工作流阶段（每次只执行一个阶段）
node packages/sovei-core/dist/cli/index.js workflow load 001-my-feature
node packages/sovei-core/dist/cli/index.js workflow grill 001-my-feature
# ... 依次执行 12 个阶段

# 查看状态
node packages/sovei-core/dist/cli/index.js workflow status 001-my-feature

# 返工
node packages/sovei-core/dist/cli/index.js workflow reopen 001-my-feature --target scope --reason "发现遗漏"
```

## 工作流阶段

Sovei 2.0 共 12 个阶段，每次调用只执行一个：

```
load → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync
```

查看所有阶段及其契约：

```bash
node packages/sovei-core/dist/cli/index.js workflow list-stages
```

## 知识管理

知识有类型化 schema 和生命周期管理：

```bash
# 添加知识
sovei knowledge add --type pitfall --title "..." --content "..." --tags "vue,events"

# 查看知识
sovei knowledge list
sovei knowledge list --type rule --lifecycle stable

# 晋级知识（candidate → pending → stable）
sovei knowledge promote <id> --feature <feature> --description "证据描述"

# 搜索
sovei knowledge query "内存泄漏"

# 统计
sovei knowledge stats
```

### 知识生命周期

```
candidate (单次观察) → pending (2+ 次验证) → stable (3+ 次验证，人工确认)
```

单次观察永远不会直接晋级到 stable。

## 目录结构

```
sovei/
├── packages/sovei-core/          # TypeScript 引擎包
│   ├── src/
│   │   ├── engine/               # 状态机 + 事件存储
│   │   ├── stages/               # 12 个阶段插件
│   │   ├── knowledge/            # 知识仓库 (Redux store)
│   │   ├── providers/            # DI 容器
│   │   ├── storage/              # 存储后端
│   │   ├── artifacts/            # Artifact 仓库
│   │   ├── config/               # 配置
│   │   └── cli/                  # CLI 命令
│   └── test/                     # 测试
├── harness/                      # 稳定知识层
│   ├── project/                  # 料（换项目清空重填）
│   │   ├── project.config.json   # 项目声明
│   │   ├── knowledge/            # 类型化知识 (JSON)
│   │   ├── codegraph/            # 代码地图
│   │   └── rules/                # 规则库
│   └── templates/                # 壳（文档模板）
├── specs/                        # Feature 实例
└── design-docs/                  # 架构设计文档
```

## 架构设计

详细架构设计见 [design-docs/](design-docs/)。

## 技术栈

- **运行时**：Node.js >= 20
- **语言**：TypeScript 5.x
- **依赖**：commander (CLI)、zod (schema 验证)、yaml (配置解析)
- **无 Python、无 PowerShell 依赖**

## 许可

个人使用。
