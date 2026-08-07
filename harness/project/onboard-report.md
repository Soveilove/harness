# Onboard Report — Sovei 自身 onboard（scanner v2.5.6）

> 范围：对 `packages/sovei-core/src/**` 及本项目治理目录做 onboard 分析。
> 本报告只生成 **候选**，不自动激活任何内容。所有红线/知识需人工在 `sovei governance redline list`、`sovei knowledge list --lifecycle candidate` 确认后再启用。
> 本次扫描器版本：2.5.6（business-map 覆盖 113 个内容文件，capabilities 62 个候选，含大量 test/脚本噪声）。

---

## 1. 项目本质

**Sovei 本身** —— 一个纯本地、事件溯源的工作流治理 CLI 引擎。**无认证、无账单、无数据库、无网络服务**。
业务语义集中在三类核心模块：

- **事件溯源状态机**：`engine/state-machine.ts` + `engine/event-store.ts` + `engine/workflow-engine.ts`
- **变更控制/红线治理**：`change-control/repository.ts` + `change-control/schemas.ts` + `change-control/redline-view.ts`
- **决策地图**：`wayfinder/repository.ts` + `wayfinder/reducer.ts` + `wayfinder/selectors.ts`

由于这是 **Sovei 对自己的 onboard**，redline-scanner / business-map 会把"自己的关键词表、测试文件、构建脚本"当作业务证据，产生大量自指误报——本报告重点任务就是剔除这些噪声。

---

## 2. 确认的业务能力（CONFIRMED）

以下能力有真实 `src/` 源码佐证（非测试文件），构成 sovei 的核心领域能力：

| 能力 | 证据文件 | 说明 |
|------|----------|------|
| `cli` | `src/cli/index.ts` + `src/cli/commands/*`（13 命令） | commander CLI 入口，high confidence |
| `engine` | `src/engine/{state-machine,event-store,workflow-engine,types}.ts` | 事件溯源状态机 + 工作流引擎，核心业务 |
| `change-control` | `src/change-control/{repository,schemas,redline-view,index}.ts` | 版本化变更对象、乐观锁、红线评估闸门 |
| `wayfinder` | `src/wayfinder/{repository,reducer,selectors,schemas}.ts` | 决策地图，claim 归属 + 证据强制 |
| `knowledge` | `src/knowledge/{store,lifecycle,reconcile,schemas,selectors}.ts` | 结构化知识库（rule/pitfall/architecture 等）+ 自动对账 |
| `skills` | `src/skills/*`（9 文件） | 外部 Skill 生态：绑定、安装、升级、同步到 Agent 上下文，high confidence |
| `rules` | `src/rules/{adaptation,repository,schemas,index}.ts` | 规则引擎、项目规则适配与精炼 |
| `artifacts` | `src/artifacts/repository.ts` | 产物仓库（变更工件） |
| `architecture` | `src/architecture/{analyzer,policy,repository,types}.ts` | 演进式架构治理 / 分析器 |
| `context` | `src/context/{builder,policy,snapshot}.ts` | 阶段上下文包构建 |
| `quick` | `src/quick/{run,git-verifier,usage,types}.ts` | 快速命令（context/governance 快捷路径） |
| `review` | `src/review/{parser,renderer,index,types}.ts` | reconciliation → tech/product review 渲染 |
| `adapters` | `src/adapters/registry.ts` | 声明式 IDE 适配器注册（gemini/aider/windsurf 等） |
| `providers` | `src/providers/{bootstrap,container,contracts}.ts` | DI 容器 + 提供方抽象 |
| `stages` | `src/stages/{registry,define-stage,index}.ts` | 阶段注册表（契约单一持有） |
| `config` | `src/config/*`（11 文件，含 scanner、artifact-version-guard） | 配置、扫描器、产物版本守卫 |
| `asset` | `src/storage/{filesystem,json,memory,types}.ts` | 存储抽象（原子写 + withLock + 路径包含校验） |

> 注：`asset` 实际对应 `storage` 模块（扫描器命名不精确），本质是一个存储能力，无需拆分。

---

## 3. 被拒绝的候选能力（REJECTED）

| 候选 | 原因 |
|------|------|
| 全部 `*-test`（`agent-test`、`architecture-test`、`artifact-guard-cli-test`、`artifact-version-guard-test`、`change-control-cli-test`、`change-control-test`、`context-policy-test`、`context-test`、`knowledge-test`、`learn-reconcile-test`、`project-test`、`quick-contract-test`、`redline-view-test`、`rules-test`、`scanner-test`、`skill-adapter-test`、`skill-runtime-test`、`usage-git-test`、`wayfinder-cli-test`、`wayfinder-test`、`workflow-test`、`workspace-test`，共 22 个） | 测试文件，非业务能力 |
| `a`、`b` | 单字母名称，无 codeEvidence，测试夹具产物 |
| `clean-dist`、`verify-package`、`publishing` | 构建/发布脚本，工程基础设施而非业务能力 |
| `authentication` | 语义关键词误报；命中仅为 `providers/tokens.ts` 的 DI Symbols 与 `artifact-version-guard.ts` 的 `token` 字样，无真实认证 |
| `billing` | 无 codeEvidence，命中来自测试文件，本项目无账单 |
| `scanner`、`workspace` | 无 codeEvidence，由测试→下游边生成，实际归属 `config`/`storage` |

**均未写入任何配置**（按规则只记录不写入）。

---

## 4. 识别的红线（REDLINES）

### 4.1 redlines-seed.json 的 5 个正则候选 — 全部判定为误报/重复

| 候选 | 判定 | 理由 |
|------|------|------|
| `AUTHENTICATION_AUTHENTICATION_SURFACE_DETECTED_IN_CODE_` | 拒绝 | 无认证；命中为 DI Tokens + `token` 字样 |
| `BILLING_BILLING_SURFACE_DETECTED_ARTIFACT_GUARD_` | 拒绝 | 测试文件命中，无账单 |
| `DATA_INTEGRITY_DATABASE_SCHEMA_SURFACE_DETECTED_IN_CODE` | 重复 | 无数据库；实际对应既有 `PERSISTED_SCHEMA_COMPAT`，不新增 |
| `PERMISSION_PERMISSION_CHECK_DETECTED_CHANGE_MANIFES` | 拒绝 | 命中 spec markdown 文档文本，无真实权限系统 |
| `PERMISSION_PERMISSION_CHECK_DETECTED_DECISION_LOG_M` | 拒绝 | 同上，命中 decision-log.md 文档文本 |

**均未新增**。扫描器 SURFACE_KEYWORDS 字典（auth/billing/permission）对本地工具类代码天然误报，详见既有知识条目 `pitfall-redline-scanner-surface-keywords-auth-billing-18d095b6`。

### 4.2 既有红线（redlines.json 已存在，确认有效，不重复添加）

- **绝对红线**：`NO_SILENT_DATA_LOSS`、`AUDIT_LOG_APPEND_ONLY`、`CONFIRMATION_GATE_INTEGRITY`、`CHANGE_REQUEST_OPTIMISTIC_LOCK`、`PATH_TRAVERSAL_CONTAINMENT`、`WAYFINDER_CLAIM_OWNERSHIP`、`WAYFINDER_EVENT_APPEND_ONLY`
- **需审批**：`PERSISTED_SCHEMA_COMPAT`、`CLI_CONTRACT_STABILITY`

（`AUTH_REQUIRED`、`BILLING_CONTRACT`、`API_RATE_LIMIT` 为早期扫描误报，现为 inactive。）

### 4.3 本次新提交的红线候选（agent-generated，待人工确认）

| ID | 强制级 | 来源代码 | 理由 |
|----|--------|----------|------|
| `ARTIFACT_VERSION_GUARD_INTEGRITY` | absolute | `config/artifact-version-guard.ts` | onboarding 产物（business-map/redlines-seed）嵌入 scannerVersion，与当前 CLI VERSION 不一致时读取侧默认拦截、写入侧提示刷新；防止 CLI 升级后旧产物被静默当作当前事实驱动错误决策 |
| `REDLINE_ASSESSMENT_REQUIRED` | absolute | `change-control/repository.ts` `validateForApply` | applyChange 前每条 active 红线必须有显式 disposition（compliant+evidence / approved-exception 且 absolute 不可豁免 / violation 阻断）；这是红线从"声明"落到"执行"的唯一闸门 |
| `STORAGE_WRITE_DISCIPLINE` | approval-required | `storage/filesystem.ts` | harness/project 与 specs 的写应走 StorageBackend（原子写 + withLock + 路径包含校验），不得直接用 node:fs 绕过 |

---

## 5. 写入的知识候选（knowledge）

本次新增（`--feature onboard`）：

- `rule-onboarding-artifact-version-guard-b75b0278`（rule）：artifact-version-guard 的读取/写入双守卫行为与默认拦截语义。
- `rule--a7a0b9b8`（rule）：重大变更应用前每条生效红线必须显式评估的 validateForApply 闸门（标题首字符为非 ASCII，生成 id 无 slug，属无害命名瑕疵，可后续重命名）。

既有候选（复用，不再重复添加）：`rule-business-map-monorepo-codeevidence-d67e5cd2`、`pitfall-redline-scanner-surface-keywords-auth-billing-18d095b6`、`rule-sovei-33d2ba08`、`rule-storage-write-withlock-fs-06f02384` 等。

---

## 6. 精炼的项目规则（rules）

`adapted.rules.json` 初含 **21 条 `ADAPTED_codex_*` 候选**，经核对全部判定为 **重复/过时噪声**，已通过 `sovei rules refine --discard` 一次性废弃：

- 全部 21 条均从 7 个 `.claude/worktrees/agent-*/AGENTS.md` 工作树副本的同一「Windows PowerShell 开发环境」章节提取，只覆盖 3 种内容（`source .profile.ps1` / `cmd /c` 透传 / `RunRaw` 帮助），互相重复。
- `appliesTo.paths` 全部指向 `.claude/worktrees/agent-*/**` 临时工作树目录，而非仓库根；实际约定由根 `.profile.ps1`（1.56 KB，含 UTF-8 / SilentContinue / RunRaw）自文档承载。
- 精炼结果：**废弃 21 条，剩余 0 条待人工激活**。
- 若团队确需将该 PowerShell 约定纳入项目规则，应由人工合并为 **一条** 规范并修正路径范围为仓库根，再 `sovei rules activate <id> --reviewer ... --reason ...` 激活。

---

## 7. 待人工审查的开放问题

1. **三条新增红线是否入 active**：`ARTIFACT_VERSION_GUARD_INTEGRITY`、`REDLINE_ASSESSMENT_REQUIRED`、`STORAGE_WRITE_DISCIPLINE`。前两者建议保留为绝对红线；`STORAGE_WRITE_DISCIPLINE` 更偏工程纪律，可考虑保持 `approval-required` 或并入既有 `PATH_TRAVERSAL_CONTAINMENT`。
2. **`workflow.version mismatch`**：本仓 `harness/project/project.config.json` 声明 `2.0.0`，而源码 `DEFAULT_WORKFLOW.version` 已是 `3.0.0`。每次 CLI 调用均告警。需人工确认是更新 project.config 至 3.0.0（若已消费 019-contract-single-source 的契约变更）还是存在未完成迁移。
3. **`asset` ↔ `storage` 命名**：建议后续把 business-map 的 `asset` 能力重命名为 `storage` 以反映真实模块，属低优先清理。
4. **`publishing` 能力**：`scripts/build-release.mjs` 是真实发布逻辑但归类为工程基础设施。若团队把发布视为业务能力（对外契约），建议人工重分类并评估是否新增发布相关红线（当前未加）。
5. **知识条目命名瑕疵**：`rule--a7a0b9b8` 因标题以非 ASCII 起始产生空 slug id，若在意可人工用 `sovei knowledge` 重建或重命名。

---

*生成方式：`sovei context build` 证据 + 逐文件核对真实源码 + `sovei governance redline add`（--origin agent-generated）/ `sovei knowledge add` / `sovei rules refine`。所有产物均为候选，待人工通过 `sovei governance redline list` / `sovei knowledge list --lifecycle candidate` / `sovei rules list --lifecycle candidate` 确认后再启用。*
