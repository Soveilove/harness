# 功能规格

> 由 Sovei 阶段生成：spec
> Feature：004-artifact-version-guard

## 目标

CLI 升级后，让"旧版 onboarding 产物"被显式感知：读侧在发现旧产物时提示并需显式放行，写侧在刷新前告知版本变更，并提供一等公民的重扫入口 `sovei project rescan`。

## 用户可见行为

### 读侧守卫（map / redline list / redline render / knowledge list / project status）

1. 当 `harness/project/codegraph/business-map.json` 或 `harness/project/governance/redlines-seed.json` 存在且其 `scannerVersion` 与当前 CLI `VERSION` 不一致时：
   - 打印醒目警告（含旧版号 → 新版号、建议重扫命令）。
   - 命令被阻断（非零退出码），除非调用方传入 `--force` 或 `--refresh`。
2. 传入 `--force` / `--refresh` 后：打印"已放行旧产物（旧版 vX）"提示，命令照常执行。
3. 产物缺失：保持现状（`map` 报"业务地图不存在"；其余命令正常运行，不报版本守卫）。

### 写侧守卫（project onboard / project rescan）

4. `onboard` / `rescan` 执行前读取旧 `business-map.json.scannerVersion`：
   - 若与当前 `VERSION` 不同，明确打印"检测到旧版产物（vX），本次将整体刷新为 vY"。
   - 若相同或无旧产物，不打印刷新提示。
5. 刷新后的产物 `scannerVersion` 更新为当前 `VERSION`。

### 重扫入口（sovei project rescan）

6. `sovei project rescan` 与 `onboard` 等价（扫描、检测栈、写三类证据文件、适配规则），但语义定位为"刷新旧产物"。
7. `rescan` 复用 `onboard` 的选项（`--depth`、`--max-entries`、`--max-business-files`、`--evidence-only`、`--dry-run`）。

## 边界 / 排除项

- 不实现 schemaVersion 迁移框架（红线 `PERSISTED_SCHEMA_COMPAT` 另行约束）。
- 不改写既有命令名/子命令（红线 `CLI_CONTRACT_STABILITY` 安全）：仅新增选项与新增子命令。
- `--force` / `--refresh` 仅用于"放行旧产物读取"，不触发重扫；重扫用 `rescan`。
- 版本比较采用字符串精确相等（semver 字符串相等），不做区间比较。

## 验收场景

- [ ] `map` 在旧产物下无 `--force`/`--refresh` 时被阻断并打印警告；带 `--force` 后正常输出并标注放行。
- [ ] `redline list` / `redline render` 在旧 redlines-seed.json 下行为同上。
- [ ] `project status` 在旧产物下打印版本提示（可选阻断，见方案）。
- [ ] `onboard` 在旧业务地图存在时打印"本次将整体刷新为 vY"。
- [ ] `project rescan` 可运行并刷新产物 `scannerVersion` 为当前版本。
- [ ] 产物缺失场景行为不被破坏。
- [ ] `--force`/`--refresh` 为新增可选选项，不影响未升级调用的既有行为。
