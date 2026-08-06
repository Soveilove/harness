# 上下文包：017-node14-compat / spec

> 生成时间：2026-08-06T16:59:34.708Z
> 适配器：（默认）
> 查询：（无）

## 必选上下文（required）

### 红线 NO_SILENT_DATA_LOSS（absolute）

```
CLI upgrades must not silently rewrite project data in harness/project/ or specs/
为什么：CLI 升级时静默重写项目数据会丢失人工积累的踩坑和决策记录，破坏信任
适用范围：harness/project/ 和 specs/ 下的所有文件
```

### 红线 AUDIT_LOG_APPEND_ONLY（absolute）

```
workflow-events.jsonl 只能通过 EventStore.append 追加写入，禁止改写或删除历史事件；revision 必须单调递增且状态只能由 replay 事件推导得出
为什么：状态是 fold(events) 的结果（engine/event-store.ts replay），workflow-state.yaml 仅是缓存。改写历史事件会让已确认的 gate、审批和任务完成记录凭空消失或被伪造，治理审计链断裂且不可发现。
适用范围：packages/sovei-core/src/engine/event-store.ts, specs/*/workflow-events.jsonl
典型违规示例：直接编辑 workflow-events.jsonl 删除一条 CONFIRM 事件以撤销审批；用 storage.write 覆盖事件日志而非 append
```

### 红线 CONFIRMATION_GATE_INTEGRITY（absolute）

```
spec 阶段（S2/S3 风险）与 verify 阶段（始终）完成后必须集齐 product 与 tech 两个角色的确认；未确认时状态必须为 blocked，不得进入下一阶段。override 必须显式记录 reason 与操作人
为什么：门禁是 Sovei 的核心产品承诺（state-machine.ts:76-92）。若允许静默跳过，使用者会以为变更已获产品与技术双签，实际未经任何审查，直接导致治理失效。
适用范围：packages/sovei-core/src/engine/state-machine.ts, workflow-engine.ts confirmStage/overrideConfirm
典型违规示例：在 pendingConfirmations 非空时仍允许 advance 到下一阶段；OVERRIDE_CONFIRM 不写入 overrideReason
```

### 红线 CHANGE_REQUEST_OPTIMISTIC_LOCK（absolute）

```
applyChange 前必须校验 request.baseEventRevision 等于当前事件末位 revision 且 baseCurrentStage 等于当前阶段，不匹配必须拒绝；同一 changeId 不得重复应用
为什么：workflow-engine.ts:267-273 的乐观锁是防止并发变更互相覆盖的唯一机制。去掉后，基于过期状态生成的变更会静默回滚他人已完成的阶段推进与审批。
适用范围：packages/sovei-core/src/engine/workflow-engine.ts applyChange
典型违规示例：跳过 baseEventRevision 比对直接应用陈旧的变更请求
```

### 红线 PATH_TRAVERSAL_CONTAINMENT（absolute）

```
任何来自 artifact 路径、featureId、changeId 或模板的路径，在读写前必须解析并校验落在 rootPath 之内，禁止 .. 逃逸与绝对路径
为什么：FilesystemStorage.resolve 只做 join(rootPath, p) 未做包含性校验（storage/filesystem.ts:14）。workflow-engine.ts:466 单点检查了 supersededArtifacts 的 ..，说明风险已知但未在存储层统一收口。CLI 会消费 specs/ 下的用户可编辑文件，恶意或误写的路径可覆盖仓库外文件。
适用范围：packages/sovei-core/src/storage/filesystem.ts
典型违规示例：change-manifest 中写入 ../../.git/hooks/pre-commit 作为 superseded artifact；featureId 传入 ../../../etc 导致目录穿越
```

### 红线 PERSISTED_SCHEMA_COMPAT（approval-required）

```
所有 schemaVersion:1 的持久化结构（wayfinder、rules、change-control、business-map、architecture、context snapshot）变更时必须提供迁移路径或兼容读取，不得让旧项目数据解析失败
为什么：全项目 7 处 z.literal(1) 硬校验（wayfinder/schemas.ts:43、rules/schemas.ts:46、change-control/schemas.ts:59 等），但代码中没有任何迁移逻辑。改成 literal(2) 会让所有存量项目的 CLI 直接抛错，用户已积累的决策与红线数据无法读取。
适用范围：所有 src/**/schemas.ts 与 harness/project/**、specs/** 下的 JSON/JSONL
典型违规示例：把 schemaVersion 从 literal(1) 改为 literal(2) 且不提供迁移
```

### 红线 CLI_CONTRACT_STABILITY（approval-required）

```
已发布的命令名、子命令、必填选项与退出码构成对外契约；重命名或删除必须先弃用并给出迁移期，不得直接破坏
为什么：sovei 以 npm 包 + bin 分发，AGENTS.md 中记录的命令被用户脚本、CI 与 AI agent 提示词直接引用。破坏性重命名会让下游自动化静默失败。
适用范围：packages/sovei-core/src/cli/**, AGENTS.md 中记录的命令
典型违规示例：把 sovei workflow confirm 改名且不保留别名
```

### 红线 WAYFINDER_CLAIM_OWNERSHIP（absolute）

```
resolve 或 exclude 决策票据前必须校验当前 actior 即为该票据的 claim.actor，claim 过期后 exclude 才允许 overrideExpired；未占有的票据禁止被他人 resolve
为什么：wayfinder/repository.ts 与 reducer.ts 多处强制 claim 归属（resolve 要求 claim.actor===actor，exclude 要求未过期占有人一致），这是防止一个 agent 覆盖他人决策结论、保证决策地图唯一事实来源不被篡改的唯一机制。去掉后任何 ticket 都可被任意 actor 改写结论。hitting 与 research 票据的 resolve 还强制要求 evidence 或 contextPointers，删除该守卫会允许无证据结论通过。
适用范围：packages/sovei-core/src/wayfinder/repository.ts, wayfinder/reducer.ts
典型违规示例：绕过 claim 直接 resolve 他人占有的票据
```

### 红线 WAYFINDER_EVENT_APPEND_ONLY（absolute）

```
wayfinder-events.jsonl 的每条事件 revision 必须严格等于其顺序索引；读取时校验 revision===index，禁止改写、删除、重排已记录的事件
为什么：wayfinder/repository.ts 的 readEvents 在还原聚合时强制校验每条 event.revision===index，任何缺失/重排/改写都会触发校验失败。它是决策地图事实来源的不可变日志，类似 AUDIT_LOG_APPEND_ONLY 但作用于 wayfinder 域。破坏后无法用事件溯源还原正确聚合，导致决策历史失真。
适用范围：packages/sovei-core/src/wayfinder/repository.ts
典型违规示例：删除或重排 wayfinder-events.jsonl 中的某条事件
```

### rule rule-workflow-engine-acecf4c6（stable，确定性必选）

```
executeStage/completeStage 的守卫顺序固定：assertNoPendingChanges → canExecuteStage → preExecute → checkRequired(必需产物) → 模板占位符 SOVEI_TEMPLATE_PLACEHOLDER 检查 → 阶段特有校验（implement 校验 tasks.md 全部完成且 change-manifest.md 引用 taskId；wayfind 校验 decisionMap）。新增阶段应把校验挂在这条链上（stageDef.contract / preExecute），不要在 CLI 层各自实现，否则校验会被其他入口绕过。
```

### 项目规范 RELEASE_VERSION_POLICY（required，harness/project/rules/project.rules.json）

```
每次发布时，AI 默认只递增 patch 版本号（即 semver 第三位，如 2.5.1 → 2.5.2）。禁止自行根据 commit 类型（feat/fix 等）推断 minor 或 major bump。只有当用户显式声明升级大版本时（如'升 minor'、'升 major'、'发大版本'、'bump minor'、'bump major'），才允许递增 minor 或 major 位。用户未声明时，AI 不得将 minor 或 major 版本号作为默认行为，也不得以 commit 历史中有 feat 提交为由自行升级 minor。

Verification:
- review: 对比远端最新版本与待发布版本，确认仅 patch 位递增；若 minor/major 递增，需用户显式声明
```

### Feature 产物 decision-log.md

```
# 决策日志：017-node14-compat

> 由 Sovei 阶段生成：grill
> Feature：017-node14-compat — 让发布产物在 Node 14 上可运行

## 目标

发布到 npm 的 `@soveilove/sovei` CLI 二进制（`dist/release/sovei.js`）必须能在 Node 14 上正常安装和运行。背景：公司电脑主流环境是 Node 14，用户用 `npm install -g @soveilove/sovei` 装好后要能直接跑 `sovei` 命令。

---

## 一、事实核实（已决）

| # | 事实 | 结论 | 依据 |
|---|---|---|---|
| F1 | 发布产物是 esbuild 打成的**单文件**，`dependencies` 为空（零运行时依赖） | 运行时只依赖 Node 内置 API + 降级后的 JS 语法，**不需要** devDeps | package.json dependencies:{}；build-release.mjs |
| F2 | 源码用 `.at(-1)` 3 处 | Node 16.6+ 才有，Node 14 不可用，需替换为 `arr[arr.length-1]` | workflow-engine.ts:380/394、business-map-scanner.ts:192 |
| F3 | scripts 用 `import.meta.dirname` 2 处 | Node 20.11+ 才有，Node 14 不可用。但 scripts 是构建脚本（本机 Node 20+ 跑），需随产物改 CJS 时一并处理 | build-release.mjs:6、clean-dist.mjs:4 |
| F4 | 源码用 `crypto.randomUUID` 多处 | Node **14.17.0** 引入，14.17+ 可用 | wayfinder/repository.ts:1、workflow-engine.ts:33 等 |
| F5 | 测试框架用 `node:test`（所有 test/*.mjs） | Node 18+ 才有。但测试是开发链路，本机 Node 20+ 跑，**不影响 Node 14 运行发布产物** | 测试脚本 node --test |
| F6 | esbuild 构建 target 是 `node20` | 生成的产物语法针对 Node 20，需降到 node14 才能保证 Node 14 运行 | build-release.mjs:29 |
| F7 | 当前发布产物是纯 ESM（package.json "type":"module"） | Node 14 的 ESM 支持有严重缺陷，需改 CJS | package.json type |
| F8 | devDeps engines 大多要求 Node 16-22 | 只影响构建环境（本机 Node 22），**无需降级** | npm view 查询 |

## 二、可推断决策（已决）

| # | 决策 | 理由 | 被拒绝方案 |
|---|---|---|---|
| D1 | 发布产物 ESM → **CommonJS** | Node 14 的 CJS 最稳定；ESM 在 Node 14 上有 import.meta.dirname 不可用、node: 前缀限制、条件 exports 支持差等缺陷 | 保持 ESM（风险高）；双形态 ESM+CJS（复杂度高，当前 bin 单文件无必要） |
| D2 | esbuild `target: 'node20'` → `'node14'`，format 改 cjs | 让产物 JS 语法降到 Node 14 可解析 | 手动降级语法（易漏，不可维护） |
| D3 | `.at(-1)` 替换为 `arr[arr.length-1]` | Node 14 无 `.at()` | 保留 `.at()`（Node 14 直接崩溃） |
| D4 | `import.meta.dirname` 替换 | Node 14 无此 API。构建脚本随产物改 CJS 时一并处理 | 保留（Node 14 不可用） |
| D5 | `engines.node` 从 `>=20` 改为 `>=14.17.0` | 最低可支持到 Node 14.17（crypto.randomUUID 引入版本） | 声明 >=14.0（randomUUID 需额外 polyfill） |
| D6 | 测试框架 `node:test` **保留** | 测试是开发链路，本机 Node 20+ 跑，不影响 Node 14 用户 | 替换 node:test（无必要，工作量巨大） |

## 三、范围性决策（已决，用户确认/授权）

| # | 决策 | 状态 | 说明 |
|---|---|---|---|
| S1 | 目标版本：**严格兼容 Node 14** | 用户确认 | 公司主流环境是 Node 14 |
| S2 | 兼容范围：**仅发布产物（CLI 二进制）需在 Node 14 运行** | 用户确认 | 用户场景：Node 14 机器 install -g 后跑 CLI；开发/构建/测试链路仍用 Node 20+ |
| S3 | 发布产物形态：改为 **CommonJS** | 用户授权"你看着办" | 见 D1 |

## 四、范围性决策（已决，AI 决策，用户全权授权"你看着办"）

| # | 决策 | 理由 |
|---|---|---|
| S4 | 最低 Node 子版本：`>=14.17.0` | crypto.randomUUID 在 14.17 引入，声明 14.17 最稳；如需支持更老版本再用 randomBytes polyfill（本期不做，保持 14.17 门槛） |
| S5 | 验证方式：本机用 nvm-windows 装 Node 14 LTS（14.21.x），对发布产物跑 smoke 测试（--version + 基础命令），并跑项目现有 107 测试兜底 | 确保 Node 14 真能跑，避免"看似兼容实则崩溃" |

## 五、范围边界（本期不做）

- 开发/构建/测试链路不降级（tsc/tsx/esbuild/node:test 保持 Node 20+）
- 不支持 Node 14 ESM 形态（发布产物统一 CJS）
- 不引入 Node 14 专用 polyfill 依赖（保持零运行时依赖）
- 不支持 Node <14（Node 14 已是 EOL 版本，不再向下）

## 未决项

无。决策树已闭环。

```

### Feature 产物 wayfinder.md

```
# 决策地图

## 目标

无需建立决策地图：S1 小型工作：grill 决策树已闭环（目标 Node14 / 产物 CJS / 仅发布产物兼容），剩余为实施细节无需跨会话决策地图

## 已完成决策

（无）

## 尚未明确

（无）

## 范围外

（无）

```

## 建议参考（suggested）

- architecture architecture-detected-project-architecture-e653d953（candidate，建议参考）
- architecture architecture-yaml-9233ecb5（candidate，建议参考）
- architecture architecture-knowledge-reconciliation-pattern-c54d31eb（candidate，建议参考）
- code-map code-map-project-code-map-d8f0c145（candidate，建议参考）
- code-map code-map-sovei-core-79da577c（candidate，建议参考）
- constitution constitution-single-responsibility-2ccddf43（candidate，建议参考）
- constitution constitution-explicit-over-implicit-259e3834（candidate，建议参考）
- pitfall pitfall-type-vs-interface-for-shared-contracts-97c37fb2（candidate，建议参考）
- pitfall pitfall--50d86944（candidate，建议参考）
- pitfall pitfall-business-map-4-monorepo-724de14e（candidate，建议参考）
- pitfall pitfall-redline-list-all-ec103733（candidate，建议参考）
- pitfall pitfall-governance-redline-add-origin-manual-99f85ba7（candidate，建议参考）
- pitfall pitfall-redline-scanner-surface-keywords-auth-billing-18d095b6（candidate，建议参考）
- rule rule-avoid-any-use-unknown-ea0b5798（candidate，建议参考）
- rule rule-storage-write-withlock-fs-06f02384（candidate，建议参考）
- rule rule-fail-fast-517eafb9（candidate，建议参考）
- rule rule-business-map-monorepo-codeevidence-d67e5cd2（candidate，建议参考）
- rule rule-sovei-33d2ba08（candidate，建议参考）
- rule rule-带-references-目录的三方-skill-必须内联参考文件才能自包含-120b5c98（candidate，建议参考）

## 知识快照

- indexVersion: 1786035574706
- sourceHash: 4178058dd2625ead…
- entryCount: 20
- stale: 否

