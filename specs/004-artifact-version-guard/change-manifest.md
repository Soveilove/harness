# 变更清单

## TASK-001 共享守卫模块

- 新增 `src/config/artifact-version-guard.ts`：
  - `ARTIFACT_FILES`：onboarding 产物路径常量（businessMap / redlineSeed）。
  - `readScannerVersion`：读取产物内嵌 `scannerVersion`；缺失/损坏/无字段返回 null。
  - `findStaleArtifacts`：返回 scannerVersion 存在且 != 当前 VERSION 的路径列表。
  - `assertArtifactsCurrent`：读侧守卫。旧产物存在时打印醒目警告并抛错阻断，除非 `--force`/`--refresh` 放行（放行时打印提示）。
  - `getStaleArtifactVersion`：写侧守卫。返回旧产物版本号，供 onboard/rescan 打印"本次将整体刷新"提示。
- 版本比较：字符串精确相等；产物缺失/损坏视为不旧（静默跳过）。
- `tsc --noEmit` 通过。

## TASK-002 project map / status 接入读侧守卫

- `project map`：新增 `--force`/`--refresh`（别名）选项；action 开头对 `business-map.json` 调用 `assertArtifactsCurrent`。
- `project status`：新增 `--force`/`--refresh` 选项；action 开头对 `business-map.json` + `redlines-seed.json` 调用守卫。
- 旧产物无放行时阻断并打印警告；带 `--force`/`--refresh` 时打印放行提示并正常执行。

## TASK-003 redline list / render 与 knowledge list 接入读侧守卫

- `governance redline list`、`governance redline render`：新增 `--force`/`--refresh` 选项；对 `redlines-seed.json` 调用守卫。
- `knowledge list`：新增 `--force`/`--refresh` 选项；对 `business-map.json` + `redlines-seed.json` 调用守卫。

## TASK-004 onboard 写侧提示 + 新增 rescan

- 提取共享 handler `runOnboardScan(opts)`（含写侧守卫 + 完整 onboard 逻辑）。
- `project onboard` 与 `project rescan` 均调用 `runOnboardScan`，避免逻辑重复。
- 写侧守卫：onboard/rescan 执行前读旧 `business-map.json.scannerVersion`，非 null 打印"本次将整体刷新为 vY"。
- 新增 `sovei project rescan` 子命令：等价于 onboard（同 `--depth`/`--max-entries`/`--max-business-files`/`--evidence-only`/`--dry-run`），语义为"刷新旧产物"。

## TASK-005 守卫模块单元测试

- `src/index.ts` 导出守卫模块全部函数，供测试与程序化使用。
- 新增 `test/artifact-version-guard.test.mjs`：9 个用例覆盖新鲜/旧/缺失/损坏/放行（force/refresh）/阻断/写侧版本对比。

## 验证

- `pnpm run check`（tsc）通过。
- `pnpm run build` 通过。
- `node --test test/artifact-version-guard.test.mjs`：9/9 通过。
- 完整测试套件 `pnpm test`：68/68 通过，无回归。

## 剩余工作

无。
