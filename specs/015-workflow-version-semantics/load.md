# Feature 015 — Load

## 问题陈述

`workflow.version` 在 `project.config.json` 中声明为 `2.0.0`，与源码中三处定义一致，但该字段是"写后即忘"的纯声明性字段：

1. **无校验**：`loadConfig` 不检查 version 是否与 `DEFAULT_WORKFLOW.version` 匹配
2. **无迁移**：版本变化时没有迁移逻辑处理已 bootstrap 的 Feature
3. **无 bump 规范**：2.2.0 新增确认门、2.3.2 修改 spec 阶段产物契约、2.5.x 新增 Skills 子系统，version 始终停在 2.0.0
4. **无运行时效果**：state-machine reducer 只用 `stageOrder` 和 `stages`，从不读 version

## 源码关键位置

| 文件 | 行 | 内容 |
|---|---|---|
| `engine/workflow-engine.ts` | 36-58 | `DEFAULT_WORKFLOW` 定义，version: '2.0.0' |
| `engine/workflow-engine.ts` | 76-80 | 构造函数用 config.workflow.version 覆盖 DEFAULT_WORKFLOW.version |
| `config/loader.ts` | 27-30 | DEFAULT_CONFIG.workflow.version: '2.0.0' |
| `config/loader.ts` | 55-65 | loadConfig 浅合并，version 无校验 |
| `config/types.ts` | 35-38 | `WorkflowConfig { version: string; stageOrder: string[] }` |
| `engine/types.ts` | 73-79 | `WorkflowDefinition { version, stageOrder, stages, ... }` |
| `engine/state-machine.ts` | 76-92 | 确认门逻辑硬编码，不在 WorkflowDefinition 中 |
| `cli/commands/project.ts` | 186 | project init 写入 version: '2.0.0' |
| `cli/commands/project.ts` | 631 | project status 仅打印 version |

## 上下文要点

- 红线 PERSISTED_SCHEMA_COMPAT 要求：持久化结构变更必须提供迁移路径或兼容读取
- 红线 CLI_CONTRACT_STABILITY 要求：已发布命令名/选项不得破坏性重命名
- 项目规范 RELEASE_VERSION_POLICY：默认仅 patch bump，minor/major 需用户显式声明
- workflow.version 不同于 npm 包版本（2.5.3），前者是工作流定义版本，后者是 CLI 工具版本

## 风险初判

S1 — 变更范围限于 config loader 和 engine 内部逻辑，不修改已发布的 CLI 命令契约，不修改持久化 schema 版本（schemaVersion 仍为 1）。
