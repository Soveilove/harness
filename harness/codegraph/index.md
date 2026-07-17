# 代码地图索引

> 本目录是 Pino Front 项目的代码导航地图，与 `.specify/memory/business-map.md`（业务地图）配套使用。
>
> - **代码地图**回答：代码在哪、链路怎么走、改之前先看什么。
> - **业务地图**回答：业务做什么、边界约束、失败规则、spec 来源。
> - 开发时两者结合：先读业务地图，再读代码地图，再读 skill 检查清单。

## 地图列表

| 地图 | 覆盖范围 | 适用场景 |
|---|---|---|
| [recent-work-code-map.md](recent-work-code-map.md) | 近期需求总览、入口与同步策略 | 当前迭代、跨分支上下文切换 |
| [board-code-map.md](board-code-map.md) | 自由画布稳定链路、参数流、面板细节 | 改自由画布相关功能 |
| [board-video-code-map.md](board-video-code-map.md) | 自由画布视频生成模块专用 | 改视频生成、模型、图层、回填 |

## 使用顺序

1. 确定当前需求属于哪个业务域 → 读 `.specify/memory/business-map.md` 对应条目。
2. 找到该条目里的代码入口 → 回这里读对应地图。
3. 复杂任务遵循地图里的"阅读策略"和"常见任务定位"逐步展开。

## 同步约定

- 多工作目录之间同步：复制 `.specify/codegraph/*.md` 到目标工程的 `.specify/codegraph/`。
- 以文件头部 `Code Map 版本` 较新的为基准；都改过时先合并新增入口再提升版本号。
- 不复制 `.specify/codegraph/*.db`、`cache/`、日志、运行时文件（本目录不放这些）。
