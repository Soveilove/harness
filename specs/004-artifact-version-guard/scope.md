# 影响范围

> 由 Sovei 阶段生成：scope
> Feature：004-artifact-version-guard

## 入口 / 路由

| 命令 | 文件 | 角色 | 变更 |
|---|---|---|---|
| `sovei project map` | `cli/commands/project.ts` | 读侧（business-map.json） | 接入读侧守卫 + `--force`/`--refresh` |
| `sovei project status` | `cli/commands/project.ts` | 读侧（聚合） | 接入读侧守卫 + `--force`/`--refresh` |
| `sovei project onboard` | `cli/commands/project.ts` | 写侧 | 写侧版本对比提示 |
| `sovei project rescan` | `cli/commands/project.ts` | 写侧（新增） | 新增子命令，复用 onboard |
| `sovei governance redline list` | `cli/commands/governance.ts` | 读侧 | 接入读侧守卫 + `--force`/`--refresh` |
| `sovei governance redline render` | `cli/commands/governance.ts` → `redline-view.ts` | 读侧 | 接入读侧守卫 + `--force`/`--refresh` |
| `sovei knowledge list` | `cli/commands/knowledge.ts` | 读侧 | 接入读侧守卫 + `--force`/`--refresh` |

## 状态 / 数据流

- 产物文件：`harness/project/codegraph/business-map.json`、`harness/project/governance/redlines-seed.json`。
- 版本字段：二者均含 `scannerVersion`；比较对象为 `src/config/version.ts` 的 `VERSION`。
- 读侧数据流：命令读取产物 JSON → `readScannerVersion()` 取 `scannerVersion` → 与 `VERSION` 比较 → 不等则守卫拦截/放行。
- 写侧数据流：`onboard`/`rescan` 执行前 → 读旧 `business-map.json.scannerVersion` → 与 `VERSION` 比较 → 打印刷新提示 → 扫描并覆盖写入。

## 参数

- 新增 `--force` / `--refresh`（别名）到 `map`、`status`、`redline list`、`redline render`、`knowledge list`：语义为"放行旧产物读取"。
- `rescan` 复用 `onboard` 的 `--depth`、`--max-entries`、`--max-business-files`、`--evidence-only`、`--dry-run`。

## API / 契约

- 均为 CLI 命令层变更；不涉及对外 API 破坏。
- 新增 `rescan` 子命令（向后兼容，`CLI_CONTRACT_STABILITY` 安全）。
- 新增可选 `--force`/`--refresh` 选项（向后兼容）。

## 鉴权 / 计费

- 不适用（本地 CLI，无鉴权/计费）。

## 异步生命周期 / 清理

- 守卫检查为同步读 JSON + 同步比较，无异步竞态。
- onboard/rescan 的写入沿用现有 `storage.write` 流程，无新增清理逻辑。

## 历史 / 详情 / 重试

- 产物为 `lifecycle: candidate`，守卫不修改历史；仅提示/放行。
- 重扫（rescan）覆盖 candidate 产物，不触碰已激活红线（现有逻辑已保证）。

## 兼容入口 / 验证面

- 既有命令不带 `--force`/`--refresh` 时，在**新鲜产物**下行为不变；仅旧产物场景新增守卫。
- 产物缺失场景：`map` 保持"业务地图不存在"报错；`redline list`/`knowledge list` 正常运行（守卫对缺失产物静默跳过）。
- 验证面：`test/` 下需为守卫模块新增单测；`project.test.mjs`、`redline-view.test.mjs`、`knowledge.test.mjs` 补充场景。

## 涉及模块的既有架构压力

- `cli/commands/project.ts`：体积较大（约 750 行），含 init/onboard/status/map 四命令；本轮新增 rescan + 守卫接入，需注意不引入重复逻辑（共享守卫模块缓解）。
- `cli/commands/governance.ts`：命令较多，守卫接入需集中到共享模块。
- 无其他高耦合信号；维持 S1 治理等级。
