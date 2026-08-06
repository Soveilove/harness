# Onboard Report — Sovei 自身再扫描（v2.3.3）

> 范围：对 `packages/sovei-core/src/**` 及本项目治理目录做二次 onboard（首次分析后代码与扫描器均已演进）。
> 本报告只生成 **候选**，不自动激活任何内容。所有红线/知识需人工在 `sovei governance redline list`、`sovei knowledge list --lifecycle candidate` 确认后再启用。
> 本次扫描器版本：2.3.3（business-map 已从"语义/引用推断"改为"路径推断 + 语义关键词表"，可覆盖到 `src/**`）。

---

## 1. 项目本质

**Sovei 本身** —— 一个纯本地、事件溯源的工作流治理 CLI 引擎。**无认证、无账单、无数据库、无网络服务**。
业务语义集中在三类核心模块：

- **事件溯源状态机**：`engine/state-machine.ts` + `engine/event-store.ts` + `engine/workflow-engine.ts`
- **变更控制/红线治理**：`change-control/repository.ts` + `change-control/schemas.ts` + `change-control/redline-view.ts`
- **决策地图**：`wayfinder/repository.ts` + `wayfinder/reducer.ts` + `wayfinder/selectors.ts`

由于这是 **Sovei 对自己的 onboard**，redline-scanner 与 knowledge-scanner 会把"自己的关键词表/目录结构"当作证据，产生大量自指误报——本报告重点任务就是剔除这些噪声。

---

## 2. 确认的业务能力（CONFIRMED）

以下能力有真实源码佐证（非测试文件），构成 sovei 的核心领域能力：

| 能力 | 证据文件 | 说明 |
|------|----------|------|
| `engine` | `src/engine/{state-machine,event-store,workflow-engine}.ts` | 事件溯源状态机 + 工作流引擎，核心业务 |
| `change-control` | `src/change-control/{repository,schemas,redline-view,types}.ts` | 版本化变更对象、乐观锁、红线视图 |
| `wayfinder` | `src/wayfinder/{repository,reducer,selectors,schemas}.ts` | 决策地图，claim 归属 + 证据强制 |
| `knowledge` | `src/knowledge/{store,schemas}.ts` | 结构化知识库（rule/pitfall/architecture 等） |
| `rules` | `src/rules/{index,repository}.ts` | 规则引擎与规则仓库 |
| `artifacts` | `src/artifacts/repository.ts` | 产物仓库（变更工件） |
| `architecture` | `src/architecture/analyzer.ts` | 架构分析器 |
| `context` | `src/context/builder.ts` | 上下文构建器 |
| `stages` | `src/stages/index.ts` | 工作流阶段定义 |
| `config` | `src/config/*`（含 scanner、artifact-version-guard） | 配置与扫描器 |
| `providers` | `src/providers/*` | LLM 提供方抽象 |
| `review` | `src/review/*` | 评审模块 |
| `adapters` | `src/adapters/registry.ts` | 适配器注册 |
| `cli` | `src/cli/*` | commander CLI 入口 |
| `asset` | `src/storage/{filesystem,json,memory,types}.ts` | 存储抽象（文件/内存/JSON） |

> 注：`asset` 实际对应 `storage` 模块（扫描器命名不精确），本质是一个存储能力，无需拆分。

---

## 3. 被拒绝的候选能力（REJECTED）

| 候选 | 原因 |
|------|------|
| 全部 `*-test`、`*`-cli-test（15+ 个） | 测试文件，非业务能力 |
| `a`、`b` | 单字母名称，无 codeEvidence，测试夹具产物 |
| `clean-dist`、`verify-package`、`publishing` | 构建/发布脚本，工程基础设施而非业务能力 |
| `authentication` | 语义关键词误报；命中仅为 `providers/tokens.ts` 的 DI Symbols 与 `artifact-version-guard.ts` 的 `token` 字样，无真实认证 |
| `billing` | 无 codeEvidence，命中来自测试文件，本项目无账单 |
| `scanner`、`workspace` | 无 codeEvidence，由测试→下游边生成，实际归属 `config` |

**均未写入任何配置**（按规则只记录不写入）。

---

## 4. 识别的红线（REDLINES）

### 4.1 redlines-seed.json 的 5 个候选 — 全部判定为误报/重复

| 候选 | 判定 | 理由 |
|------|------|------|
| `AUTHENTICATION_...` | 拒绝 | 无认证；命中为 DI Tokens + `token` 字样 |
| `BILLING_BILLING_...` | 拒绝 | 测试文件命中，无账单 |
| `DATA_INTEGRITY_DATABASE_SCHEMA_...` | 重复 | 无数据库；实际对应既有 `PERSISTED_SCHEMA_COMPAT`，不新增 |
| `PERMISSION_PERMISSION_CHECK_...`（×2，来自 spec 文档） | 拒绝 | 无真实权限系统；已由 `CONFIRMATION_GATE_INTEGRITY` / 变更请求授权覆盖 |

**均未新增**。扫描器字典（auth/billing/permission）对本地工具类代码天然误报，详见知识条目 `pitfall-redline-scanner-...`。

### 4.2 既有红线（redlines.json 已存在，确认有效，不重复添加）

- **绝对红线**：`NO_SILENT_DATA_LOSS`、`AUDIT_LOG_APPEND_ONLY`、`CONFIRMATION_GATE_INTEGRITY`、`CHANGE_REQUEST_OPTIMISTIC_LOCK`、`PATH_TRAVERSAL_CONTAINMENT`
- **需审批**：`PERSISTED_SCHEMA_COMPAT`、`CLI_CONTRACT_STABILITY`

### 4.3 本次新提交的红线候选（agent-generated，待人工确认）

| ID | 强制级 | 来源代码 | 理由 |
|----|--------|----------|------|
| `WAYFINDER_CLAIM_OWNERSHIP` | absolute | `wayfinder/repository.ts`、`wayfinder/reducer.ts` | resolve/exclude 强制校验 claim 归属，防止他人覆盖决策结论；删除守卫会允许无证据/越权改写决策地图 |
| `WAYFINDER_EVENT_APPEND_ONLY` | absolute | `wayfinder/repository.ts` | `readEvents` 强制 `revision===index` 单调校验，事件日志不可改写/重排，类似 `AUDIT_LOG_APPEND_ONLY` 但作用于 wayfinder 域 |

---

## 5. 写入的知识候选（knowledge）

- `rule-business-map-monorepo-codeevidence-d67e5cd2`（rule）：扫描器已能到达 monorepo 真实源码，但产物仍含噪声，必须按 codeEvidence 交叉验证。
- `pitfall-redline-scanner-surface-keywords-auth-billing-18d095b6`（pitfall）：redline-scanner 的 SURFACE_KEYWORDS 字典对本地工具类代码产生 auth/billing 自指误报。
- `rule-sovei-33d2ba08`（rule）：事件溯源 + 变更门禁是 sovei 核心业务语义所在，改到相关模块前先查既有红线与 reconciliation。

---

## 6. 待人工审查的开放问题

1. **新增两条红线是否应入 active**：`WAYFINDER_CLAIM_OWNERSHIP`、`WAYFINDER_EVENT_APPEND_ONLY` 均被识别为绝对红线。请确认是否与既有 `AUDIT_LOG_APPEND_ONLY` / 事件溯源完整性存在重复覆盖，决定保留为独立红线还是合并。
2. **`asset` ↔ `storage` 命名**：建议在后续把 business-map 的 `asset` 能力重命名为 `storage` 以反映真实模块，属低优先清理。
3. **既有 `redlines.json` 是否需要据本次代码复审重新审视**：`PATH_TRAVERSAL_CONTAINMENT` 已在 `storage/filesystem.ts` 中实现（路径包含校验），`governance` CLI 已支持 `--origin`；确认这些修复无需放宽既有红线强度。
4. **`publishing` 能力**：`scripts/build-release.mjs` 是真实发布逻辑但归类为工程基础设施。若团队把发布视为业务能力（对外契约），建议人工重分类并评估是否新增发布相关红线（当前未加）。

---

*生成方式：`sovei context build` 证据 + 逐文件核对真实源码 + `sovei governance redline add` / `sovei knowledge add`。所有产物均为候选，待人工通过 `sovei governance redline list` / `sovei knowledge list --lifecycle candidate` 确认。*
