# Sub-Change Map

> Feature：001-scanner-polish
> Created：2026-08-14T02:28:50.270Z
> 由 `sovei feature split` 生成。子变更共享 explore→scope 上下文，从 plan→verify 独立推进。

| ID | Name | Goal | Depends On | Status |
|---|---|---|---|---|
| SC-001-scanner-polish-01 | redline-id-dedup | 代码面红线按 pattern 聚合去重，makeId 稳定不依赖文件名，消除候选 ID 翻倍与跨 rescan churn | — | pending |
| SC-001-scanner-polish-02 | package-detection | 按多源 workspace 配置（根 package.json workspaces / pnpm-workspace.yaml / lerna.json）发现并展开包，覆盖 apps/libs/modules 等目录 | — | pending |
| SC-001-scanner-polish-03 | rescan-incremental | rescan 改为按变更文件增量重扫，依赖 SC-1 的稳定 ID 做差异匹配，复用未变产物 | SC-001-scanner-polish-01 | pending |

## 推进规则

- 无依赖的子变更可立即开始：`sovei workflow spec <feature> --sub-change <id>`
- 有依赖的子变更需等依赖全部 merged 后才能进入 spec
- 每个子变更独立走 spec→scope→plan→tasks→implement→converge→verify
- verify 完成后自动 merged
- 全部 merged 后父 Feature 推进 learn→sync
