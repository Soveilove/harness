# 业务红线（人工审查视图）

> 本文件由 `sovei governance redline render` 自动生成，仅供人工阅读与审查。
> 事实源是 `redlines.json`（当前状态）与 `redline-events.jsonl`（审计事件），AI 上下文从事实源读取。
> 请勿手改本文件；修改红线请使用 `sovei governance redline add/update/deactivate`，操作后会自动重新生成。

- 生成时间：2026-08-05T14:46:56.014Z
- 生效红线：7 条（绝对 5 / 审批 2）
- 已停用：3 条
- 待审候选：0 条

## 级别说明

- **绝对红线（absolute）**：不允许例外。重大变更评审（Change Request）中只能标记 unaffected 或 compliant，标记 approved-exception 会被拒绝应用。
- **审批红线（approval-required）**：允许授权例外，但必须提供审批人、审批时间和审批依据（approvedBy / approvedAt / approvalReference）。

## 生效红线一览

| ID | 标题 | 级别 | 规则 | 为什么 | 最后更新 |
|---|---|---|---|---|---|
| NO_SILENT_DATA_LOSS | No silent data loss on upgrade | 绝对红线 | CLI upgrades must not silently rewrite project data in harness/project/ or specs/ | CLI 升级时静默重写项目数据会丢失人工积累的踩坑和决策记录，破坏信任 | 2026-08-05 |
| AUDIT_LOG_APPEND_ONLY | 工作流事件日志必须只追加 | 绝对红线 | workflow-events.jsonl 只能通过 EventStore.append 追加写入，禁止改写或删除历史事件；revision 必须单调递增且状态只能由 replay 事件推导得出 | 状态是 fold(events) 的结果（engine/event-store.ts replay），workflow-state.yaml 仅是缓存。改写历史事件会让已确认的 gate、审批和任务完成记录凭空消失或被伪造，治理审计链断裂且不可发现。 | 2026-08-05 |
| CONFIRMATION_GATE_INTEGRITY | 确认门禁不可绕过 | 绝对红线 | spec 阶段（S2/S3 风险）与 verify 阶段（始终）完成后必须集齐 product 与 tech 两个角色的确认；未确认时状态必须为 blocked，不得进入下一阶段。override 必须显式记录 reason 与操作人 | 门禁是 Sovei 的核心产品承诺（state-machine.ts:76-92）。若允许静默跳过，使用者会以为变更已获产品与技术双签，实际未经任何审查，直接导致治理失效。 | 2026-08-05 |
| CHANGE_REQUEST_OPTIMISTIC_LOCK | 变更请求必须校验基线版本 | 绝对红线 | applyChange 前必须校验 request.baseEventRevision 等于当前事件末位 revision 且 baseCurrentStage 等于当前阶段，不匹配必须拒绝；同一 changeId 不得重复应用 | workflow-engine.ts:267-273 的乐观锁是防止并发变更互相覆盖的唯一机制。去掉后，基于过期状态生成的变更会静默回滚他人已完成的阶段推进与审批。 | 2026-08-05 |
| PATH_TRAVERSAL_CONTAINMENT | 所有文件写入必须限制在项目根目录内 | 绝对红线 | 任何来自 artifact 路径、featureId、changeId 或模板的路径，在读写前必须解析并校验落在 rootPath 之内，禁止 .. 逃逸与绝对路径 | FilesystemStorage.resolve 只做 join(rootPath, p) 未做包含性校验（storage/filesystem.ts:14）。workflow-engine.ts:466 单点检查了 supersededArtifacts 的 ..，说明风险已知但未在存储层统一收口。CLI 会消费 specs/ 下的用户可编辑文件，恶意或误写的路径可覆盖仓库外文件。 | 2026-08-05 |
| PERSISTED_SCHEMA_COMPAT | 持久化数据格式变更需向后兼容 | 审批红线 | 所有 schemaVersion:1 的持久化结构（wayfinder、rules、change-control、business-map、architecture、context snapshot）变更时必须提供迁移路径或兼容读取，不得让旧项目数据解析失败 | 全项目 7 处 z.literal(1) 硬校验（wayfinder/schemas.ts:43、rules/schemas.ts:46、change-control/schemas.ts:59 等），但代码中没有任何迁移逻辑。改成 literal(2) 会让所有存量项目的 CLI 直接抛错，用户已积累的决策与红线数据无法读取。 | 2026-08-05 |
| CLI_CONTRACT_STABILITY | CLI 命令契约是对外契约 | 审批红线 | 已发布的命令名、子命令、必填选项与退出码构成对外契约；重命名或删除必须先弃用并给出迁移期，不得直接破坏 | sovei 以 npm 包 + bin 分发，AGENTS.md 中记录的命令被用户脚本、CI 与 AI agent 提示词直接引用。破坏性重命名会让下游自动化静默失败。 | 2026-08-05 |

## 红线详情

### NO_SILENT_DATA_LOSS — No silent data loss on upgrade

- **级别**：绝对红线（absolute）
- **规则**：CLI upgrades must not silently rewrite project data in harness/project/ or specs/
- **为什么有这条红线**：CLI 升级时静默重写项目数据会丢失人工积累的踩坑和决策记录，破坏信任
- **适用范围**：harness/project/ 和 specs/ 下的所有文件
- **负责人**：platform-team
- **人工审查**：maintainer（2026-08-05）
- **创建**：2026-08-03 **最后更新**：2026-08-05

### AUDIT_LOG_APPEND_ONLY — 工作流事件日志必须只追加

- **级别**：绝对红线（absolute）
- **规则**：workflow-events.jsonl 只能通过 EventStore.append 追加写入，禁止改写或删除历史事件；revision 必须单调递增且状态只能由 replay 事件推导得出
- **为什么有这条红线**：状态是 fold(events) 的结果（engine/event-store.ts replay），workflow-state.yaml 仅是缓存。改写历史事件会让已确认的 gate、审批和任务完成记录凭空消失或被伪造，治理审计链断裂且不可发现。
- **适用范围**：packages/sovei-core/src/engine/event-store.ts, specs/*/workflow-events.jsonl
- **典型违规示例**：
  - 直接编辑 workflow-events.jsonl 删除一条 CONFIRM 事件以撤销审批
  - 用 storage.write 覆盖事件日志而非 append
- **人工审查**：未审查。确认后执行：`sovei governance redline update AUDIT_LOG_APPEND_ONLY --reviewer "..."`
- **来源**：人工声明
- **创建**：2026-08-05 **最后更新**：2026-08-05

### CONFIRMATION_GATE_INTEGRITY — 确认门禁不可绕过

- **级别**：绝对红线（absolute）
- **规则**：spec 阶段（S2/S3 风险）与 verify 阶段（始终）完成后必须集齐 product 与 tech 两个角色的确认；未确认时状态必须为 blocked，不得进入下一阶段。override 必须显式记录 reason 与操作人
- **为什么有这条红线**：门禁是 Sovei 的核心产品承诺（state-machine.ts:76-92）。若允许静默跳过，使用者会以为变更已获产品与技术双签，实际未经任何审查，直接导致治理失效。
- **适用范围**：packages/sovei-core/src/engine/state-machine.ts, workflow-engine.ts confirmStage/overrideConfirm
- **典型违规示例**：
  - 在 pendingConfirmations 非空时仍允许 advance 到下一阶段
  - OVERRIDE_CONFIRM 不写入 overrideReason
- **人工审查**：未审查。确认后执行：`sovei governance redline update CONFIRMATION_GATE_INTEGRITY --reviewer "..."`
- **来源**：人工声明
- **创建**：2026-08-05 **最后更新**：2026-08-05

### CHANGE_REQUEST_OPTIMISTIC_LOCK — 变更请求必须校验基线版本

- **级别**：绝对红线（absolute）
- **规则**：applyChange 前必须校验 request.baseEventRevision 等于当前事件末位 revision 且 baseCurrentStage 等于当前阶段，不匹配必须拒绝；同一 changeId 不得重复应用
- **为什么有这条红线**：workflow-engine.ts:267-273 的乐观锁是防止并发变更互相覆盖的唯一机制。去掉后，基于过期状态生成的变更会静默回滚他人已完成的阶段推进与审批。
- **适用范围**：packages/sovei-core/src/engine/workflow-engine.ts applyChange
- **典型违规示例**：
  - 跳过 baseEventRevision 比对直接应用陈旧的变更请求
- **人工审查**：未审查。确认后执行：`sovei governance redline update CHANGE_REQUEST_OPTIMISTIC_LOCK --reviewer "..."`
- **来源**：人工声明
- **创建**：2026-08-05 **最后更新**：2026-08-05

### PATH_TRAVERSAL_CONTAINMENT — 所有文件写入必须限制在项目根目录内

- **级别**：绝对红线（absolute）
- **规则**：任何来自 artifact 路径、featureId、changeId 或模板的路径，在读写前必须解析并校验落在 rootPath 之内，禁止 .. 逃逸与绝对路径
- **为什么有这条红线**：FilesystemStorage.resolve 只做 join(rootPath, p) 未做包含性校验（storage/filesystem.ts:14）。workflow-engine.ts:466 单点检查了 supersededArtifacts 的 ..，说明风险已知但未在存储层统一收口。CLI 会消费 specs/ 下的用户可编辑文件，恶意或误写的路径可覆盖仓库外文件。
- **适用范围**：packages/sovei-core/src/storage/filesystem.ts
- **典型违规示例**：
  - change-manifest 中写入 ../../.git/hooks/pre-commit 作为 superseded artifact
  - featureId 传入 ../../../etc 导致目录穿越
- **人工审查**：未审查。确认后执行：`sovei governance redline update PATH_TRAVERSAL_CONTAINMENT --reviewer "..."`
- **来源**：人工声明
- **创建**：2026-08-05 **最后更新**：2026-08-05

### PERSISTED_SCHEMA_COMPAT — 持久化数据格式变更需向后兼容

- **级别**：审批红线（approval-required）
- **规则**：所有 schemaVersion:1 的持久化结构（wayfinder、rules、change-control、business-map、architecture、context snapshot）变更时必须提供迁移路径或兼容读取，不得让旧项目数据解析失败
- **为什么有这条红线**：全项目 7 处 z.literal(1) 硬校验（wayfinder/schemas.ts:43、rules/schemas.ts:46、change-control/schemas.ts:59 等），但代码中没有任何迁移逻辑。改成 literal(2) 会让所有存量项目的 CLI 直接抛错，用户已积累的决策与红线数据无法读取。
- **适用范围**：所有 src/**/schemas.ts 与 harness/project/**、specs/** 下的 JSON/JSONL
- **典型违规示例**：
  - 把 schemaVersion 从 literal(1) 改为 literal(2) 且不提供迁移
- **人工审查**：未审查。确认后执行：`sovei governance redline update PERSISTED_SCHEMA_COMPAT --reviewer "..."`
- **来源**：人工声明
- **创建**：2026-08-05 **最后更新**：2026-08-05

### CLI_CONTRACT_STABILITY — CLI 命令契约是对外契约

- **级别**：审批红线（approval-required）
- **规则**：已发布的命令名、子命令、必填选项与退出码构成对外契约；重命名或删除必须先弃用并给出迁移期，不得直接破坏
- **为什么有这条红线**：sovei 以 npm 包 + bin 分发，AGENTS.md 中记录的命令被用户脚本、CI 与 AI agent 提示词直接引用。破坏性重命名会让下游自动化静默失败。
- **适用范围**：packages/sovei-core/src/cli/**, AGENTS.md 中记录的命令
- **典型违规示例**：
  - 把 sovei workflow confirm 改名且不保留别名
- **人工审查**：未审查。确认后执行：`sovei governance redline update CLI_CONTRACT_STABILITY --reviewer "..."`
- **来源**：人工声明
- **创建**：2026-08-05 **最后更新**：2026-08-05

## 已停用红线

- **AUTH_REQUIRED** — Protected actions require authentication（2026-08-05 停用：误报：本项目是本地 CLI 工作流引擎，无用户账户、无登录、无购买流程。扫描器命中的是 redline-scanner.ts/business-map-scanner.ts 自身的关键词字典以及 DI 的 TOKENS 常量，非真实鉴权逻辑。）
- **BILLING_CONTRACT** — Billing contract changes require approval（2026-08-05 停用：误报：代码库中不存在计费、支付、订阅或退款逻辑。命中来源为 redline-scanner.ts:38 的 billing 关键词字典本身。）
- **API_RATE_LIMIT** — API rate limits cannot be weakened（2026-08-05 停用：演示数据，已验证完毕，移除）

## 变更历史（最近 20 条）

| 时间 | 事件 |
|---|---|
| 2026-08-05T14:46:56.010Z | 停用红线 BILLING_CONTRACT：误报：代码库中不存在计费、支付、订阅或退款逻辑。命中来源为 redline-scanner.ts:38 的 billing 关键词字典本身。 |
| 2026-08-05T14:46:55.214Z | 停用红线 AUTH_REQUIRED：误报：本项目是本地 CLI 工作流引擎，无用户账户、无登录、无购买流程。扫描器命中的是 redline-scanner.ts/business-map-scanner.ts 自身的关键词字典以及 DI 的 TOKENS 常量，非真实鉴权逻辑。 |
| 2026-08-05T14:46:44.265Z | 新增红线 CLI_CONTRACT_STABILITY |
| 2026-08-05T14:46:33.220Z | 新增红线 PERSISTED_SCHEMA_COMPAT |
| 2026-08-05T14:46:20.469Z | 新增红线 PATH_TRAVERSAL_CONTAINMENT |
| 2026-08-05T14:46:06.744Z | 新增红线 CHANGE_REQUEST_OPTIMISTIC_LOCK |
| 2026-08-05T14:45:55.119Z | 新增红线 CONFIRMATION_GATE_INTEGRITY |
| 2026-08-05T14:45:42.905Z | 新增红线 AUDIT_LOG_APPEND_ONLY |
| 2026-08-05T03:00:25.966Z | 停用红线 API_RATE_LIMIT：演示数据，已验证完毕，移除 |
| 2026-08-05T02:59:44.578Z | 更新红线 API_RATE_LIMIT（字段：rationale, reviewedBy, reviewedAt） |
| 2026-08-05T02:59:34.498Z | 新增红线 API_RATE_LIMIT |
| 2026-08-05T02:55:41.498Z | 更新红线 NO_SILENT_DATA_LOSS（字段：rationale, scope, owner, reviewedBy, reviewedAt） |
| 2026-08-05T02:55:41.317Z | 更新红线 BILLING_CONTRACT（字段：rationale, scope, owner, reviewedBy, reviewedAt） |
| 2026-08-05T02:55:41.163Z | 更新红线 AUTH_REQUIRED（字段：rationale, scope, owner, reviewedBy, reviewedAt） |
| 2026-08-03T08:18:52.591Z | 新增红线 NO_SILENT_DATA_LOSS |
| 2026-08-03T08:18:52.589Z | 新增红线 BILLING_CONTRACT |
| 2026-08-03T08:18:52.584Z | 新增红线 AUTH_REQUIRED |
