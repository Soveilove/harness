# 覆盖矩阵

> 由 Sovei 阶段生成：scope
> Feature：004-artifact-version-guard

| 覆盖面 | 证据 | 状态 |
|---|---|---|
| 读侧守卫：`map` 旧产物拦截/放行 | `project.ts:634` 现有 map 逻辑 + 新守卫模块 | confirmed |
| 读侧守卫：`redline list`/`render` | `governance.ts:54`、`redline-view.ts` | confirmed |
| 读侧守卫：`knowledge list` | `knowledge.ts:29` | confirmed |
| 读侧守卫：`status` | `project.ts:530` | confirmed |
| 写侧守卫：onboard 版本对比提示 | `project.ts:279` onboard action | confirmed |
| 重扫入口：`rescan` 子命令 | `project.ts`（新增） | candidate（实现后确认） |
| 版本源：`VERSION` | `config/version.ts` | confirmed |
| 产物版本字段：`scannerVersion` | `business-map-scanner.ts`、`project.ts:105` | confirmed |
| 守卫模块单测 | `test/*.test.mjs`（新增） | candidate |
| `--force`/`--refresh` 别名选项 | 各命令注册处 | candidate |
| 既有命令无选项时的向后兼容 | 各命令 | candidate |
