# Onboard 分析报告

> 生成方式：AI agent 阅读 Sovei 采集的证据 + 实际源码交叉验证
> 生成时间：2026-08-05
> 状态：**全部为候选项，未激活**，等待人工审查

## 项目性质判定

`harness` 是 **Sovei 自身的开发仓库** —— 一个本地运行的 CLI 工作流治理引擎（pnpm monorepo，核心包 `packages/sovei-core`）。

这个判定对本次分析至关重要：项目**没有用户账户、没有网络服务、没有数据库、没有计费**。它的"业务"是治理流程本身，风险集中在**审计链完整性、门禁不可绕过、本地文件安全**，而非传统的鉴权与交易。

---

## 一、证据文件质量评估

| 证据文件 | 结论 | 说明 |
|---|---|---|
| `codegraph/business-map.json` | **基本不可用** | 22 个候选能力，0 个有效 |
| `governance/redlines-seed.json` | **空** | 未产出候选 |
| `governance/redlines.json` | **2/3 为误报** | 见下文 |
| `knowledge/*.json` | 空/无实质内容 | 未产出可用条目 |

### business-map 为何失效

扫描深度上限为 4 层，而本仓库真实源码位于 `packages/sovei-core/src/<domain>/<file>.ts`（第 5 层）。**扫描器从未进入真实源码目录**，只在浅层捞到了测试文件和构建脚本。

`coverage` 字段显示的高覆盖率是对已扫描范围而言，不代表业务覆盖，容易误导。

---

## 二、能力候选裁决

### 已确认能力（0 个来自 business-map，7 个由人工阅读源码补充）

business-map 中**没有任何一个候选可以确认**。以下是阅读 `packages/sovei-core/src` 后重建的真实能力清单：

| 能力 | 职责 | 代码证据 |
|---|---|---|
| 工作流引擎 | 12 阶段状态机编排、阶段前置校验、任务完成判定 | `engine/workflow-engine.ts`、`engine/state-machine.ts` |
| 事件溯源存储 | append-only 事件日志、replay 推导状态、YAML 缓存 | `engine/event-store.ts` |
| 确认门禁 | spec(S2/S3) 与 verify 阶段的 product/tech 双签与 override | `engine/state-machine.ts:76-92, 188-218` |
| 红线治理 | 红线 CRUD、变更请求红线评估、markdown 审查视图 | `change-control/repository.ts`、`redline-view.ts` |
| 变更控制 | 变更请求生命周期、乐观锁、supersede 处理 | `change-control/` + `workflow-engine.ts:260-280` |
| 知识库 | 7 类知识 × 4 态 lifecycle、晋级与查询 | `knowledge/schemas.ts`、`knowledge/lifecycle.ts` |
| 上下文构建 | 按阶段组装上下文包、跨 feature 决策日志注入 | `context/builder.ts`、`context/snapshot.ts` |

另有 wayfinder（决策图）、rules（规则适配）、architecture（重构策略分析）三个支撑模块，职责清晰但业务重要性低于上述。

### 已拒绝候选（22 个）

| 类别 | 数量 | 拒绝理由 |
|---|---|---|
| 测试文件被识别为能力 | 15 | `*.test.ts` / `test/` 目录，按规则不属于业务能力 |
| 空目录 / 无实质代码 | 3 | 无可验证的业务逻辑 |
| 构建与发布脚本 | 4 | `release-sovei.ps1` 等属于工程设施，非业务能力 |

---

## 三、红线裁决

### 停用的误报（本次停用 2 条）

| ID | 停用理由 |
|---|---|
| `AUTH_REQUIRED` | 项目无账户体系、无登录、无购买流程。扫描命中源是 `redline-scanner.ts:37` 的关键词字典本身，以及 DI 的 `TOKENS` 常量、wayfinder 文件锁的 `token` 变量 |
| `BILLING_CONTRACT` | 代码库不存在计费/支付/订阅/退款逻辑。命中源是 `redline-scanner.ts:38` 的 billing 关键词表 |

另有 `API_RATE_LIMIT` 在本次分析前已处于停用状态，同属误报（项目是本地 CLI，不提供 API 服务、无限流逻辑），保持停用。

> **这是本次 onboard 最重要的发现之一**：扫描器把自己的关键词字典当成了业务证据。任何自扫描的静态分析工具都存在这个自指陷阱。

### 保留（1 条）

- `NO_SILENT_DATA_LOSS` — 真实有效，CLI 升级不得静默改写用户数据。

### 新增（6 条）

#### absolute 级（4 条）

| ID | 规则要点 | 危害 |
|---|---|---|
| `AUDIT_LOG_APPEND_ONLY` | 事件日志只能 append，revision 单调递增 | 改写历史会让已确认的门禁与审批凭空消失或被伪造，审计链断裂且**不可发现** |
| `CONFIRMATION_GATE_INTEGRITY` | 双签门禁不可静默跳过，override 必须留痕 | 使用者误以为变更已获双签，实际未经审查 —— 直接摧毁产品核心承诺 |
| `CHANGE_REQUEST_OPTIMISTIC_LOCK` | apply 前校验 baseEventRevision 与 baseCurrentStage | 唯一的并发保护，去掉后陈旧变更会静默回滚他人的阶段推进与审批 |
| `PATH_TRAVERSAL_CONTAINMENT` | 所有写入路径必须校验落在 rootPath 内 | 见下方安全说明 |

#### approval-required 级（2 条）

因判断把握不足，按规则降级登记：

| ID | 规则要点 | 不确定之处 |
|---|---|---|
| `PERSISTED_SCHEMA_COMPAT` | schemaVersion 变更需提供迁移或兼容读取 | 项目仍处早期，是否愿意为 v1 数据承担迁移成本需产品定夺 |
| `CLI_CONTRACT_STABILITY` | 已发布命令名/选项/退出码构成对外契约 | 取决于是否已有外部用户，需确认发布范围 |

---

## 四、需要关注的安全问题

**`FilesystemStorage.resolve()` 缺少路径包含性校验**

```14:16:packages/sovei-core/src/storage/filesystem.ts
  private resolve(p: string): string {
    return join(this.rootPath, p);
  }
```

`join` 不阻止 `..` 逃逸。所有 read/write/append/delete 都经过这里。

值得注意的是，`workflow-engine.ts:466` **单点**做了 `..` 检查：

```465:467:packages/sovei-core/src/engine/workflow-engine.ts
    for (const artifact of artifacts) {
      if (artifact.includes('..') || /^[\\/]/.test(artifact)) {
        throw new Error(`Unsafe superseded artifact path: ${artifact}`);
```

说明风险**已被意识到，但只在一个调用点防御，未在存储层收口**。CLI 会消费 `specs/` 下用户可编辑的 markdown（tasks.md、change-manifest.md），路径部分来源于这些文件内容，存在实际的越界写入面。

建议在 `resolve()` 内统一用 `path.resolve` + 前缀校验收口。

**`redline list --all` 不标注停用状态（治理可信度缺陷）**

```65:68:packages/sovei-core/src/cli/commands/governance.ts
      for (const entry of visible) {
        console.log(`  ${entry.id} [${entry.enforcement}] ${entry.title}`);
        console.log(`    ${entry.rule}`);
      }
```

渲染循环从不读取 `entry.active`。加 `--all` 后，已停用的 `AUTH_REQUIRED` 与真实生效的 `AUDIT_LOG_APPEND_ONLY` 输出格式完全一致。

这直接影响本报告推荐的审查流程 —— 审查者按指令执行 `redline list --all`，会把 3 条误报当成正在执行的约束。**判断生效状态请以 `redlines.json` 的 `active` 字段为准。**

**`governance redline add` 硬编码 `origin: 'manual'`（来源可追溯性缺陷）**

```45:48:packages/sovei-core/src/cli/commands/governance.ts
        owner: options.owner,
        origin: 'manual',
      });
```

`change-control/schemas.ts:15` 定义了 `manual / scanner-seed / pm-confirmed / agent-generated` 四种来源，但 CLI 写死为 `manual` 且未暴露 `--origin`。后果：**通过 CLI 添加的所有红线（含 AI 生成的候选）都被标记为 `manual`**，无法区分"人类定的红线"与"AI/扫描器生成的候选"——而这正是 onboard 候选治理依赖 `origin + lifecycle` 区分的核心。修复方向：为 `add` 增加 `--origin` 选项。

---

## 五、待人工确认的开放问题

1. **扫描器配置**：是否调整 `business-map-scanner` 的深度上限与 monorepo 根路径？当前配置对本项目完全无效。
2. **自指陷阱**：`redline-scanner` 是否应排除自身的关键词字典文件（`config/*-scanner.ts`）？
3. **对外契约范围**：sovei 是否已发布给外部用户？直接决定 `CLI_CONTRACT_STABILITY` 应为 absolute 还是 approval-required。
4. **数据迁移承诺**：7 处 `z.literal(1)` 硬校验但**无任何迁移代码**。是否接受"破坏性升级需手工清理"，还是要建迁移框架？
5. ~~路径安全修复优先级~~：**已修复**（见第七节第二轮），`PATH_TRAVERSAL_CONTAINMENT` 现已有合规实现。
6. **事件日志容错**：`event-store.ts:50-56` 对损坏行仅告警跳过。崩溃产生的半截尾行跳过合理，但**中间行损坏被静默跳过会导致状态错误推导**，是否需要区分处理？
7. ~~CLI 停用标注缺陷~~：**已修复**（见第七节第二轮）。
8. ~~`redline add` 的 origin 硬编码~~：**已修复**（见第七节第二轮），现支持 `--origin`。
9. **schemaVersion 无迁移的实际影响面**：7 处 `z.literal(1)` 硬校验分布，若确需演进，是否先统一改为兼容读取再谈迁移框架？

---

## 六、审查指令

```bash
# 注意：--all 不区分停用项，生效状态以 redlines.json 的 active 字段为准
node -e "const r=require('./harness/project/governance/redlines.json');(r.redlines||r).forEach(x=>console.log(String(x.active).padEnd(6),x.id))"

sovei knowledge list --lifecycle candidate
cat harness/project/governance/redlines.md
```

当前生效状态：

| active | ID |
|---|---|
| false | AUTH_REQUIRED（误报，已停用） |
| false | BILLING_CONTRACT（误报，已停用） |
| false | API_RATE_LIMIT（误报，此前已停用） |
| true | NO_SILENT_DATA_LOSS |
| true | AUDIT_LOG_APPEND_ONLY |
| true | CONFIRMATION_GATE_INTEGRITY |
| true | CHANGE_REQUEST_OPTIMISTIC_LOCK |
| true | PATH_TRAVERSAL_CONTAINMENT |
| true | PERSISTED_SCHEMA_COMPAT |
| true | CLI_CONTRACT_STABILITY |

人工审查通过后再开始特性开发：

```bash
sovei workflow bootstrap 001-first-feature
```

---

## 七、自我迭代记录

对首次 onboard 产物自查后做出的修正，分两轮。

### 第一轮：知识层修正

1. **修正过强的 rule**：`rule-storage-write-withlock-fs` 原表述暗示"所有写文件都要 withLock"，易误导后续开发过度加锁。已改为精确语义——`withLock` 仅用于读-改-写并发场景，普通覆盖写与事件日志 append 不需要。
2. **补全 storage 容错策略知识**：新增 `rule-fail-fast-517eafb9` 固化"状态文件损坏 fail-fast、事件日志损坏容错跳过"的差异，及中间行损坏的风险。
3. **固化 CLI origin 缺陷**：新增 `pitfall-governance-redline-add-origin-manual`。
4. **报告补充**：新增缺陷描述，开放问题扩至 9 条。

### 第二轮：源码级修复（本轮）

按用户指示直接修改 `packages/sovei-core` 源码：

1. **`redline list --all` 标注停用状态**（`src/cli/commands/governance.ts`）：渲染循环为 `active===false` 的条目追加 `[INACTIVE]` 前缀。已验证——停用项与生效项输出可区分。
2. **`redline add` 暴露 `--origin`**（`src/cli/commands/governance.ts`）：新增 `--origin` 选项（默认 `manual` 保持向后兼容），schema 定义的 `scanner-seed / pm-confirmed / agent-generated` 来源不再被堵死。已在临时 project 端到端验证 `--origin agent-generated` 正确落盘。
3. **存储层路径包含性校验**（`src/storage/filesystem.ts`）：`resolve()` 从裸 `join` 改为 `pathResolve` + 前缀包含性校验，任何解析后超出 rootPath 的路径（`..` 逃逸或绝对路径逃逸）抛错拒绝。这是收口全引擎目录穿越面的单点。

**自测发现的额外漏洞**：初版校验依赖 `relative()` 的 `..` 前缀，但在 Windows 跨盘符场景（如传入 `c:/windows/x`）会漏检。已改为前缀比较（`full === root || full.startsWith(root + sep)`），对 `..` 与绝对路径逃逸均验证阻止，正常嵌套读写不受影响。

**验证**：`npx tsc` 通过，完整测试套件 55/55 通过，release 单文件已重新打包。三个缺陷的修复均已端到端验证。

**重要澄清**：此前 onboard 生成的 6 条红线 `origin` 均为 `manual`，这是旧版 `governance.ts:47` 硬编码所致，并非我手工伪造来源。修复后新增红线可通过 `--origin agent-generated` 正确标记；这 6 条现存红线仍为 `manual`，审查时请视作 AI 生成候选项。
