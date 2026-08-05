# 实施计划

> 由 Sovei 阶段生成：plan
> Feature：005-artifact-guard-hardening

## 模块边界

### 修改：`src/cli/commands/knowledge.ts`

- `knowledge list`：移除 `.option('--force')`、`.option('--refresh')` 及 action 开头的 `assertArtifactsCurrent` 调用。还原为纯知识列表。
- 移除 `getStorage()` 函数与 `ARTIFACT_FILES`/`assertArtifactsCurrent` import（若不再被其他命令使用）。

### 修改：`src/cli/commands/project.ts`

- `project status`：移除 `.option('--force')`、`.option('--refresh')` 及 action 开头的 `assertArtifactsCurrent` 调用。还原为纯健康检查。
- `map`/`onboard`/`rescan`：**不改动**（保留守卫）。

### 门禁审阅补全（针对 004）

- 运行 `sovei governance review-pack generate 004-artifact-version-guard`：生成 `tech-review.md` + `product-review.md`。
- 运行 `sovei governance review-pack import 004-artifact-version-guard --product <product-review.md> --by <name> --reference <ref>`：补 product 确认。
- 若 004 的 tech 门禁仍需确认，用 `workflow confirm 004-artifact-version-guard --stage verify --role tech --by <name> --reference <ref>` 补齐。
- 更新 `004/reconciliation.md` 的 Sign-off 表格（product/tech 签字信息）。

### 新增：`test/artifact-guard-cli.test.mjs`

- 复用 `project.test.mjs` 的 `execFileAsync(process.execPath, [cli, '--root', root, ...])` + 临时目录模式。
- 用例：
  1. `map` 在旧 business-map.json（scannerVersion 非当前）下无放行被阻断（退出码非 0 + 错误含"守卫拦截"）。
  2. `map --force` 放行并正常输出业务拓扑。
  3. `map --refresh` 放行（别名）。
  4. `rescan --dry-run` 打印"本次将整体刷新为 vY"写侧提示。
  5. `knowledge list` 在旧产物下不阻断（回归 005 修正）。
  6. `status` 在旧产物下不阻断（回归 005 修正）。

## 状态 / 数据流

```
knowledge list → 直接列知识（不读 onboarding 产物版本）
status         → 直接输出状态（不触发守卫）
map/redline    → 守卫保留（004 已交付）
004 门禁        → review-pack generate/import → confirmGate
```

## 契约

- `knowledge list`、`status` 移除 `--force`/`--refresh`（未发布的 004 新增选项，移除不破坏已发布契约）。
- `map`/`redline list`/`render` 保留放行选项。
- `map` 阻断、`rescan` 写侧提示行为与 004 完全一致。

## 迁移策略

- 无 schemaVersion 变更。
- 004 工作流状态不动；005 仅补门禁审阅产物 + 修正守卫边界。

## 验证方式

- `pnpm run check`（tsc）。
- `pnpm run build`。
- `node --test test/artifact-guard-cli.test.mjs`（新增 CLI 集成测试）。
- `pnpm test` 全量回归。
