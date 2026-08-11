# Scope: 026-feature-archive

## 入口

- **CLI 入口**：`sovei feature archive <id>`
  - 新建 `packages/sovei-core/src/cli/commands/feature.ts`
  - 在 `cli/index.ts` 注册 `registerFeatureCommands(program)`

## 涉及模块

| 模块 | 改动类型 | 说明 |
|---|---|---|
| `cli/commands/feature.ts` | **新建** | `registerFeatureCommands` 导出，注册 `feature archive <id>` 子命令 |
| `cli/index.ts` | **修改** | import + 调用 `registerFeatureCommands(program)` |
| `storage/filesystem.ts` | 不改 | 使用已有 `read/write/delete/list/listEntries` |
| `storage/types.ts` | 不改 | 接口已满足需求 |
| `config/loader.ts` | 不改 | 使用已有 `getFeaturePath` |
| `engine/workflow-engine.ts` | 不改 | 不碰已有 `archiveInvalidatedArtifacts` 逻辑 |

## 状态与参数

- **输入**：Feature ID（命令行参数）
- **状态检查**：读 `{featurePath}/workflow-state.yaml`，检查 `status === 'completed'`
- **归档操作**：
  1. 列出 `{featurePath}` 下所有文件（`storage.list(featurePath)`）
  2. 过滤出 `.md` 文件
  3. 排除持久文件白名单：`decision-log.md`、`sync-report.md`、`load-summary.md`、`wayfinder.md`
  4. 对每个可归档文件：读内容 → 写到 `{featurePath}/_archive/{filename}` → 删原文件
  5. 非 .md 文件（.yaml、.jsonl、.json）不动
  6. 子目录（`history/`、`decision-tickets/`、`_archive/`）不动

## 持久文件白名单（不归档）

| 文件 | 保留理由 |
|---|---|
| `workflow-state.yaml` | 工作流状态 |
| `workflow-events.jsonl` | 事件流 |
| `decision-log.md` | cross-feature 引用依赖 |
| `wayfinder.json` | 决策地图索引 |
| `wayfinder-events.jsonl` | 决策事件流 |
| `wayfinder.md` | 决策地图人可读 |
| `sync-report.md` | Feature 完成标志 |
| `load-summary.md` | grill 依赖（Feature 025） |

## 非功能约束

- **幂等**：`_archive/` 已有同名文件时跳过
- **安全**：移动前检查文件存在，移动后验证 `_archive/` 中文件存在
- **错误处理**：Feature 不存在 → 报错退出；状态非 completed → 报错退出

## 不涉及

- 不碰 `history/` 目录
- 不碰 `decision-tickets/` 目录
- 不碰非 .md 文件
- 不做 `--restore`
- 不做批量归档
