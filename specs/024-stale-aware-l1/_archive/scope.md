# 范围追踪：024-stale-aware-l1

> 由 Sovei 阶段生成：scope
> Feature：过期感知 L1

## 涉及的真实入口

| # | 入口 | 文件 | 行号 | 角色 |
|---|---|---|---|---|
| 1 | `sovei context build` | `cli/commands/context.ts` | L41-152 | 主消费点：输出 Markdown / `--json`，需插入过期提示 |
| 2 | `sovei quick` | `cli/commands/quick.ts` | L55-125 | 消费点：人类输出 + `--json`，需插入过期提示 |
| 3 | `sovei workflow sync --complete` | `engine/workflow-engine.ts` `completeStage` | L281-335 | 写入点：sync 完成时记录基线 |
| 4 | `sovei context status` | `cli/commands/context.ts` | L154-183 | 可选的过期状态展示（本次不强制改） |

## 状态与数据流

- **基线数据**：`harness/project/governance/sync-baseline.json`，结构 `{ branch, head, recordedAt }`。
- **写**：sync 完成 → 取 `getGitBaseline(config.rootPath)` → 若非 null 覆盖写入（记录当前分支名 + HEAD + 时间）。
- **读**：`context build` / `quick` 输出前 → 读基线 + 取当前 HEAD → 若 HEAD ≠ 基线 head → `isStale: true`。

## 参数与 I/O

- `getGitBaseline(rootPath)`：execFile `git rev-parse HEAD`，返回 string | null。已存在于 `quick/git-verifier.ts` L53-60。
- 需新增 `git rev-parse --abbrev-ref HEAD` 拿分支名（git-verifier.ts 现有 `git()` 未导出，需新增导出 `getGitBranch()` 或复用）。
- storage 相对路径：`harness/project/governance/sync-baseline.json`。

## 消费者

- 人：`context build` Markdown 顶部警告段 / `quick` 警告行。
- 宿主 AI / 脚本：`--json` 输出的 `stale` 字段。

## 边界与兼容

- 无基线文件（从未 sync）→ `isStale: false`，不提示（AC-4）。
- HEAD 读取失败 / 非 git 仓库 → `isStale: false`，不提示（AC-5）。
- HEAD 与基线相同 → `isStale: false`（AC-6）。
- 基线文件写入为覆盖式（非 append），不触发 NO_SILENT_DATA_LOSS（写入的是新基线，非改写既有治理数据）。

## 验证面

- 新增 `stale-detector.test.mjs` 覆盖：有基线+HEAD不同 → stale=true；无基线 → false；HEAD 读取失败 → false；HEAD 相同 → false；JSON stale 字段结构。
- 新增 sync 写入测试：sync complete 后基线文件含 branch/head/recordedAt。

## 既有架构压力

- `context.ts` / `quick.ts` 是纯 CLI 层，直接调 `getGitBaseline`（quick.ts 已 import）。新增 stale 逻辑保持 CLI 层薄，核心逻辑放独立 `stale-detector.ts`。
- sync 基线写入挂在 `completeStage`（engine 层），需注意 keep engine 职责清晰——只做「sync 时写基线」这一个点，不做其它。
