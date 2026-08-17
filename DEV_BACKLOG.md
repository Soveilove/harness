# Sovei 开发清单（待开发 + 功能设计）

> 用途：**活跃开发文档**——只保留待开发项、开发顺序、功能设计与待决策。
> 已完成功能与历史决策见 [doc/DEV_ARCHIVE.md](doc/DEV_ARCHIVE.md)。
> 最新校准：2026-08-17（对照源码、当前 Feature 产物与 001 多 change 回放逐项核账；已确认可废弃历史 Feature/事件/缓存数据，下一轮允许破坏性重构）。
> 实际开发走 `explore → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync` **12 阶段**；独立 `load` 已合并进 `explore`。推荐入口是 `sovei workflow explore "<自然语言需求>" --slug <kebab-slug>`，也可用 `--prd <path>` 附加 PRD。

---

## 0. 状态快照

| 项 | 值 |
|---|---|
| 最新发布版本 | **2.6.1**（`packages/sovei-core/package.json`；npm `latest` 发布说明待下次联网发布校验） |
| 工作流阶段 | **12 阶段**：`explore → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync` |
| 测试基线 | **223 / 223 通过**（001 scanner-polish evidence 记录；本轮因 `pnpm` 不在 PATH 未重跑） |
| Node 兼容 | 运行时 CommonJS，`engines >= 14.18.0`；⚠️ **构建/测试需 Node 18+**（TypeScript 7 依赖） |
| 当前活跃 Feature | 无；`001-scanner-polish` 已 `completed`，3 个 Sub-change 均 `merged` |
| 历史数据策略 | 允许废弃现有 `specs/*` 历史 Feature、`workflow-events.jsonl` 与 `workflow-state.yaml` 缓存；不做事件迁移/旧状态回放兼容 |
| 第一优先级 | **R1.1：Workflow v3 状态核心**；只做唯一事实源、合法转移和审计，不同时开发 split/Quick |
| 后续顺序 | **R1.2 split 聚合 → R1.3 Explore→Quick → P1-6 rescan 真增量 → P1-4 知识阈值** |

**当前能力状态：**

| 能力 | 状态 |
|---|---|
| 自有技能库（方案 A/D） | 🔶 部分：已有 `sovei-flow/skills/base/` + 6 模板；`web-plugins/ec-web-ai-plugin/` 素材已到位，尚未筛选沉淀进自有命名空间 |
| Feature 拆多个 change | ✅ 方向 C 已验证：父层共享 `explore→grill`，各 SC 独立 `spec→verify`，全部 merged 后父层聚合 `learn→sync` |
| scanner polish | ✅ M1 包发现、M2 红线聚合、M3 git diff 文件过滤与 `--full` 已交付 |
| Codex 技能封装（方案 G） | ✅ 已完成（N3） |
| 四 agent 选择器（方案 F） | 🔶 适配器多选安装已实现；`project init --agent` 单选与宿主差异化配置未实现 |
| CLI 交互面板（方案 H） | 🔶 `adapter-selector.ts` 已实现零依赖多选并接入 `adapters install` / `project init`；尚未抽成通用 `select` / `multiselect` 层 |
| 架构治理接入工作流（P2-12） | ⚠️ 命令已实现，未接入 12 阶段运行时 |
| 外部 Skills 运行时 | ✅ map/lock/bind/use/sync、阶段注入、fallback、reference 文件加载已具备；多 binding 与按需 reference 尚缺 |
| Explore → Quick 路由 | ❌ Explore 已理解需求、扫描现状并初判拆分，但固定进入 `grill`；Quick 仍是可直接调用的独立入口，未消费 Explore 结论 |
| 统一关系模型（问题四） | ❌ 未实现（最大战略缺口） |

### 当前真实问题（按处理优先级）

| 优先级 | 问题 | 当前证据 | 建议 |
|---|---|---|---|
| **R1.1 / P0** | Workflow 状态模型有三套重叠事实 | 事件流理论上是事实源、YAML 缓存被 CLI 旁路读取、Markdown 既是人类视图又被后续流程消费 | 不修旧数据；先以版本化 JSON 唯一事实源重建状态核心，删除事件/YAML 运行时读写和前向跳过 |
| **R1.2 / P0** | split 聚合协议错误 | split 通过伪造 `STAGE_COMPLETE(learn)` 前跳，导致重复 `learn`、SC 状态漂移 | R1.1 稳定后单独重建显式 split 聚合，不与状态核心同时开发 |
| **R1.3 / P1** | Quick 无法作为 Explore 的受控分支 | Explore 固定到 `grill`，Quick 可独立携带 paths 启动且使用伪 Feature `quick` | R1.2 稳定后持久化 Explore 路由，Quick 仅消费 `route=quick` 的 Feature 上下文 |
| **P1** | M3 只做到“扫描消费端过滤”，未真正跳过扫描 | `ProjectScanner.scan` 仍全量执行目录遍历、包发现、技术栈与知识生成；无变更时仍调用 `scan(...)`，仅 redline/business-map 接收 `changedFiles` | 将“增量过滤”与“增量扫描”分开表述；后续实现无变更短路和未变产物复用 |
| **P1** | `sub-change-map.md` 生成文案仍描述旧分叉点 | 当前文件头仍写“共享 explore→scope，从 plan→verify 分叉”，正文已是 `spec→verify` | 修正模板并覆盖 split 产物测试 |
| **P1** | Quick 在理解需求前可被直接启动 | `quick` 要求调用方预先提供 `--paths`，仅用 Context Policy 判定路径/规则相关性；Explore 虽已产出需求理解、现状和拆分提议，却固定 `nextStage: grill`，没有 `quick/feature/blocked` 路由结果 | 将 Explore 设为统一入口和路由器；Quick 改为仅消费已判定的小需求上下文 |
| **P2** | MCP 能力字段无消费方 | adapter capability 已声明 `mcp`，但没有 MCP 工具/资源层读取 | 决定实现 MCP server，或降级为纯宿主能力元数据并写清边界 |
| **P2** | sentinel upsert 尚未满足晋升证据 | O2 仍为 candidate，等待第 4 个独立 Feature 复用 | 被动等待真实复用，不为晋升制造样例 |
| **环境** | 本地 CLI 来源易漂移 | 全局旧版、本地 `file:` 快照和源码可能不一致；本轮 shell 中 `pnpm` 不在 PATH | harness 自迭代固定走 `sovei:build → pnpm install → pnpm exec sovei`，执行前记录 `--version` |

---

## 1. 开发顺序（4 条泳道）

> 排序依据：**既然历史数据可废弃，先一次性收敛状态与路由模型；再扩性能、质量门槛和治理能力**。不再为旧事件/缓存叠加兼容补丁。

**一句话执行路径：** `R1.1 状态核心 → R1.2 split 聚合 → R1.3 Explore→Quick → P1-6 → P1-4 → P2-12 → P2-1/P2-3`（主线）｜ `H-剩余 → F → B`（体验层）｜ `WP-1 → WP-2 → WP-3~7`（Skills 吸收）。

### 主线 A：Workflow v3、路由与治理闭环

| 步 | 项 | 编号 | 优先级 | 备注 |
|---|---|---|---|---|
| 1 | Workflow v3 状态核心 | **R1.1** | **P0** | 本轮唯一需求：`workflow-state.json` 唯一事实源、严格转移、内置 history；删除事件流与旧 YAML 读写 |
| 2 | v3 split 聚合 | **R1.2** | **P0** | 等 R1.1 稳定后单独开发；显式 mode/aggregation，父层唯一 learn |
| 3 | Explore → Quick 路由 | **R1.3** | **P1** | 等 R1.2 稳定后单独开发；统一入口、Quick 准入与升级 |
| 4 | rescan 真增量与无变更短路 | P1-6 | **P1** | 当前只在 redline/business-map 消费端过滤，不等于全链路增量 |
| 5 | 知识提取复用价值阈值 | P1-4 | **P1** | 防 knowledge 膨胀 |
| 6 | 架构信号注入工作流阶段（“随开发自动治理”闭环） | P2-12 | **P2 高** | 核心模块已交付，仅缺 engine 注入 |
| 7 | `--json` 全覆盖 | P2-1 | P2 | CI/CD 模板与脚本消费前置 |
| 8 | `context build --paths` 语义修正 | P2-3 | P2 | 独立小改 |

### 主线 B：交互与初始化体验（H 已部分完成）

```
adapter 多选（已完成）→ 抽象通用 select/multiselect → F 宿主选择器 → B 结构化返回
                         └──────── A/D 自有技能内容可并行 ────────┘
```

| 步 | 项 | 方案 | 前置 | 备注 |
|---|---|---|---|---|
| 7 | 将 `adapter-selector.ts` 抽成通用交互原语 | H-剩余 | 无 | 保留零依赖、TTY 检测与非交互回退 |
| 8 | 筛选 web-plugins，建立自有命名空间 + authoring-standards | A/D | 素材已到位 | 先剥离 EC 私有耦合，再形成可维护技能 |
| 9 | 宿主 agent 选择器 + 差异化安装 | F | H-剩余 + A/D | 实现 `project init --agent`，与已有 `--adapters` 并存 |
| 10 | 工作流命令结构化 JSON 返回 | B | F | 12 阶段 slash 已有，重点补机器可消费结果，不重复造按钮 |

### 主线 C：web-plugins 已到位，解除阻塞

```
素材审计/去私有化 → WP-1 渐进式 reference 加载 → WP-2 verify 审查 skill → WP-3~7
```

### 战略 / 后续

| 项 | 编号 | 优先级 | 说明 |
|---|---|---|---|
| CI/CD 集成模板 | P2-2 | P2 | 依赖 `--json`（步骤 3） |
| 子 Agent 强化 | SA-2/3/5/6 | P2 | 数据量大后收益显现 |
| 其余 P2（usage export / 多 binding / 预算值 / Cursor / O2 晋升 / scan 支持 Python） | 各 | P2 | 按需驱动 |
| 统一关系模型（Graph Coding 核心） | S-1 | P3 | 最大战略缺口，待决策 |
| 联邦星型 / Phase 4 / Phase 2 回放验证 | S-2/3/4 | P3 | 待决策 |
| 本地使用优化（use-local.ps1 + README） | L-1/L-2 | 低 | — |

---

## 2. 待开发项明细

### P1 — 高优先级

| # | 项 | 简述 | 工作量 |
|---|---|---|---|
| **R1.1** | Workflow v3 状态核心 | **当前先开发且只开发这一项。** 用版本化 `workflow-state.json` 作为唯一事实源；状态内 `history` 仅审计；移除 `workflow-events.jsonl`、YAML 状态和旧数据兼容；禁止重复/跳跃阶段。见 §3.6 | 1 Feature，不拆 SC |
| **R1.2** | v3 Feature split 聚合 | 依赖 R1.1；显式 `mode` / `aggregation` / execution scope，删除伪造 `learn` 和双重 merge 语义 | 1 Feature，不与 R1.1 同时开发 |
| **R1.3** | Explore → Quick 路由 | 依赖 R1.2；Explore 持久化路由，Quick 只消费 `route=quick`，越界时升级同一 Feature | 1 Feature，不与 R1.2 同时开发 |
| **P1-6** | rescan 真增量与无变更短路 | 当前全量目录/包/技术栈/知识扫描仍执行，仅 redline/business-map 按 `changedFiles` 过滤。需在无变更时直接复用产物，并定义配置/依赖文件变化时的全量回退条件 | 1 Feature，可拆 2 SC |
| **P1-4** | 知识提取复用价值阈值 | 防 knowledge 膨胀：定义最少证据数 / 最小复用次数才入库的阈值规则。当前 trust-but-verify（candidate→pending→stable）已有基础，缺前置门槛 | 1 Feature |

### P2 — 中优先级

| # | 项 | 简述 | 依赖 |
|---|---|---|---|
| **P2-1** | `--json` 全覆盖 | workflow/knowledge/workspace 等命令补齐 JSON 输出，供脚本/CI 消费 | — |
| **P2-2** | CI/CD 集成模板 | GitHub Actions / GitLab CI 流水线模板 | P2-1 |
| **P2-3** | `context build --paths` 语义修正 | `--paths` 当前仅用于 project rules 匹配，应同时过滤 required 红线/stable rules | — |
| **P2-4** | `usage export --redacted` | usage.jsonl 脱敏后供团队评测共享。需定义脱敏字段、时间桶聚合、导出命令 | — |
| **P2-5** | 外部 Skills 多 binding | 一个阶段注入多个 skill（如 grill 同绑 grilling + domain-modeling）。需扩展 `skill-map` schema 和 adapter | — |
| **P2-6** | Skill reference 加载策略 | 统一设计 frontmatter `reference-loading: on-demand` 机制，按需读不全量内联。所有 skill 受益的引擎层改进 | web-plugins（WP-1） |
| **P2-8** | 阶段上下文预算值 | shadow policy 已计算三变体字符数，未设阈值。需先观测真实数据 | 等评测数据 |
| **P2-9** | 013 O2 sentinel upsert 晋升 | 已覆盖 3 Feature，第 4 个复用则晋升 stable。被动等待 | — |
| **P2-10** | Cursor Adapter | `adapters/registry.ts` 中 `cursor: pending`。其他 IDE 已完成 | 有无实际需求 |
| **P2-11** | architecture scan 支持 Python（`.py`） | 默认 `includeExtensions` 是 TS/JS 家族，不含 `.py`。需扩 includeExtensions + analyzer 依赖解析 + branch/function 度量适配 Python。**非阻塞**（Sovei 核心与语言无关，scan 仅附带辅助） | 有 Python 项目时 |
| **P2-12** | 架构信号注入工作流阶段 | 见 §3 功能设计 | 1 Feature |
| **SA-2** | 子 Agent：context build 组装 | 分组并行加载 required 项 | — |
| **SA-3** | 子 Agent：converge/verify 代码审查 | 分维度并行审查（类型/测试/规则/架构） | — |
| **SA-5** | 子 Agent：preflight 并行检测 | 三类冲突检测并行。当前数据量小收益有限 | — |
| **SA-6** | 子 Agent：learn 知识提取 | 并行提取/搜索/评估，写入串行保一致性 | — |

### P3 — 战略级 / 低优先级

| # | 项 | 简述 |
|---|---|---|
| **S-1** | 统一关系模型（问题四，Graph Coding 核心） | 见 §3 功能设计。**完全未实现，最大战略缺口** |
| **S-2** | 联邦星型（multi-hub） | 多主干/多团队对账。当前单 hub 已满足个人三工程 |
| **S-3** | Phase 4：vendor lock + 上游 diff + 安装器 | 外部 Skills 生命周期管理。网络约束：github.com 不通，需 raw 通道 |
| **S-4** | Phase 2 回放验证 | 用一个普通 Feature + 一个长周期 Feature 回放完整工作流 |
| **L-1** | 一键本地安装脚本 `use-local.ps1` | build + npm link 一条命令 |
| **L-2** | README 补充本地使用章节 | npm link 说明 |

---

## 3. 功能设计

### 3.1 P2-12 架构信号注入工作流阶段（"随开发自动治理"闭环）

**现状**：演进式架构治理是**独立手动命令**（scan/status/inspect/accept/dismiss/check），**未接入 12 阶段工作流运行时**。核查证据：工作流上下文装配加载的是知识库快照（`knowledge/.snapshot.json`），`src/context/` 未消费 `module-metrics.json`/`debt-register.json`；scope/converge/learn 阶段 prompt 虽写"最新架构健康快照"字样，但引擎未真正注入架构数据，只停留在文本提示层。

**四步闭环设计**：
1. **上下文注入**：`workflow-engine` 装配阶段上下文时读 `architecture/module-metrics.json` + `debt-register.json`，把涉及模块的信号/债务注入 scope/plan/converge。
2. **converge 门禁**：converge 后对比 baseline 与当前扫描，新增 refactor-required 热点时在报告提示。
3. **learn 自动登记**：多 Feature 反复触同一热点时自动调 `repository.accept` 生成债务条目（当前仅 prompt 建议未自动执行）。
4. **CI 挂接**：verify/complete 门禁可选 `architecture check --fail-on required`。

**目标**：跑工作流时架构治理随开发自动发生，而非靠人手动敲 `sovei architecture`。核心模块（analyzer/policy/repository）已随 v2.6.1 交付，不改变现有 12 阶段结构。

### 3.6 R1：Workflow v3 重构路线

**重构前提**：历史 `specs/*`、旧 `workflow-events.jsonl`、`workflow-state.yaml`、旧 Markdown 投影均允许归档或删除；**不迁移、不回放、不兼容旧 v2 数据**。对外 CLI 可在同一主版本内做明确破坏性变更，并以 release note 说明。

**执行原则**：R1 是路线，不是一次性 Feature。严格按 `R1.1 → R1.2 → R1.3` 串行开发；每次只启动一个需求，前一项验证完成后再开始下一项。

#### R1.1（当前）：Workflow v3 状态核心

**本轮唯一目标**：用版本化 `workflow-state.json` 建立唯一事实源、严格状态转移和内置审计历史；删除事件流/YAML 的运行时读写与旧数据兼容。**本轮不实现 split 聚合、不实现 Explore 路由、不修改 Quick。**

**已定设计**：
- 唯一事实源：`specs/<feature>/workflow-state.json`。
- `schemaVersion` 必填；只支持当前 v3 schema，不做旧版迁移。
- `history` 存在于状态文件内，仅用于审计，不参与重放或恢复。
- 状态更新采用同目录临时文件 + rename，避免半写文件；单进程并发更新使用 revision/CAS 拒绝陈旧写入。
- 阶段只能完成当前 `currentStage`；重复完成和向前跳跃均报错，不再静默补齐。
- Markdown 仍保留为阶段内容产物，但流程状态、门禁和下一步不能从 Markdown 推断。
- v2 事件存储、YAML 状态读写与兼容分支直接删除；旧 fixture 重写为 v3，不保留迁移测试。

**R1.1 验收**：
1. 新 Feature 只生成并读取 `workflow-state.json`，不生成 `workflow-events.jsonl` / `workflow-state.yaml`。
2. 合法阶段完成后 revision、currentStage、completedStages、history 原子更新。
3. 重复完成、越级完成、陈旧 revision、损坏/未知 schema 均明确失败，状态文件保持原样。
4. CLI 的 bootstrap/status/prepare/complete/confirm/reopen/replay 行为完成 v3 适配；其中 replay 改为“从唯一状态重建 Markdown 投影/诊断”，不再事件回放。
5. 现有单 Feature 12 阶段、确认门、reopen、任务完成测试迁移并通过；split/Quick 只保证暂不被 R1.1 破坏，不在本轮重构。

#### R1.2（后续）：正确的 split 聚合

依赖 R1.1。引入显式 `mode: single|split`、`aggregation: none|waiting|ready|completed` 与 execution scope，删除伪造 `learn`、双重 merge 和缺省 `subChangeId` 兼容；全部 SC merged 后父层只执行一次真实 `learn→sync`。

#### R1.3（后续）：Explore → Quick 路由

依赖 R1.2。Quick 不是用户在理解需求前选择的“简化工作流”，而是 Explore 识别出**影响范围小、低风险、无需方案决策**的小需求后走的轻量实施分支。所有自然语言需求先经过 Explore；只有路由为 `quick` 才跳过正式 Feature 的文档链路。

```text
自然语言需求
  ↓
Explore：需求理解 + 代码/业务现状扫描 + 影响/风险/拆分初判
  ├─ quick：小需求 → Quick check → 范围确认 → implement → Git diff / 测试验证 → usage report
  ├─ feature：常规需求 → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync
  ├─ split-candidate：可能多 change → 仍先走正式 Feature 的 grill → wayfind → spec → scope；仅在共享决策和范围明确后 `feature split`
  └─ blocked：信息、权限或影响面不足 → 返回待澄清项，不进入实施
```

**Quick 准入条件（必须同时满足）**：
1. 目标明确且可验收；
2. Explore 可将影响范围收敛到少量路径/局部模块；
3. 不涉及业务红线、数据迁移、公共契约、权限/安全、架构边界；
4. 无需在多个产品或技术方案中选择；
5. 不需要拆成多个独立验证的 change；
6. 能用既有或局部测试验证。

任一条件不满足，路由到正式 Feature；信息不足则 `blocked`。Quick 后若发现 Git diff 越界、影响面扩大或新红线，必须终止并回到正式 Feature 的 `grill`，不得在 Quick 内补齐长链路文档后继续交付。

**当前代码差距与可删除旧模型**：

| 现状 | 证据 | v3 处置 |
|---|---|---|
| 事件流称为事实源，但 `workflow-state.yaml` 缓存被 CLI 直接读取；`sub-change-map.md` 等 Markdown 同时承担展示与流程输入 | `src/engine/event-store.ts`、`src/engine/workflow-engine.ts` | 保留一个可版本化的结构化事实状态；事件仅做审计日志或彻底移除 event sourcing；所有 Markdown 只能是只读投影，不得反向驱动状态 |
| `STAGE_COMPLETE` 允许向前跳过并静默补齐中间阶段 | `src/engine/state-machine.ts` | 删除前向跳过容忍；每个阶段必须显式完成并满足产物/门禁，聚合不伪造阶段完成 |
| split 通过追加 `STAGE_COMPLETE(learn)` 把父 Feature 从 `grill` 跳到 `learn`，未合并 SC 时又阻塞；SC 完成 verify 自动 merged 后还附加 `SUBCHANGE_MERGED` | `src/engine/workflow-engine.ts`、`src/engine/state-machine.ts` | 新增明确 `mode: single|split` 与 `aggregation: none|waiting|ready|completed`；父层唯一一次真实 `learn`；保留一种唯一 merge 事实，不再双事件表达 |
| `TASK_COMPLETE` 是否顶层/SC 由可选 `subChangeId` 是否缺失隐式判定 | `src/engine/types.ts`、`src/engine/state-machine.ts` | 删除“字段缺失即旧顶层事件”兼容；任务事件或任务状态必须带明确 execution scope |
| `workflow explore` 已理解需求并产出探索文档，但固定进入 `grill` | `src/stages/index.ts` 的 `exploreStage` | 在 Feature 结构化状态中持久化 `route`、`reasons`、`allowedPaths`、`riskSignals`、`questions` 和唯一 `nextAction` |
| `sovei quick` 是独立 CLI 入口、预先要求 `--paths`、默认伪 Feature `quick` | `src/cli/commands/quick.ts`、`src/quick/run.ts` | 删除裸 Quick 实施入口与伪 Feature；只保留 `quick run <feature>`，并仅接受 `route=quick` 的 Explore 上下文 |
| Quick 的 `escalated` 只有人工提示 | `src/quick/types.ts` | 升级原因持久化到同一 Feature；状态切换为正式分支并指向 `grill`，不新建或丢失 Feature |

**v3 领域模型约束**：
- Feature 是唯一工作单元：具有 `mode: single|split`、`route: quick|feature|split-candidate|blocked` 与明确 `nextAction`；Quick 不再拥有独立伪状态机。
- 阶段完成记录具有集合语义；禁止重复与跳跃。SC 的执行范围是明确字段或独立记录，不能由可选字段缺失推断。
- `split` 仅在共享 `explore→grill→wayfind→spec→scope` 完成后激活；父 Feature 进入 `aggregation=waiting`，不会写入虚假的 `learn`。全部 SC merged 后变为 `ready`，再执行一次真实的 `learn→sync`。
- Markdown 是从状态和阶段产物渲染的视图；需要机器消费的 `route`、SC 状态、确认门禁、允许路径一律来自结构化状态。
- 只为 v3 新建 Feature 提供读写、测试和 CLI；旧 `specs/*` 应归档/删除，旧事件回放与 YAML 解析器不进入新实现。

**开发边界**：上述三项是三个串行 Feature，不是同一 Feature 的 Sub-change。只有某一项在其自身 `scope` 阶段确认仍存在多个可独立交付面时，才按正式 split 机制拆 SC；当前 R1.1 明确不拆。

**命令与破坏性变更策略（R1.3 时执行）**：
- 唯一用户入口：`sovei workflow explore "<需求>" --slug <slug>`；结果必须输出结构化 `route` 和唯一 `nextCommand`。
- `route=quick`：`sovei quick run <feature> --json`；`route=feature|split-candidate`：`sovei workflow grill <feature>`；`route=blocked`：仅返回 `questions`。
- 移除 `sovei quick <target> --paths ...` 的实施语义；不保留兼容别名、不输出迁移预检。需要继续使用时，先 Explore。
- v3 发布前删除/归档仓库既有 Feature 状态、事件、旧 Markdown 投影和相关 fixture；发布说明明确旧 Feature 不可 replay。
- Feature 内不得再调用 Quick；Quick 出现越界或风险扩大时只做升级，不在 Quick 内补齐长链路文档。

**非目标**：本项不新增 MCP、不改变 12 阶段的正式 Feature 顺序、不让 Explore 直接执行代码修改，也不在 Explore 后立刻执行 `feature split`。

### 3.2 诉求一：自有 agent + skills 技能库（方案 A/D/E）

**现状痛点**：skill 来源目前依赖外部 vendor（mattpocock 6 个工程 skill + softaworks lesson-learned），第三方维护、与实际工程习惯有距离、github.com 不通时受限。N1/N2 已铺 `sovei-flow/skills/base/` + 6 模板，但缺自有命名空间与元技能。

**候选方案**：

| # | 方案 | 工作量 | 状态 |
|---|---|---|---|
| **A** | 建自有 skill 命名空间 `vendor/ec-web/skills/`，吸收剥离 web-plugins 素材 + 自建编码规范/工程方法论 skill；`project init` 可选附带 | 中 | 🔶 部分 |
| **D** | 吸收 `skill-authoring-standards` 为自有元技能，形成"我们怎么写 skill"内部标准 | 小 | ❌ |
| **E** | `project init --include-skills` 一键拉取自有技能集 | 小 | ❌ |

### 3.3 诉求二：IDE agent 直接调用工作流（方案 B/C/F，G 已完成）

**现状痛点**：adapter 只做**文本渲染**（把 `sovei workflow <stage> <feature>` 渲染进 CLAUDE.md/AGENTS.md/.cursorrules），IDE agent 看到"命令提示"要自己开终端敲。缺可执行工具层与结构化返回协议。

**四个 agent 调用机制差异**：

| Agent | 机制 | 现状 | 期望 |
|---|---|---|---|
| Claude Code | `.claude/commands/*.md` slash command | ✅ quick + 每阶段 slash command（P0-B） | 补结构化 JSON 返回 |
| CodeBuddy | `.codebuddy/commands/*.md` | ✅ 同上 | 同上 |
| Trae | `.cursorrules` 文本追加 | ✅ 节点表格文本 | 保持文本 + 可复制片段 |
| Codex | 桌面版不支持指令 | ✅ 技能包（N3，方案 G 已完成） | — |

**候选方案**：

| # | 方案 | 工作量 | 状态 |
|---|---|---|---|
| **B** | 每阶段 slash command 输出结构化 JSON 返回（当前阶段产物/下一步/风险等级） | 中 | ❌ |
| **C** | `sovei` 的 IDE 工具/MCP 封装层，把 workflow/quick/context 暴露为 IDE 可调用工具 | 大 | ❌（视 B/F 反馈再评估） |
| **F** | 初始化四 agent 选择器 + 差异化安装（Claude/CodeBuddy→slash，Trae→文本，Codex→技能包） | 中 | ❌ |

**方案 F 设计要点**：
- `project init` 交互式四选（或 `--agent <id>`）：Claude Code / CodeBuddy / Trae / Codex。
- 按能力差异化安装（非一刀切文本）。
- 记录所选 agent 到 `project.config.json`（如 `ideAgent: codex`），供后续 `context build`/技能渲染感知宿主能力。

### 3.4 诉求三：CLI 交互面板层（方案 H，部分完成）

**已完成**：`src/cli/adapter-selector.ts` 已基于 Node `readline` 实现适配器多选，支持 ↑/↓、空格、Enter、Esc/Ctrl-C、TTY 检测和非交互回退；已接入 `adapters install` 与 `project init --adapters`。因此 H 不再是“完全未实现”。

**剩余问题**：当前实现仍是适配器专用模块，缺通用单选原语，也未接入 `project init --agent`、`skills bind` 等场景。

**H-剩余设计**：
- 抽取 `src/cli/interactive/`，复用现有键盘处理和终端恢复逻辑。
- 新增 **单选 `select(prompt, items)`**：↑↓ 导航，Enter 确认，用于宿主 agent 选择。
- 将现有适配器选择迁移为 **多选 `multiselect(prompt, items)`**，行为保持兼容。
- 非 TTY 继续返回可判定结果或文本提示，保证 `--json`/CI 不阻塞。
- 参数优先：有参数直接执行，无参数才弹面板。

> **依赖结论**：F 已不再依赖“从零实现 H”，只依赖 H-剩余中的通用单选抽取。

### 3.5 问题四：统一关系模型（Graph Coding）— 完全未实现

**问题**：业务地图、代码地图、红线、Context Pack、Scope、Coverage Matrix、Wayfinder、Spec/Task/Evidence 等关系分散在不同 JSON、文档和模块中。

**距最终 Graph Coding 还差 4 层**：

| # | 缺失能力 | 说明 |
|---|---|---|
| 1 | 统一关系模型 | 定义业务能力、代码入口、模块、规则、Spec、Task、Evidence 之间的关系 |
| 2 | 正向影响分析 | 业务需求变化后自动重算受影响的代码、规则和验证面 |
| 3 | 反向同步 | 代码修改后反向更新代码地图和业务地图 |
| 4 | 图查询上下文 | AI 根据关系图自动生成最小且正确的上下文 |

> 第 4 层（语义合并预检）已由 preflight 模块实现（2026-08-10）。

**设计原则**（来自 014 学习报告，尚未晋升 stable）：
- `structural-fact`（可自动覆盖）vs `semantic-annotation`（不可自动覆盖）应成为核心设计原则。
- skill body 是 structural-fact，Sovei 阶段契约是 semantic-annotation。

**建议路径**：统一关系模型（定义 schema + 适配器）→ 正向影响分析 → 反向同步 → 图查询上下文。

---

## 4. web-plugins 吸收清单（素材已到位）

> ✅ `web-plugins/ec-web-ai-plugin/` 已存在，含 `agents/`、`skills/` 与插件元数据，复制阻塞已解除。下一步不是整包搬运，而是先审计授权与内容、剥离 EC 私有组件/MCP/流程耦合，再沉淀进自有技能命名空间。
> 来源：`web-plugins/ec-web-ai-plugin/`（EC 前端团队 VS Code Copilot 插件）。具体数量和版本以目录及 `plugin.json` 为准，避免手工统计漂移。

### 4.1 待吸收项

| 优先级 | # | 项 | 来源 | 注入点 |
|---|---|---|---|---|
| **P2** | WP-1 | 渐进式 reference 加载（所有 skill 受益） | `coding-standards/SKILL.md` | 引擎层：改 `adapter.ts` `loadReferenceFiles` |
| **P2** | WP-2 | verify 结构化审查 skill（需求映射→Scenario→代码→tasks→Impact→规范→lint/tsc） | `change-implementation-auditor.agent.md` | vendor 到 `vendor/ec-web/skills/change-auditor/` |
| **P3** | WP-3 | skill-authoring-standards 元技能 | `skill-authoring-standards/SKILL.md` | vendor，不绑阶段 |
| **P3** | WP-4 | implement 分层顺序 + 引用同步验证 | `change-execution-orchestrator.agent.md` | 抽象成通用 implement 增强 |
| **P3** | WP-5 | 前端编码规范 skill 集（TS/React/Less/命名/Git + Vercel 性能规则） | `coding-standards` + `vercel-react-best-practices` | 按项目类型绑 implement/converge |
| **P3** | WP-6 | spec 防腐层设计模式 | `frontend-solution-designer.agent.md` | spec 阶段 skill 候选 |
| **P3** | WP-7 | explore 业务视角扫描 | `business-coverage-reporter.agent.md` | 并入 `exploration.md` 或 `business-map.json` |

### 4.2 不吸收项

| 来源 | 理由 |
|---|---|
| 编号 agent 线性流（1→3→4→5） | harness 已有 12 阶段状态机 + 事件流 + 门禁 |
| "专家 agent" 模式 | 强绑 EC 前端栈不可复用 |
| OpenSpec 5 个工作流 skill | 与 harness explore/spec/implement/verify/sync 重叠 |
| grill-me skill | grill 已是原生阶段且绑 `mattpocock/grilling` |
| 编码总指挥 agent | implement 阶段 + tasks 产物已覆盖 |
| ec-design MCP 强制查询规则 | 强绑 EC 私有组件库 |
| interaction-flow-mapper agent | wayfinder 已做依赖分析 |
| change-archiver agent | sync 阶段已覆盖 |

---

## 5. 待决策

| # | 决策项 | 说明 |
|---|---|---|
| ✅ D-v3 | 历史数据与兼容策略 | 已定：可废弃旧 Feature、事件、YAML 缓存和 Markdown 投影；R1 直接重构 Workflow v3，不兼容/回放旧数据 |
| ✅ D-v3-store | v3 唯一事实源与审计 | 已定：版本化 `workflow-state.json` 是唯一事实源；移除 `workflow-events.jsonl`，`history` 只审计不回放；原子写 + revision/CAS |
| ✅ D-v3-scope | R1 如何交付？ | 已定：R1.1/R1.2/R1.3 是三个串行 Feature；当前只做 R1.1，明确不拆 SC，不顺带开发 split/Quick |
| ✅ D-quick | Quick 如何定义与进入？ | 已定：所有需求先经 Explore；仅影响范围小、低风险、无需方案决策的小需求进入 Quick；正式 Feature 的 split 仍在 scope 后 |
| ❓ D1 | 统一关系模型（S-1）是否启动？ | 关系 schema 一次性整合还是分批接入？最大战略缺口，工作量也最大 |
| ❓ D3 | 联邦星型（S-2）是否本轮做？ | 单 hub 已满足个人三工程 |
| ❓ D4 | `mcp` 能力字段：做 MCP server 还是长期挂起？ | `adapters/registry.ts` 的 `mcp: true` 无消费方，仅预留边界 |
| ❓ D5 | Cursor Adapter（P2-10）是否有实际需求驱动？ | 其他 IDE 已完成 |
| ❓ D6 | Phase 4 外部 Skills 生命周期（S-3）是否启动？ | 网络约束（github.com 不通）是否影响？ |
| 🔶 D12 | 自有技能库（方案 A/D）剩余部分是否推进？ | 已有 skills/base + 6 模板，web-plugins 素材已到位；剩授权/去私有化审计、`vendor/ec-web/` 命名空间与 authoring-standards |
| ❓ D13 | 方案 B（每阶段 slash + 结构化返回）是否立项？ | 让 IDE agent 拿 JSON 结果 |
| ❓ D14 | 方案 C（IDE 工具/MCP 封装层）是否做？ | 成本大，建议先看 B/F 反馈 |
| ❓ D16 | 方案 F（四 agent 选择器 + 差异化安装）是否立项？ | 诉求二在初始化环节的入口，建议优先 |
| 🔶 D18 | 方案 H 剩余部分是否继续？ | adapter 多选已完成；待决定是否抽通用 `select`/`multiselect` 并支持 `project init --agent` |
| ❓ D-web | web-plugins 素材如何筛选吸收？ | 复制已完成；建议先授权/私有耦合审计，再做 WP-1 + WP-2，其余 WP-3~7 排 P3 |
| ❓ D-ad-hoc | 是否引入"ad-hoc 专家咨询"模式？ | web-plugins 的 fullstack-engineer 是按需专家。多数用户直接用宿主 AI，**暂不建议** |

---

## 6. 参考约定

### 6.1 本地使用方式

**本地同机使用无需发布 npm**，发布只对跨电脑必要。

```bash
pnpm run sovei:build                                    # 构建（= cd packages/sovei-core && pnpm run build）
node packages/sovei-core/dist/release/sovei.cjs --version  # 产物即完整 CLI 单文件
# 任意项目里用（指定 --root 或先 cd 进去）
node <path>/sovei.cjs --root d:/work/my-app project onboard
cd packages/sovei-core && npm link                      # 或临时全局链接（本机命令，不发布）
```

> 本地改代码 → `pnpm run sovei:build` → 直接用 `dist/release/sovei.cjs` 或 `npm link`，无需 npm publish。跨机用新版才走 `pnpm run release:sovei`。

### 6.2 发布说明校对（大版本更新必做）

`packages/sovei-core/README.md` 是发布说明文件，每次大版本校对：
- 「版本与发布」章节版本号（当前 **2.6.1**）。
- 命令速查表覆盖全部新增命令（`workspace preflight`、`context cross-feature-index/expand`、`adapters install/list`、`feature split/sub-change`、`project migrate`、`architecture scan/status/inspect/accept/dismiss/check` 等）。
- 能力概览表、外部 Skills 绑定表、安装/上手示例、环境要求（Node >= 14.18）、零运行时依赖描述。

### 6.3 Feature 命名约定

**递增数字编号（`NNN-描述`），三位数补零。**
- 新建时取 `specs/` 下最大编号 +1。
- `sovei workflow bootstrap <feature>` 接受任意名称，约定靠人遵守。
- 不用日期前缀和纯描述。
