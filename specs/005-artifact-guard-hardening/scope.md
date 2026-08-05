# 影响范围

> 由 Sovei 阶段生成：scope
> Feature：005-artifact-guard-hardening

## 入口 / 路由

| 命令/文件 | 角色 | 变更 |
|---|---|---|
| `sovei knowledge list`（knowledge.ts） | 读侧 | 移除 onboarding 产物守卫 + 移除 `--force`/`--refresh` 选项 |
| `sovei project status`（project.ts） | 读侧 | 从硬阻断降级为不阻断（移除守卫调用） |
| `sovei project map`（project.ts） | 读侧 | **保留**守卫（不动） |
| `sovei governance redline list`/`render`（governance.ts） | 读侧 | **保留**守卫（不动） |
| `sovei project rescan`/`onboard`（project.ts） | 写侧 | **保留**写侧守卫（不动） |
| `sovei governance review-pack generate/import`（governance.ts） | 门禁 | 对 004 执行，生成 tech-review/product-review + 补 product 确认 |
| `specs/004-artifact-version-guard/reconciliation.md` | 门禁 | 补 Sign-off 表格 |

## 状态 / 数据流

- `knowledge list`：不再读 business-map/redlines-seed 版本，直接列知识。
- `status`：不再触发守卫，直接输出聚合状态。
- 004 门禁：`review-pack generate` 解析 `004/reconciliation.md` → 渲染两个审阅视图 → `import` 导入 product 确认 → confirmGate('product')。

## 参数

- `knowledge list`：移除 `--force`/`--refresh`（不再有意义）。
- `status`：移除 `--force`/`--refresh`。
- `map`/`redline list`/`render`：保留 `--force`/`--refresh`。

## API / 契约

- 移除 `knowledge list`、`status` 上的 `--force`/`--refresh` 选项（这两个选项是本 feature 004 刚加的，未发布，移除不违反 CLI_CONTRACT_STABILITY——未构成已发布契约）。
- `map`/`redline` 保留放行选项。
- 无命令名变更。

## 鉴权 / 计费

- 不适用。

## 异步生命周期 / 清理

- 无新增异步/清理逻辑。

## 历史 / 详情 / 重试

- 004 工作流状态不动；005 仅为其补门禁审阅产物。
- `review-pack import` 会触发 004 的 product confirmGate（若 004 的 verify 门禁仍待 product 确认）。

## 兼容入口 / 验证面

- `knowledge list`/`status` 在旧产物下不再阻断（行为变化，符合本 feature 目标）。
- `map` 守卫行为不变（004 已交付）。
- 验证面：新增 CLI 集成测试文件，复用 `project.test.mjs` 的 execFile + `--root` 模式。

## 涉及模块的既有架构压力

- `knowledge.ts`/`project.ts`：移除代码，降低复杂度，无新增压力。
- `review/renderer.ts`、`review/parser.ts`：被 review-pack 命令复用，无改动。
- 维持 S1 治理等级。
