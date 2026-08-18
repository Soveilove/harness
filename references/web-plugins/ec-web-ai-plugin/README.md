# EC Web AI Plugin

EC Web 前端团队的 VS Code Copilot 智能体插件，提供编码规范、自定义 Agent、技能、OpenSpec 工作流和 ec-design MCP 服务。

## 简介

本插件是一个 [VS Code Agent Plugin](https://code.visualstudio.com/docs/agent-customization/agent-plugins)，为 Copilot Chat 提供前端开发全流程的 AI 辅助能力。安装后，插件中的自定义 Agent、技能和 MCP 工具会自动出现在 Copilot Chat 中，与本地自定义配置无缝协同。

## 安装

### 方式一：从远程 Git URL 安装（推荐）

无需手动 clone，VS Code 自动拉取并安装：

1. 在 VS Code 中打开命令面板（`Cmd+Shift+P`），执行 **Chat: Install Plugin From Source**
2. 输入本仓库的 Git URL（如 `https://github.com/your-org/web-plugins.git`）
3. VS Code 会自动 clone 并安装插件

### 方式二：本地开发模式

适合插件开发者调试使用。在 VS Code `settings.json` 中配置：

```json
"chat.pluginLocations": {
    "/path/to/web-plugins/ec-web-ai-plugin": true
}
```

> **注意**：Agent Plugin 目前为预览功能，需确保 `chat.plugins.enabled` 设置为 `true`。

## 插件结构

```
ec-web-ai-plugin/
├── plugin.json              # 插件元数据与配置
├── .mcp.json                # MCP 服务器定义
├── agents/                  # 自定义 Agent（8 个）
│   ├── business-coverage-reporter.agent.md
│   ├── change-archiver.agent.md
│   ├── change-implementation-auditor.agent.md
│   ├── change-execution-orchestrator.agent.md
│   ├── frontend-solution-designer.agent.md
│   ├── interaction-flow-mapper.agent.md
│   ├── prd-scope-analyzer.agent.md
│   └── fullstack-engineer.agent.md
└── skills/                  # 技能（6 个）
    ├── coding-standards/
    ├── ec-build-migration/
    ├── figma-component-implementation/
    ├── grill-me/
    ├── skill-authoring-standards/
    └── vercel-react-best-practices/
```

## 自定义 Agent

插件内置了 8 个专业 Agent，覆盖从需求分析到测试交付与归档的全流程：

| Agent | 说明 | 用户可调用 |
|-------|------|-----------|
| **1-业务扫描** | 从业务视角分析项目页面和功能覆盖范围，输出报告到 `doc/` | ✅ |
| **2-需求拆解** | 从 PRD 中提取 Web 前端需求，确认 change 分组、依赖关系和实施顺序 | ✅ |
| **3-方案设计** | 前端主导设计业务数据结构与接口契约，生成含验收场景的 OpenSpec 产物 | ✅ |
| **4-spec编码** | 独立完成单个 OpenSpec change 的编码，并校验上游硬依赖 | ✅ |
| **5-落地审查** | 逐 change 审查需求映射、规格、代码、规范和静态检查结果 | ✅ |
| **全栈编码** | TypeScript/JavaScript 编码、类型设计、重构与代码审查 | ✅ |
| **6-链路梳理** | 为已实现的活动 change 输出按页面聚合的测试交互链路 | ✅ |
| **7-变更归档** | 在迭代结束后检查、同步规格并归档活动 change | ✅ |

### Agent 工作流

本插件的编号 Agent 形成一条由人工启动的 SDD 流水线。第 1 步在每个 PRD 周期刷新业务基线；第 2 步确认 change 分组与依赖；第 6 步只处理未归档且已实现的活动 change。

```mermaid
graph LR
    A[1-业务扫描] --> B[2-需求拆解]
    B --> C[3-方案设计]
    C --> D[4-spec编码]
    D --> E[5-落地审查]
    E --> F[6-链路梳理]
    F --> G[7-变更归档]
```

## 技能

插件提供 6 个技能，在 Copilot Chat 中按需加载：

### 编码规范类

| 技能 | 说明 |
|------|------|
| `coding-standards` | TypeScript、API、CLI、React、Rematch、Zustand、Web Worker、Less、文件命名和 Git 提交规范 |
| `vercel-react-best-practices` | Vercel React 性能最佳实践（打包优化、渲染优化、异步处理等） |

### 工作流与工具类

| 技能 | 说明 |
|------|------|
| `figma-component-implementation` | Figma 设计稿到 React 组件的实现规范 |
| `ec-build-migration` | EC 项目构建迁移脚本 |
| `grill-me` | 对方案和设计进行深度追问式审查 |
| `skill-authoring-standards` | 技能编写规范与模板 |

> OpenSpec 工作流技能（`openspec-*`）已从插件 skills 目录移除，改为项目级 `.github/skills/` 配置，在 openspec 工作流中自动加载。

## MCP 服务器

插件内置了 `ec-design` MCP 服务器，提供组件库类型定义查询能力：

```json
{
    "mcpServers": {
        "ec-design": {
            "type": "http",
            "url": "http://192.168.1.2:3001/mcp"
        }
    }
}
```

> 安装插件后，MCP 服务器会自动启动。可通过命令面板 **MCP: List Servers** 查看状态。

## 使用方式

1. 在 Copilot Chat 中，通过 `@` 选择对应的 Agent（如 `@4-spec编码`）
2. 也可以直接在对话中使用 `/` 调用技能
3. Agent 会根据任务自动加载相关技能作为编码基准

### 典型工作流示例

```
@1-业务扫描
    → 刷新 doc/BUSINESS_COVERAGE.md 业务基线

@2-需求拆解 /path/to/prd.md
    → 输出需求梳理、change 划分、依赖关系和实施顺序

@3-方案设计 <change-name>
    → 输出含 Requirement/Scenario 的 OpenSpec 方案

@4-spec编码 <change-name>
    → 校验上游依赖后实现单个 change

@5-落地审查
    → 逐 change 核对映射需求、规格场景、代码、规范与静态检查

@6-链路梳理
    → 为已实现的活动 change 重建按页面聚合的测试交互链路

@7-变更归档
    → 在迭代结束后检查、同步规格并归档 change
```

## 配置

### 插件元数据

`plugin.json`：

```json
{
    "name": "ec-web-ai-plugin",
    "description": "EC Web 前端 AI开发插件",
    "version": "1.0.25",
    "author": { "name": "EC Frontend Team" },
    "skills": "skills/",
    "agents": "agents/",
    "mcpServers": ".mcp.json"
}
```

### 本地开发

在 VS Code `settings.json` 中注册本地插件路径：

```json
"chat.pluginLocations": {
    "/path/to/web-plugins/ec-web-ai-plugin": true
}
```

## 兼容性

本插件遵循 Copilot Plugin 格式（`plugin.json` 位于插件根目录），与 VS Code、GitHub Copilot CLI 和 Claude Code 保持跨工具兼容。

## 许可

内部项目，EC Frontend Team © 2026

