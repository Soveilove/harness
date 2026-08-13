# Sovei 开发清单（待开发 + 功能设计）

> 用途：**活跃开发文档**——只保留待开发项、开发顺序、功能设计与待决策。
> 已完成功能与历史决策见 [doc/DEV_ARCHIVE.md](doc/DEV_ARCHIVE.md)。
> 最新校准：2026-08-13（拆分归档 + 对照源码逐项核账）。
> 实际开发走 `explore → load → … → sync` **13 阶段**，以 `explore` 起手（`sovei workflow explore <feature> --prd <path>` 或 `--brief "<描述>"`）。

---

## 0. 状态快照

| 项 | 值 |
|---|---|
| 最新发布版本 | **2.6.1**（npm `latest`，2026-08-13，13 阶段闭环 + 七大重大更新） |
| 工作流阶段 | **13 阶段**：`explore → load → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync` |
| 测试基线 | **214 / 214 通过**（2026-08-13 构建后实测；含 explore 阶段测试） |
| Node 兼容 | 运行时 CommonJS，`engines >= 14.18.0`；⚠️ **构建/测试需 Node 18+**（TypeScript 7 依赖，本机用 `D:\nvm\v24.19.0`） |
| P0 缺陷 | 全部清零 |
| P1 待开发 | 仅剩 **P1-4**（知识提取复用价值阈值） |

**当前能力状态：**

| 能力 | 状态 |
|---|---|
| 自有技能库（方案 A/D） | 🔶 部分：已有 `sovei-flow/skills/base/` + 6 模板；缺 `vendor/ec-web/` 命名空间与 authoring-standards 元技能 |
| Codex 技能封装（方案 G） | ✅ 已完成（N3） |
| 四 agent 选择器（方案 F） | ❌ 未实现（`project init --agent` 不存在） |
| CLI 交互面板（方案 H） | ❌ 未实现（`cli/interactive/` 不存在） |
| 架构治理接入工作流（P2-12） | ⚠️ 命令已实现，未接入 13 阶段运行时 |
| web-plugins 素材 | ⚠️ 目录不在本机，§4 吸收项阻塞待复制 |
| 统一关系模型（问题四） | ❌ 未实现（最大战略缺口） |

---

## 1. 开发顺序（4 条泳道）

> 排序依据：**依赖关系 > 使用频率 × 痛点 > 战略价值**。

**一句话执行路径：** `P1-4 → P2-12 → P2-1/P2-3`（主线）｜ `H → F(并行 A/D) → B`（体验层）｜ WP-* 等 web-plugins 复制到位。

### 🟢 主线 A：无依赖，立即可开工

| 步 | 项 | 编号 | 优先级 | 备注 |
|---|---|---|---|---|
| 1 | 知识提取复用价值阈值 | P1-4 | **P1** | 唯一剩余 P1；防 knowledge 膨胀 |
| 2 | 架构信号注入工作流阶段（"随开发自动治理"闭环） | P2-12 | **P2 高** | 用户已确认；核心模块已交付，仅缺 engine 注入 |
| 3 | `--json` 全覆盖 | P2-1 | P2 | CI/CD 模板与脚本消费前置 |
| 4 | `context build --paths` 语义修正 | P2-3 | P2 | 独立小改 |

### 🔵 主线 B：交互与初始化体验（依赖链 H → F → B）

```
        ┌─ A/D 自有技能内容（可并行铺）
  H ────┤                              H 是 F 的前提
        └→ F 四 agent 选择器 ──→ B 每阶段 slash + JSON
```

| 步 | 项 | 方案 | 前置 | 备注 |
|---|---|---|---|---|
| 5 | CLI 交互面板层（空格选/Enter 确认/↑↓） | H | 无 | 自研 readline，零依赖；所有多选命令底座 |
| 6 | 自有技能命名空间 + authoring-standards 元技能 | A/D | 部分依赖 web-plugins（可先建骨架） | 补 `vendor/ec-web/` 与元技能 |
| 7 | 四 agent 选择器 + 差异化安装 | F | H + A/D | `project init --agent` 四选 |
| 8 | 每阶段 slash command + 结构化 JSON 返回 | B | F | 从 quick 扩到 13 阶段全覆盖 |

### 🟠 阻塞区：等 web-plugins 复制到位（见 §5 D-web）

```
素材到位 → WP-1 渐进式 reference 加载 → WP-2 verify 审查 skill → WP-3~7
```

### ⚪ 战略 / 后续

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

**现状**：演进式架构治理是**独立手动命令**（scan/status/inspect/accept/dismiss/check），**未接入 13 阶段工作流运行时**。核查证据：`workflow-engine.ts:614` 装配上下文时加载的是 `context/snapshot.ts` 的知识库快照（`knowledge/.snapshot.json`），`src/context/` 对 `module-metrics.json`/`debt-register.json` 引用为 **0**；scope/converge/learn 阶段 prompt 虽写"最新架构健康快照"字样，但引擎未真正注入架构数据，只停留在文本提示层。

**四步闭环设计**：
1. **上下文注入**：`workflow-engine` 装配阶段上下文时读 `architecture/module-metrics.json` + `debt-register.json`，把涉及模块的信号/债务注入 scope/plan/converge。
2. **converge 门禁**：converge 后对比 baseline 与当前扫描，新增 refactor-required 热点时在报告提示。
3. **learn 自动登记**：多 Feature 反复触同一热点时自动调 `repository.accept` 生成债务条目（当前仅 prompt 建议未自动执行）。
4. **CI 挂接**：verify/complete 门禁可选 `architecture check --fail-on required`。

**目标**：跑工作流时架构治理随开发自动发生，而非靠人手动敲 `sovei architecture`。核心模块（analyzer/policy/repository）已随 v2.6.1 交付，不改变原有 13 阶段结构。

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

### 3.4 诉求三：CLI 交互面板层（方案 H）

**现状痛点**：`adapters install` 无参数时只 `console.log` 打印列表 + 提示手工敲 `--adapters trae,codebuddy`，无交互面板。同类问题散落在 `adapters install`、`project init --adapters/--agent`、`skills bind` 等命令。

**关键约束——零运行时依赖**：不能引 inquirer/prompts/enquirer，须自研（Node 原生 `readline` + 终端转义序列）。

**方案 H 设计要点**：
- 建 `src/cli/interactive/` 模块，两类原语：
  - **单选 `select(prompt, items)`**：↑↓ 导航，Enter 确认 → 返回选中项。用于 `project init --agent` 四选。
  - **多选 `multiselect(prompt, items)`**：↑↓ 导航，空格勾选/取消，Enter 确认 → 返回集合。用于 `adapters install`。
- **终端能力检测**：非 TTY（管道/CI）自动降级为文本提示，保证 `--json`/脚本不受影响。
- **与 commander 结合**：有参数直接走参数；无参数才弹面板，面板只是便捷层。
- 应用范围：`adapters install`、`project init --adapters/--agent`、`skills bind`、`feature archive` 等。

> **依赖结论**：H 是 F 的操作前提（F 的四选 + adapters 多选都要 H）。**H 先于或并行于 F**。

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

## 4. web-plugins 吸收清单（阻塞待素材）

> ⚠️ **阻塞状态**：`web-plugins/` 目录**当前不在本机**，用户将复制过来。素材到位前 WP-* 无法开工，不影响 §1 其余顺序。到位后按 D-web 优先级启动。
> 来源：`web-plugins/ec-web-ai-plugin/`（EC 前端团队 VS Code Copilot 插件 1.0.25）。含 8 个 `.agent.md`、6 个 skill、1 个 MCP。剥离 EC 专属后沉淀进 `vendor/ec-web/skills/`。

### 4.1 待吸收项

| 优先级 | # | 项 | 来源 | 注入点 |
|---|---|---|---|---|
| **P2** | WP-1 | 渐进式 reference 加载（所有 skill 受益） | `coding-standards/SKILL.md` | 引擎层：改 `adapter.ts` `loadReferenceFiles` |
| **P2** | WP-2 | verify 结构化审查 skill（需求映射→Scenario→代码→tasks→Impact→规范→lint/tsc） | `change-implementation-auditor.agent.md` | vendor 到 `vendor/ec-web/skills/change-auditor/` |
| **P3** | WP-3 | skill-authoring-standards 元技能 | `skill-authoring-standards/SKILL.md` | vendor，不绑阶段 |
| **P3** | WP-4 | implement 分层顺序 + 引用同步验证 | `change-execution-orchestrator.agent.md` | 抽象成通用 implement 增强 |
| **P3** | WP-5 | 前端编码规范 skill 集（TS/React/Less/命名/Git + Vercel 性能规则） | `coding-standards` + `vercel-react-best-practices` | 按项目类型绑 implement/converge |
| **P3** | WP-6 | spec 防腐层设计模式 | `frontend-solution-designer.agent.md` | spec 阶段 skill 候选 |
| **P3** | WP-7 | load 业务视角扫描 | `business-coverage-reporter.agent.md` | 并入 load-summary.md 或 business-map.json |

### 4.2 不吸收项

| 来源 | 理由 |
|---|---|
| 编号 agent 线性流（1→3→4→5） | harness 已有 13 阶段状态机 + 事件流 + 门禁 |
| "专家 agent" 模式 | 强绑 EC 前端栈不可复用 |
| OpenSpec 5 个工作流 skill | 与 harness load/spec/implement/verify/sync 重叠 |
| grill-me skill | grill 已是原生阶段且绑 `mattpocock/grilling` |
| 编码总指挥 agent | implement 阶段 + tasks 产物已覆盖 |
| ec-design MCP 强制查询规则 | 强绑 EC 私有组件库 |
| interaction-flow-mapper agent | wayfinder 已做依赖分析 |
| change-archiver agent | sync 阶段已覆盖 |

---

## 5. 待决策

| # | 决策项 | 说明 |
|---|---|---|
| ❓ D1 | 统一关系模型（S-1）是否启动？ | 关系 schema 一次性整合还是分批接入？最大战略缺口，工作量也最大 |
| ❓ D3 | 联邦星型（S-2）是否本轮做？ | 单 hub 已满足个人三工程 |
| ❓ D4 | `mcp` 能力字段：做 MCP server 还是长期挂起？ | `adapters/registry.ts` 的 `mcp: true` 无消费方，仅预留边界 |
| ❓ D5 | Cursor Adapter（P2-10）是否有实际需求驱动？ | 其他 IDE 已完成 |
| ❓ D6 | Phase 4 外部 Skills 生命周期（S-3）是否启动？ | 网络约束（github.com 不通）是否影响？ |
| 🔶 D12 | 自有技能库（方案 A/D）剩余部分是否推进？ | 已有 skills/base + 6 模板；剩 `vendor/ec-web/` 命名空间 + authoring-standards（依赖 web-plugins） |
| ❓ D13 | 方案 B（每阶段 slash + 结构化返回）是否立项？ | 让 IDE agent 拿 JSON 结果 |
| ❓ D14 | 方案 C（IDE 工具/MCP 封装层）是否做？ | 成本大，建议先看 B/F 反馈 |
| ❓ D16 | 方案 F（四 agent 选择器 + 差异化安装）是否立项？ | 诉求二在初始化环节的入口，建议优先 |
| ❓ D18 | 方案 H（CLI 交互面板层）是否立项？ | 是 F 的操作前提，收益面广 |
| ❓ D-web | web-plugins 复制到位后按什么优先级启动 §4？ | 建议先 WP-1（引擎层，所有 skill 受益）+ WP-2（verify 审查），其余 WP-3~7 排 P3 |
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
