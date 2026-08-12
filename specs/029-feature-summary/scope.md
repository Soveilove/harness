# Scope — 029-feature-summary

> Feature：`sovei feature summary <id>`（P1-2）
> 阶段：scope（真实入口 / 状态 / 参数 / I/O / 消费者追踪）

## 入口

- **CLI 入口**：`src/cli/commands/feature.ts` 的 `registerFeatureCommands(program)`，在 `feature` 命令组下新增 `summary <id>` 子命令（与现有 `archive` 并列）。
- **命令签名**：`sovei feature summary <id> [--json]`，`<id>` 为 Feature ID（位置参数）。

## 状态 / 数据源

| 数据源 | 路径 | 解析方式 | 用途 |
|---|---|---|---|
| 工作流状态 | `specs/<id>/workflow-state.yaml` | 正则逐键（`match(/^status:\s*(\S+)/m)` 等） | featureId/status/riskLevel/completedStages |
| 事件流 | `specs/<id>/workflow-events.jsonl` | 逐行 `JSON.parse` | 时间线：阶段 prepared→complete、任务、门禁覆盖 |
| 阶段产物 | `specs/<id>/<file>` 及 `specs/<id>/_archive/<file>` | `storage.read`（顶层优先，`_archive/` 回退） | 需求/决策/变更/验证/经验/结论各章节 |

## 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `<id>` | string | ✅ | Feature ID，映射到 `specs/<id>/` |
| `--json` | boolean | ❌ | 输出结构化 JSON 到 stdout，不写文件 |

## I/O

- **输入**：读 `specs/<id>/` 下的事件流 + 状态 + 产物（只读，不改写任何产物）。
- **输出**：
  - 默认：写 `specs/<id>/summary.md`（经 `StorageBackend.write`，红线约束），控制台打印路径 + 摘要。
  - `--json`：打印结构化 JSON 到 stdout，不写文件。
- **副作用**：仅新增 `summary.md`，不改动任何既有文件。

## 异步 / 生命周期

- 所有 storage 操作均为 `async`（`StorageBackend` 接口），无并发写需求。
- `summary.md` 每次调用**覆盖重写**（幂等可重复生成，无累计状态）。

## 消费者

- **人类操作者**：终端敲 `sovei feature summary <id>` 看 `.md`。
- **脚本/CI**：`--json` 输出被管道消费（如生成发布说明、Feature 索引）。
- **archive 白名单**：`summary.md` 需加入 `feature.ts` 的 `PERSISTENT_FILES`，避免下次 `feature archive` 误折叠（Q2 决策）。

## 影响面

- 改动文件：`src/cli/commands/feature.ts`（新增子命令 + 核心函数 + 白名单加 summary.md）、`src/cli/index.ts`（无需改，feature 已注册）。
- 新增测试：`test/feature-summary.test.mjs`。
- 无运行时依赖新增。
