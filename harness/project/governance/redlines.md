# 业务红线（人工审查视图）

> 本文件由 `sovei governance redline render` 自动生成，仅供人工阅读与审查。
> 事实源是 `redlines.json`（当前状态）与 `redline-events.jsonl`（审计事件），AI 上下文从事实源读取。
> 请勿手改本文件；修改红线请使用 `sovei governance redline add/update/deactivate`，操作后会自动重新生成。

- 生成时间：2026-08-05T03:00:25.973Z
- 生效红线：3 条（绝对 2 / 审批 1）
- 已停用：1 条
- 待审候选：2 条（扫描器生成，未激活）

## 级别说明

- **绝对红线（absolute）**：不允许例外。重大变更评审（Change Request）中只能标记 unaffected 或 compliant，标记 approved-exception 会被拒绝应用。
- **审批红线（approval-required）**：允许授权例外，但必须提供审批人、审批时间和审批依据（approvedBy / approvedAt / approvalReference）。

## 生效红线一览

| ID | 标题 | 级别 | 规则 | 为什么 | 最后更新 |
|---|---|---|---|---|---|
| AUTH_REQUIRED | Protected actions require authentication | 绝对红线 | All purchase and account mutations require authenticated identity | 购买和账户变更涉及真实金钱和隐私，未认证调用会造成越权操作和资金风险 | 2026-08-05 |
| BILLING_CONTRACT | Billing contract changes require approval | 审批红线 | Price, renewal, refund, and entitlement semantics require business approval | 价格、续费、退款和权益语义直接关系收入，AI 不能自行判断业务取舍，需人工确认 | 2026-08-05 |
| NO_SILENT_DATA_LOSS | No silent data loss on upgrade | 绝对红线 | CLI upgrades must not silently rewrite project data in harness/project/ or specs/ | CLI 升级时静默重写项目数据会丢失人工积累的踩坑和决策记录，破坏信任 | 2026-08-05 |

## 红线详情

### AUTH_REQUIRED — Protected actions require authentication

- **级别**：绝对红线（absolute）
- **规则**：All purchase and account mutations require authenticated identity
- **为什么有这条红线**：购买和账户变更涉及真实金钱和隐私，未认证调用会造成越权操作和资金风险
- **适用范围**：所有 purchase/account 写操作接口
- **负责人**：backend-team
- **人工审查**：maintainer（2026-08-05）
- **创建**：2026-08-03 **最后更新**：2026-08-05

### BILLING_CONTRACT — Billing contract changes require approval

- **级别**：审批红线（approval-required）
- **规则**：Price, renewal, refund, and entitlement semantics require business approval
- **为什么有这条红线**：价格、续费、退款和权益语义直接关系收入，AI 不能自行判断业务取舍，需人工确认
- **适用范围**：billing 模块的价格/续费/退款/权益字段
- **负责人**：business-owner
- **人工审查**：maintainer（2026-08-05）
- **创建**：2026-08-03 **最后更新**：2026-08-05

### NO_SILENT_DATA_LOSS — No silent data loss on upgrade

- **级别**：绝对红线（absolute）
- **规则**：CLI upgrades must not silently rewrite project data in harness/project/ or specs/
- **为什么有这条红线**：CLI 升级时静默重写项目数据会丢失人工积累的踩坑和决策记录，破坏信任
- **适用范围**：harness/project/ 和 specs/ 下的所有文件
- **负责人**：platform-team
- **人工审查**：maintainer（2026-08-05）
- **创建**：2026-08-03 **最后更新**：2026-08-05

## 已停用红线

- **API_RATE_LIMIT** — API rate limits cannot be weakened（2026-08-05 停用：演示数据，已验证完毕，移除）

## 待审候选（扫描器生成，未激活）

> 候选来自 `redlines-seed.json`，不会自动生效。人工确认后逐条激活：
> `sovei governance redline add <ID> --title "..." --rule "..." --enforcement absolute --rationale "..."`
> 已确认不需要的候选可忽略；重复运行扫描会覆盖 seed 文件，但不会影响已激活红线。

| ID | 置信度 | 类别 | 标题 | 规则 | 来源 | 状态 |
|---|---|---|---|---|---|---|
| AUTHENTICATION_AUTHENTICATION_SURFACE_DETECTED_IN_CODE_ | medium | authentication | Authentication surface detected in code structure | All authentication-related routes and middleware must require valid identity | packages/sovei-core/src/providers/tokens.ts | 待审 |
| DATA_INTEGRITY_DATABASE_SCHEMA_SURFACE_DETECTED_IN_CODE | medium | data-integrity | Database/schema surface detected in code structure | Database schema changes require migration and integrity verification | packages/sovei-core/src/architecture/repository.ts, packages/sovei-core/src/artifacts/repository.ts, packages/sovei-core/src/change-control/repository.ts, packages/sovei-core/src/change-control/schemas.ts, packages/sovei-core/src/knowledge/schemas.ts, packages/sovei-core/src/wayfinder/repository.ts, packages/sovei-core/src/wayfinder/schemas.ts | 待审 |

## 变更历史（最近 20 条）

| 时间 | 事件 |
|---|---|
| 2026-08-05T03:00:25.966Z | 停用红线 API_RATE_LIMIT：演示数据，已验证完毕，移除 |
| 2026-08-05T02:59:44.578Z | 更新红线 API_RATE_LIMIT（字段：rationale, reviewedBy, reviewedAt） |
| 2026-08-05T02:59:34.498Z | 新增红线 API_RATE_LIMIT |
| 2026-08-05T02:55:41.498Z | 更新红线 NO_SILENT_DATA_LOSS（字段：rationale, scope, owner, reviewedBy, reviewedAt） |
| 2026-08-05T02:55:41.317Z | 更新红线 BILLING_CONTRACT（字段：rationale, scope, owner, reviewedBy, reviewedAt） |
| 2026-08-05T02:55:41.163Z | 更新红线 AUTH_REQUIRED（字段：rationale, scope, owner, reviewedBy, reviewedAt） |
| 2026-08-03T08:18:52.591Z | 新增红线 NO_SILENT_DATA_LOSS |
| 2026-08-03T08:18:52.589Z | 新增红线 BILLING_CONTRACT |
| 2026-08-03T08:18:52.584Z | 新增红线 AUTH_REQUIRED |
