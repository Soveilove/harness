# 覆盖矩阵

> 由 Sovei 阶段生成：scope
> Feature：005-artifact-guard-hardening

| 覆盖面 | 证据 | 状态 |
|---|---|---|
| `knowledge list` 移除守卫 | `knowledge.ts`（004 加的守卫调用点） | confirmed |
| `status` 降级为不阻断 | `project.ts`（004 加的守卫调用点） | confirmed |
| `map`/`redline` 守卫保留 | 004 已交付，不改动 | confirmed |
| review-pack 门禁审阅补全 | `governance.ts` review-pack 命令 + `004/reconciliation.md` | confirmed |
| CLI 集成测试（map 阻断/放行、rescan 写侧） | `project.test.mjs` 的 execFile + `--root` 先例 | candidate（实现后确认） |
| `knowledge list` 移除 `--force`/`--refresh` 选项 | `knowledge.ts` 命令定义 | candidate |
| reconciliation Sign-off 填充 | `004/reconciliation.md` | candidate |
| tsc + 全量测试通过 | `pnpm run check` + `pnpm test` | candidate |
