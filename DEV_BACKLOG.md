# Sovei 待办总清单（缺陷 + 待开发 + 使用方式）

> 生成日期：2026-08-11（全面重整，含 spec 治理讨论结论 + web-plugins 吸收清单）
> 依据：全面扫描 `specs/` 下全部 Feature、`design-docs/` 设计文档、源码与 npm 发布状态。
> 目的：给出一张可判断方向的**开发总清单**，供人工排期。本文件不替代 Sovei 工作流，实际开发仍走 `load → … → sync` 12 阶段。

---

## 0. 当前状态快照

| 项 | 值 |
|---|---|
| 最新发布版本 | **2.5.9**（npm `latest`，2026-08-10） |
| 测试基线 | 179 / 179 通过（构建后） |
| Node 兼容 | CommonJS，`engines >= 14.18.0`（Node 14 可用） |
| 知识库 | 1 stable + 若干 candidate/pending |
| Skills | 8 阶段绑定，7 个第三方 skill 锁定 |
| P0 缺陷 | **全部清零** |
| 快速通道（S0） | ✅ 已实现（Feature 020/021/023/P2-7） |
| Merge Preflight | ✅ 已实现（未发布） |
| 过期感知 L1 | ✅ 已实现（Feature 024） |
| load 阶段增强 | ✅ 已实现（Feature 025） |
| 上下文包膨胀 | ✅ 已解决（Feature 022） |
| 战略级缺口 | 问题四（统一关系模型）未实现；问题三（Drift Detection）第一期不做 |

---

## 1. 已完成项（精简版）

> 以下项目已全部完成，仅作归档参考，不再展开分析。

| 完成时间 | 项 | Feature / 来源 |
|---|---|---|
| 2026-08-06 | skills 空壳解决 | Feature 014 |
| 2026-08-07 | Feature 016-skill-verify 闭合（工作流 P0-1） | Feature 016 |
| 2026-08-07 | 013 O1 声明式适配器注册晋级 stable（工作流 P0-2） | knowledge promote |
| 2026-08-09 | 红线 branch 作用域隔离（场景二 P0-1，已发 2.5.7） | Feature 018 |
| 2026-08-09 | 两套 contract 数据源统一（P1-1） | Feature 019 |
| 2026-08-09 | S0 快速通道六步闭环 | Feature 020 |
| 2026-08-10 | quick --json 输出精简（117KB→37KB） | Feature 021 |
| 2026-08-10 | 上下文包膨胀治理 + 子 Agent 契约（P1-3 / SA-1） | Feature 022 |
| 2026-08-10 | IDE 适配器快速通道指令 + .gitignore 自动排除 | Feature 023 |
| 2026-08-10 | 过期感知 L1（P0） | Feature 024 |
| 2026-08-10 | load 阶段增强（P1） | Feature 025 |
| 2026-08-10 | merge preflight 语义冲突预检（场景二 P0-2） | preflight 模块 |
| 2026-08-10 | _subagentContract 契约提示 | Feature 022 后修 |
| 2026-08-11 | quick 通道过度防御修复（P2-7） | Feature P2-7 |
| 2026-08-11 | Feature 流程遗留清理（4 个卡住 Feature 归档） | 人工确认 |

---

## 2. 未完成项（按优先级排列）

### P1 — 高优先级（直接影响日常使用体验）

| # | 项 | 简述 | 预估工作量 |
|---|---|---|---|
| ~~P1-1~~ | ~~**`sovei feature archive <id>`**~~ | ✅ **已完成**（2026-08-11，Feature 026）：过程产物折叠到 `_archive/`，持久文件留顶层。排除法归档（白名单排除），幂等，状态检查。测试 186/186 通过 | — |
| **P1-2** | **`sovei feature summary <id>`** | 从 Feature 的事件流 + 各阶段产物中生成一个聚合的人可读视图（`summary.md`），包含：需求 → 决策 → 变更 → 验证 → 经验的完整故事线。替代原"独立 docs 系统"思路——先做 CLI 生成静态 .md，零运行时依赖 | 1 Feature |
| ~~P1-3~~ | ~~**README 版本同步**~~ | ✅ **已完成**（2026-08-11，快速通道 quick-msosv36f）：版本号已是 2.5.10（三方同步）；命令速查表补充 5 条新命令（`context cross-feature-index`、`context expand`、`quick`、`workspace preflight`、`adapters install/list`） | — |
| **P1-4** | **知识提取复用价值阈值** | 防 knowledge 膨胀：定义最少证据数 / 最小复用次数才入库的阈值规则。当前 trust-but-verify 机制（candidate→pending→stable）已有基础，缺前置门槛 | 1 Feature |

> **spec 治理讨论结论（2026-08-11）**：用户提出"拆机器层（git 内结构化）+ 人层（生成 docs + 蒸馏）"的架构级思路。经多角度分析后判断：方向对但对当前规模过度工程。先用 P1-1（archive）+ P1-2（summary）两个小 Feature 解决 80% 不适感，观察后再决定是否需要更深层的拆分。核心洞察：大部分阶段产出本身已是人可读摘要，再蒸馏一层信噪比低；docs 不放 git 会引入"clone 后看不到"的新问题。

### P2 — 中优先级（有价值，非阻塞）

| # | 项 | 简述 | 依赖 |
|---|---|---|---|
| **P2-1** | **`--json` 全覆盖** | workflow/knowledge/workspace 等命令无法被脚本/CI 消费。需补齐 JSON 输出 | — |
| **P2-2** | **CI/CD 集成模板** | GitHub Actions / GitLab CI 流水线模板（企业推广时用） | P2-1 |
| **P2-3** | **`context build --paths` 语义修正** | `--paths` 当前仅用于 project rules 匹配，应同时过滤 required 红线/stable rules | — |
| **P2-4** | **`usage export --redacted`** | usage.jsonl 脱敏后供团队评测共享。需定义脱敏字段、时间桶聚合、导出命令 | — |
| **P2-5** | **外部 Skills 多 binding（P2-2 旧编号）** | 一个阶段注入多个 skill（如 grill 同时绑定 grilling + domain-modeling）。需扩展 `skill-map` schema 和 adapter 逻辑 | — |
| **P2-6** | **Skill reference 加载策略** | 合并旧 P2-3（读更多附加文件）与 WP-1（按需读不全量内联）两个方向相反的项，统一设计 frontmatter `reference-loading: on-demand` 机制。所有 skill 受益的引擎层基础改进 | WP-D1 决策 |
| **P2-7** | **verify 结构化审查 skill（WP-2）** | vendor `change-auditor` skill 到 `harness/vendor/ec-web/skills/`，替换或并存当前 `mattpocock/code-review`。审查链路：需求映射→Scenario→代码→tasks→Impact→规范→lint/tsc | WP-D2 决策 |
| **P2-8** | **阶段上下文预算值** | shadow policy 已计算三变体字符数，但未设定阈值。需先观测真实使用数据再定预算 | 等评测数据 |
| **P2-9** | **013 O2 sentinel upsert 晋升** | 已覆盖 3 Feature，第 4 个复用则晋升 stable。被动等待，不需主动开发 | — |
| **P2-10** | **Cursor Adapter** | `adapters/registry.ts` 中 `cursor: pending`。其他 4 个 IDE（Codex/Claude/CodeBuddy/Trae）已完成 | 有无实际需求 |
| **SA-2** | **子 Agent：context build 组装** | 分组并行加载 required 项 | — |
| **SA-3** | **子 Agent：converge/verify 代码审查** | 分维度并行审查（类型安全/测试覆盖/规则合规/架构合规） | — |
| **SA-5** | **子 Agent：preflight 并行检测** | 三类冲突检测并行。当前数据量小收益有限 | — |
| **SA-6** | **子 Agent：learn 知识提取** | 并行提取/搜索/评估，写入串行保一致性 | — |

### P3 — 战略级 / 低优先级

| # | 项 | 简述 |
|---|---|---|
| **S-1** | **统一关系模型（问题四，Graph Coding 核心）** | 定义关系 schema + 适配器接入现有 JSON。距最终 Graph Coding 还差 4 层（统一关系模型 → 正向影响分析 → 反向同步 → 图查询上下文）。语义合并预检已由 preflight 实现。**完全未实现，是最大战略缺口** |
| **S-2** | **联邦星型（multi-hub）** | 多主干/多团队对账。当前单 hub 已满足个人三工程 |
| **S-3** | **Phase 4：vendor lock + 上游 diff + 安装器评估** | 外部 Skills 生命周期管理。网络约束：github.com 不通，需 raw 通道 |
| **S-4** | **Phase 2 回放验证** | 用一个真实普通 Feature 和一个长周期 Feature 回放验证完整工作流 |
| **S-5** | **Drift Detection（问题三）** | 第一期不做。决策理由：没有门禁 drift 一定发生（做检测也没用），有门禁不需要检测（个人用 L1 过期感知已覆盖，企业靠 CI 门禁强制） |
| **L-1** | **一键本地安装脚本 `use-local.ps1`** | build + npm link 一条命令 |
| **L-2** | **README 补充本地使用章节** | npm link 说明 |
| **WP-3** | **skill-authoring-standards 元技能** | 教用户写好 skill 的元技能。vendor 到 `harness/vendor/ec-web/skills/` |
| **WP-4** | **implement 分层顺序 + 引用同步验证** | 需抽象掉 EC 三层架构，工作量中等 |
| **WP-5** | **前端编码规范 skill 集** | 剥离 EC 专属内容（Rematch/Zustand/ec-design）后 vendor |
| **WP-6** | **spec 防腐层设计模式** | 前端 spec 阶段 skill 候选 |
| **WP-7** | **load 业务视角扫描** | 并入 load-summary.md 或 business-map.json |

---

## 3. 本地使用方式

**结论：本地同一台电脑使用，根本不需要发布到 npm。** 发布 npm 只对跨电脑有必要。

```bash
# 1) 构建一次
pnpm run sovei:build            # = cd packages/sovei-core && pnpm run build

# 2) 构建产物就是完整 CLI 单文件
node packages/sovei-core/dist/release/sovei.cjs --version

# 3) 在任意项目里用（指定 --root，或先 cd 进去）
node d:/project/harness/packages/sovei-core/dist/release/sovei.cjs \
  --root d:/work/my-app project onboard

# 4) 也可以临时全局链接（本机全局命令，但不发布）
cd packages/sovei-core && npm link
sovei --version        # 本机任何目录都能敲 sovei，改代码后重新 build + link 即更新
```

> 关键点：**本地改代码 → `pnpm run sovei:build` → 直接用 `dist/release/sovei.cjs` 或 `npm link` 即可**，无需走 npm publish。

只有要在这台电脑之外的机器用新版时，才走 `pnpm run release:sovei` 发布。发布流程、OTP、`latest`/`next` 标签见根目录 `release-sovei.ps1` 与 README。

---

## 4. 待人工决策

| # | 决策项 | 说明 |
|---|---|---|
| ❓ D1 | **统一关系模型（S-1）是否启动？** | 关系 schema 设计范围——一次性整合所有 JSON 还是分批接入？这是最大战略缺口，但工作量也最大 |
| ❓ D2 | **`context build --paths` 语义修正（P2-3）是否独立立项？** | 与上下文包膨胀治理直接相关，但 Feature 022 已部分覆盖 |
| ❓ D3 | **联邦星型（S-2）是否本轮做？** | 单 hub 已满足个人三工程，规模化后再做也行 |
| ❓ D4 | **`mcp` 能力字段（P1-2 旧编号）：做 MCP server 还是长期挂起？** | `adapters/registry.ts` 的 `mcp: true` 无消费方，仅预留边界 |
| ❓ D5 | **Cursor Adapter（P2-10）是否有实际使用需求驱动？** | 其他 4 个 IDE 已完成 |
| ❓ D6 | **Phase 4 外部 Skills 生命周期（S-3）是否启动？** | 网络约束（github.com 不通）是否影响？ |
| ❓ D7 | **WP-1 渐进式 reference 加载（P2-6）是否优先做？** | 引擎层基础改进，所有 skill 受益。与旧 P2-3 方向相反需协同设计 |
| ❓ D8 | **WP-2 change-auditor 替换还是并存 verify 当前绑定？** | 替换：更结构化；并存：需 P2-5 多 binding 支持（当前未实现）。建议先 vendor 为 candidate，人工评测后再 enable |
| ❓ D9 | **WP-4 implement 分层增强是否立项？** | 需抽象掉 EC 三层架构，工作量中等 |
| ❓ D10 | **WP-5 前端 skill 集是否剥离 EC 专属内容后 vendor？** | 剥离后 TS/React/Less/命名/Git 规范通用部分对任何前端项目可用 |
| ❓ D11 | **是否引入"ad-hoc 专家咨询"模式？** | web-plugins 的 fullstack-engineer 是用户按需调用的非阶段专家。harness 目前无此模式，多数用户直接用宿主 AI 做 ad-hoc，**暂不建议** |

---

## 5. 建议开发顺序

| 步骤 | 项 | 优先级 | 状态 |
|---|---|---|---|
| 1 | `sovei feature archive <id>` — 过程产物折叠 | P1 | ❌ 待开发 |
| 2 | `sovei feature summary <id>` — 聚合人可读视图 | P1 | ❌ 待开发 |
| 3 | README 版本同步 | P1 | ❌ 待开发 |
| 4 | 知识提取复用价值阈值 | P1 | ❌ 待开发 |
| 5 | `--json` 全覆盖 | P2 | ❌ 待开发 |
| 6 | `context build --paths` 语义修正 | P2 | ❌ 待开发 |
| 7 | WP-1 / P2-6 Skill reference 加载策略 | P2 | ❌ 待开发 |
| 8 | WP-2 verify 结构化审查 skill | P2 | ❌ 待开发 |
| 9 | CI/CD 集成模板 | P2 | ❌ 待开发 |
| 10 | 子 Agent 强化 SA-2/3/5/6 | P2 | ❌ 待评估 |
| 11 | 其余 P2（usage export / 多 binding / 预算值 / Cursor / O2 晋升） | P2 | ❌ 待开发 |
| 12 | 统一关系模型（问题四） | P3 | ❌ 待决策 |
| 13 | 联邦星型 / Phase 4 / Phase 2 回放验证 | P3 | ❌ 待决策 |
| 14 | 本地使用优化（use-local.ps1 + README 补充） | 低 | ❌ 待开发 |

> **原则**：先做 P1-1/P1-2 观察 spec 治理体验，再决定是否需要架构级拆分。P2 按"使用频率 × 痛点程度"排，不按编号顺序。

---

## 6. 发布说明校对（大版本更新时必做）

- **`packages/sovei-core/README.md` 是发布说明文件**，每次大版本更新需校对：
  - 「版本与发布」章节版本号（当前 README 写 2.5.7，实际已发 2.5.9，**需同步**）
  - 命令速查表是否覆盖全部新增命令（`workspace preflight`、`context cross-feature-index`、`context expand`、`adapters install/list` 等）
  - 能力概览表、外部 Skills 绑定表、安装/上手示例
  - 环境要求（Node >= 14.18）、发布产物 `sovei.cjs`、零运行时依赖描述

---

## 7. Feature 命名约定

**规则：继续用递增数字编号（`NNN-描述`），三位数补零。**

- 新建 Feature 时取 `specs/` 下最大数字编号 +1
- `sovei workflow bootstrap <feature>` 接受任意名称，约定靠人遵守
- 已有约定：`001-discipline-gate`、`002-replenish-close-reason`、`003-fasttrade-engineering`
- 日期前缀和纯描述都不用

---

## 8. web-plugins 吸收清单（2026-08-11）

> 来源：扫描 `web-plugins/ec-web-ai-plugin/`（EC 前端团队 VS Code Copilot 插件，1.0.25）。含 8 个 `.agent.md`、6 个 skill、1 个 MCP。

### 8.1 待吸收项

| 优先级 | # | 项 | 来源 | 注入点 | 说明 |
|---|---|---|---|---|---|
| **P2** | WP-1 | **渐进式 reference 加载** | `coding-standards/SKILL.md` | 引擎层：改 `adapter.ts` `loadReferenceFiles` | 当前全量内联 references，对多 reference skill 会爆 prompt。支持 frontmatter `reference-loading: on-demand` 时不自动内联。**所有 skill 受益** |
| **P2** | WP-2 | **verify 结构化审查 skill** | `change-implementation-auditor.agent.md` | vendor 到 `harness/vendor/ec-web/skills/change-auditor/` | 审查链路：需求映射→Scenario→代码→tasks→Impact→规范→lint/tsc。比当前 verify 绑定的 `mattpocock/code-review` 更结构化 |
| **P3** | WP-3 | **skill-authoring-standards 元技能** | `skill-authoring-standards/SKILL.md` | vendor，不绑阶段 | agentskills.io 规范 + 元数据校验 + 500 行上限 + 渐进式披露 |
| **P3** | WP-4 | **implement 分层顺序 + 引用同步验证** | `change-execution-orchestrator.agent.md` | 抽象成通用 implement 增强 | EC 强绑服务→状态→视图三层。需抽象为"声明层序 + 每层后引用同步验证"通用模式 |
| **P3** | WP-5 | **前端编码规范 skill 集** | `coding-standards` + `vercel-react-best-practices` | vendor，按项目类型绑 implement/converge | TS/React/Less/命名/Git + Vercel 35+ 性能规则。EC 专属内容需剥离 |
| **P3** | WP-6 | **spec 防腐层设计模式** | `frontend-solution-designer.agent.md` | spec 阶段 skill 候选 | "前端主导接口设计 + 防腐层 + 实体关系优先"。强绑 OpenSpec，需改写 |
| **P3** | WP-7 | **load 业务视角扫描** | `business-coverage-reporter.agent.md` | 并入 load-summary.md 或 business-map.json | 业务视角扫项目→非技术摘要 |

### 8.2 不吸收项

| 来源 | 不吸收理由 |
|---|---|
| 编号 agent 线性流（1→3→4→5） | harness 已有 12 阶段状态机 + 事件流 + 门禁，退回 agent-per-stage 是倒退 |
| "专家 agent" 模式 | 强绑 EC 前端栈不可复用；harness 模型是"通用阶段 + 可绑 skill"，比硬编码专家 agent 更灵活 |
| OpenSpec 5 个工作流 skill | 与 harness 的 load/spec/implement/verify/sync 功能重叠，引入会形成并行流程 |
| grill-me skill | harness grill 已是原生阶段且已绑 `mattpocock/grilling` |
| 编码总指挥 agent | 名为"总指挥"实为"单 change 全干"，implement 阶段 + tasks 产物已覆盖 |
| ec-design MCP 强制查询规则 | 强绑 EC 私有组件库。可抽象为"外部依赖类型强制核验"规则，但不直接吸收 |
| interaction-flow-mapper agent | 价值有限，harness wayfinder 已做依赖分析 |
| change-archiver agent | 归档动作，harness sync 阶段已覆盖 |

---

## 9. 战略级能力缺口（存档）

### 问题三：Drift Detection — 第一期不做（已决 2026-08-10）

**问题**：普通 AI 会话直接变更代码后，业务红线/代码地图/知识库等治理资产不可信。

**决策理由**：没有门禁 drift 一定发生（做检测也没用），有门禁不需要检测。个人用 L1 过期感知（Feature 024）+ 基线重新校准已覆盖；企业靠 CI 门禁强制走 sovei。行业级未解问题（OpenSpec/SpecKit/Superpower 都没解决）。

**如未来重启需实现**：代码变更检测（baseline vs 工作区）→ 影响面评估（红线 scope / coverage-matrix / knowledge codeEvidence）→ 可信度标记（stale）→ CLI 入口（`sovei drift check`）。依赖统一关系模型做精确影响面计算。

### 问题四：统一关系模型（Graph Coding）— 完全未实现

**问题**：业务地图、代码地图、红线、Context Pack、Scope、Coverage Matrix、Wayfinder、Spec/Task/Evidence 等关系分散在不同 JSON、文档和模块中。

**距最终 Graph Coding 还差 4 层**：

| # | 缺失能力 | 说明 |
|---|---|---|
| 1 | **统一关系模型** | 定义业务能力、代码入口、模块、规则、Spec、Task、Evidence 之间的关系 |
| 2 | **正向影响分析** | 业务需求变化后，自动重新计算受影响的代码、规则和验证面 |
| 3 | **反向同步** | 代码修改后，反向更新代码地图和业务地图 |
| 4 | **图查询上下文** | AI 根据关系图自动生成最小且正确的上下文 |

> 第 4 层（语义合并预检）已由 preflight 模块实现（2026-08-10）。

**设计原则**（来自 014 学习报告，尚未晋升 stable）：
- `structural-fact`（可自动覆盖）vs `semantic-annotation`（不可自动覆盖）的区分应成为核心设计原则
- skill body 是 structural-fact，Sovei 阶段契约是 semantic-annotation

**建议路径**：统一关系模型（定义 schema + 适配器）→ 正向影响分析 → 反向同步 → 图查询上下文
