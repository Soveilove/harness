# 变更清单：024-stale-aware-l1

> 由 Sovei 阶段生成：implement
> Feature：过期感知 L1

## 已完成任务

- [x] **TASK-001**: `git-verifier.ts` 新增导出 `getGitBranch(workspaceRoot)`——取当前分支名（`git rev-parse --abbrev-ref HEAD`），失败返回 null。
- [x] **TASK-002**: 新增 `src/stale/stale-detector.ts` 模块——导出 `SYNC_BASELINE_PATH`、`StaleStatus`、`checkStale(storage, rootPath)`、`serializeSyncBaseline`、`parseSyncBaseline`、`formatStaleWarning`。判定全分支规则（无基线/HEAD失败/分支不同/HEAD相同→false；同分支且HEAD前进→true）。
- [x] **TASK-003**: `workflow-engine.ts` `completeStage` 在 sync 阶段完成时写仓库级基线文件（branch + head + recordedAt），非 git 仓库静默跳过。
- [x] **TASK-004**: `context.ts` build 命令——Markdown 输出顶部加「⚠ 治理资产可能已过期」警告段；`--json` 给 pack 附加 `stale` 字段。
- [x] **TASK-005**: `quick.ts`——人类输出加警告行；`--json` 给 result 附加 `stale` 字段（不改 QuickRunState schema）。
- [x] **TASK-006**: 新增 `test/stale-detector.test.mjs`（9 条测试覆盖 checkStale 全分支 + parse/serialize + formatWarning + sync 写入基线集成 + 非 git 跳过）。

## 涉及文件

| 文件 | 变更 |
|---|---|
| `src/quick/git-verifier.ts` | 新增 `getGitBranch` 导出 |
| `src/stale/stale-detector.ts` | 新增模块 |
| `src/index.ts` | 导出 stale 模块 |
| `src/engine/workflow-engine.ts` | sync 完成时写基线 |
| `src/cli/commands/context.ts` | build 插入 stale 提示 |
| `src/cli/commands/quick.ts` | 插入 stale 提示 |
| `test/stale-detector.test.mjs` | 新增 9 条测试 |

## 行为说明

- `sovei context build` / `sovei quick` 在存在 sync 基线且同分支 HEAD 前进时提示「治理资产可能已过期」，非阻断 warning 级。
- 从未 sync / 非 git 仓库 / HEAD 相同 → 不提示。
- `sovei workflow sync <feature> --complete` 完成时自动记录仓库级基线。

## 测试

- 173/173 通过（原 164 + 新增 9），`pnpm run check` 通过。

## 剩余工作

- README 命令速查表补充 stale-aware L1 说明（可选，随发布同步）。
- `sync-baseline.json` 建议加入 `.gitignore`（个人运行时数据）。
