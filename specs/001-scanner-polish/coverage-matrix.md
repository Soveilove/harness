# 覆盖矩阵

> 由 Sovei 阶段生成：scope
> Feature：001-scanner-polish

---

## 覆盖追踪

| 维度 | M2 红线 ID 翻倍 | M1 单包检测 | M3 rescan 冗余 | 证据 |
|---|---|---|---|---|
| 入口/路由 | `scanCodeSurfaces` Step 3 | `discoverPackages` | `rescan` 命令 | `redline-scanner.ts:350`、`scanner.ts:265`、`project.ts:452` |
| 状态 | 候选红线生成 | 包列表生成 | 全量/增量切换 | 同步流程，无持久状态 |
| 参数 | `pattern`、`file` | workspace 配置路径 | git diff 范围 | 代码已查证 |
| I/O | 读源文件 → 写 `redlines-seed.json` | 读 manifest → 包列表 | 读 git diff → 裁剪文件集 | 同步文件 I/O |
| 异步生命周期 | 无 | 无 | 无 | 扫描为同步流程 |
| 消费者 | `redline-view.ts`、`business-map-scanner.ts` | `business-map-scanner.ts` | `project map` 命令 | 代码已查证 |
| 恢复路径 | rescan 失败保留旧产物 | 同左 | 增量失败回退全量 | `project.ts` 既有逻辑 |
| 兼容路径 | schema 不变 | schema 不变 | 保留全量兜底 | spec.md 已约束 |
| 验证面 | `redline-scanner.test.mjs`、`redline-view.test.mjs` | `scanner.test.mjs` | 待补增量测试 | 既有测试 + 待补 |

## 架构压力记录

| 模块 | 体积 | churn | 耦合 | 复杂度 | 职责 | 升级治理？ |
|---|---|---|---|---|---|---|
| `redline-scanner.ts` | 中 | 低 | 低（被 business-map 消费） | 中 | 红线候选发现 | 否 |
| `scanner.ts` | 中 | 低 | 中（M1/M3 共改） | 中 | 项目扫描主入口 | 否 |
| `business-map-scanner.ts` | 中 | 低 | 低 | 中 | 业务拓扑构建 | 否 |
| `project.ts` | 大 | 中 | 低 | 中 | project 命令集 | 否 |

> 无模块触发多信号叠加，不升级治理要求。

## 缺证据判断

- M3 增量 rescan 的 git diff 集成方式（用 `simple-git` 还是手调 `git` CLI）——标记为 **candidate**，留 plan 阶段定。
- M1 `pnpm-workspace.yaml` 解析（是否引入 `yaml` 依赖）——标记为 **candidate**，留 plan 阶段定。
