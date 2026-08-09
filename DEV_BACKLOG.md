# Sovei 待办总清单（缺陷 + 待开发 + 使用方式）

> 生成日期：2026-08-10（本次对齐至 2.5.7）
> 依据：全面扫描 `specs/` 下全部 Feature 的 learning-report / decision-log / workflow-state.yaml、`design-docs/` 设计文档、源码（2.5.7）与 npm 发布状态。
> 目的：给出一张可判断方向的**开发总清单**，供人工排期。本文件不替代 Sovei 工作流，实际开发仍走 `load → … → sync` 12 阶段。

---

## 0. 当前状态快照

| 项 | 值 |
|---|---|
| 最新发布版本 | **2.5.7**（npm `latest` 渠道，已发布，2026-08-10） |
| 测试基线 | 124 / 124 通过（构建后） |
| Node 兼容 | 发布产物 CommonJS，`engines >= 14.18.0`（Node 14 可用） |
| 知识库 | 1 stable + 若干 candidate/pending |
| Skills | 8 阶段绑定，7 个第三方 skill 锁定 |
| 最新 Feature | 019-contract-single-source（completed）；2.5.7 另含 P0-1 红线 branch 作用域隔离 |

---

## 1. 本地使用方式（已支持，勿混淆"必须发版"）

**结论：本地同一台电脑使用，根本不需要发布到 npm。** 发布 npm 只对**跨电脑**（把工具带到别的机器）有必要。

### 1.1 本地直接用（推荐，改源码即刻生效）

仓库根目录 `package.json` 已把包声明为本地依赖：

```json
"@soveilove/sovei": "file:packages/sovei-core"
```

所以直接：

```bash
# 1) 构建一次（把 src/ts 编译混淆成 dist/release/sovei.cjs）
pnpm run sovei:build            # = cd packages/sovei-core && pnpm run build

# 2) 构建产物就是完整 CLI 单文件
node packages/sovei-core/dist/release/sovei.cjs --version

# 3) 在任意项目里用（指定 --root，或先 cd 进去）
node d:/project/private/harness/packages/sovei-core/dist/release/sovei.cjs \
  --root d:/work/my-app project onboard

# 4) 也可以临时全局链接（本机全局命令，但不发布）
cd packages/sovei-core && npm link
sovei --version        # 本机任何目录都能敲 sovei，改代码后重新 build + link 即更新
```

> 关键点：**本地改代码 → `pnpm run sovei:build` → 直接用 `dist/release/sovei.cjs` 或 `npm link` 即可**，无需走 npm publish、无需 OTP、无需版本号递增。每次发版前的 `verify` 门禁在本地 build + test 就能完成。

### 1.2 什么时候必须发布 npm

只有**要在这台电脑之外的机器**（公司电脑、其他环境）用新版时，才走 `pnpm run release:sovei` 发布。发布流程、OTP、`latest`/`next` 标签见根目录 `release-sovei.ps1` 与 README「发布 Sovei CLI」。

### 1.3 建议（可后续做，非必须）

| 需求 | 说明 | 状态 |
|---|---|---|
| 一键本地安装脚本 | 建一个 `use-local.ps1`：build + `npm link`，一条命令让本机全局 `sovei` 指向最新源码 | 待开发（低优先级） |
| README 补充本地使用章节 | 当前 README 已含本地 `node dist/cli/index.js` 示例，可补 `npm link` 与"无需发版即可本地用"的说明 | 待开发（低优先级） |

---

## 2. 工作流自身待解决问题（独立于两场景）

### 2.1 P0 — 已处理（影响工作流一致性 / 高价值知识固化）

> ✅ 两项 P0 已于 **2026-08-07** 全部处理完成。

| # | 项 | 处理结果 |
|---|---|---|
| P0-1 | **Feature 016-skill-verify 闭合** | ✅ 补 `sync-report.md` → `sovei workflow sync 016-skill-verify --complete`；状态 `completed`，12 阶段全完成（verify 107/107） |
| P0-2 | **013 O1「声明式适配器注册」晋级 stable** | ✅ 人工审查证据充分后放行：`knowledge add` 录入 `rule-sync-851e0638`（candidate）→ `promote` pending → stable；证据 012/013 两轮验证 |

> 附带修复：环境版本错位（全局旧版 2.4.0 无 `sync` 阶段导致 replay 报错；仓库本地依赖为陈旧快照 2.4.1）。已通过更新全局到 2.5.6 + `pnpm install` 刷新本地 `file:packages/sovei-core` 快照对齐。
>
> 使用约定：harness 自我迭代用仓库本地产物（复刻开发者 `pnpm install` 后 `pnpm exec sovei`），业务项目用全局发布版。

### 2.2 P1 — 架构债务（消重复维护）

| # | 项 | 现状 | 建议动作 |
|---|---|---|---|
| P1-1 | ~~**两套 contract 数据源并存**~~ | ✅ **已实现**（Feature 019-contract-single-source，completed）：契约单一源为 `stages/index.ts` 的 `stageRegistry`（`StageDefinition.contract`）；`WorkflowDefinition` 仅含编排字段（version/stageOrder/maxStagesPerInvocation/allowChaining），不再重复产物契约（见 `engine/types.ts:66-94`） | — |
| P1-2 | **`mcp` 能力字段无消费方** | `adapters/registry.ts` 的 `mcp: true`（codex/claude/gemini/windsurf）无 MCP server 消费，仅预留边界 | 明确做不做 MCP server；不做则长期挂起 |

### 2.3 P2 — 观察项（低风险顺带）

| # | 项 | 现状 |
|---|---|---|
| P2-1 | **013 O2 sentinel upsert 晋升** | 已覆盖 011/012/013，保持 candidate；**再被第 4 个 Feature 复用则晋升 stable** |

---

## 3. 场景一（通用用户项目）待开发

> 详见 `design-docs/SOVEI_SCENARIOS_DECISION.md §2.5`。

| 优先级 | 待开发 | 现状 | 价值 |
|---|---|---|---|
| P1 | spec 四层 git 分层策略固化为命令/模板 | 未实现 | 解决"spec 快速迭代满、git 历史被刷" |
| P1 | Feature 收敛后主动归档过程产物 | 部分（仅 change/reopen 时归档） | 解决"过程产物堆积" |
| P1 | 知识提取复用价值阈值（最少证据） | 未实现 | 防 knowledge 膨胀 |

---

## 4. 场景二（多分支/多工程协作）待开发

> 详见 `design-docs/SOVEI_SCENARIOS_DECISION.md §3.5`。

| 优先级 | 待开发 | 现状 | 价值 |
|---|---|---|---|
| **P0** | **红线 branch 作用域隔离** | ✅ **已实现**（2026-08-09，已发 2.5.7）：`Redline` schema 新增可选 `branches: string[]`（缺省/空=全局）；`syncToSatellite` 按目标 satellite 的 `branch` 过滤，只推送全局或匹配 branch 的红线；`governance redline add/update/import` 支持 `--branch`（update 另支持 `--clear-branches`）；新增测试（124/124 通过） | 个人多工程：工程专属红线不互相污染 |
| **P0** | **merge preflight 语义冲突预检** | 未实现（2026-08-09 已核对源码：`syncToSatellite` 仅第 185-188 行有 knowledge entry `id` 冲突检查，无任何红线/语义冲突预检） | 规模化合并防线（设计核心） |
| P2 | 联邦星型（multi-hub） | 未实现（当前单 hub） | 多主干/多团队对账，规模化后再做 |

---

## 5. 发布说明校对（大版本更新时必做）

- **`packages/sovei-core/README.md` 是发布说明文件**，每次大版本更新需校对：
  - 「版本与发布」章节版本号（✅ 已同步至 2.5.7，2026-08-10）
  - 命令速查表是否覆盖全部新增命令
  - 能力概览表、外部 Skills 绑定表、安装/上手示例
  - 环境要求（Node >= 14.18）、发布产物 `sovei.cjs`、零运行时依赖描述
- 详见长期记忆「packages/sovei-core/README.md 发布说明校对规则」。

---

## 6. 建议开发顺序

1. ~~**先清工作流自身债（P0）**：016 收尾闭合 → O1 晋级审查~~ ✅ 已完成（2026-08-07）。
2. ~~**场景二 P0-1 红线分支隔离**~~ ✅ 已完成（2026-08-09，已发 2.5.7）。**剩余场景二 P0-2 merge preflight**（规模化防线）为当前最高优先级。
3. **场景一 P1**：spec 分层 git 策略 + 主动归档 + 知识阈值。
4. **本地使用优化（P2）**：`use-local.ps1` 一键本地链接脚本 + README 补本地使用说明。
5. **最后 P2**：联邦星型、O2 晋升——等待规模化场景/自然复用点。

---

## 7. 待人工决策（已列在设计文档 §6）

- 场景二 merge preflight：现在只剩它一个 P0，直接推进即可（红线隔离已完成，无需再比较次序）。
- 联邦星型是否本轮做（单 hub 已满足个人 a/b/c 三工程）？
- `mcp` 字段：做 MCP server 还是长期挂起？

> ✅ 已决：013 O1「声明式适配器注册」已于 2026-08-07 人工审查放行晋级 stable。
> ✅ 已决：P0-1 红线 branch 作用域隔离已实现并发布（2.5.7）。
