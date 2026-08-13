# Sovei 待办总清单（缺陷 + 待开发 + 使用方式）

> 生成日期：2026-08-11（全面重整，含 spec 治理讨论结论 + web-plugins 吸收清单）
> 最新追加：2026-08-13 —— Feature 030 拆分能力完成（12 阶段全闭合）；**七大重大更新 N1~N7 全部完成并发布 v2.6.1**；新增「架构信号注入工作流阶段」闭环待办。
> 依据：全面扫描 `specs/` 下全部 Feature、`design-docs/` 设计文档、源码与 npm 发布状态。
> 目的：给出一张可判断方向的**开发总清单**，供人工排期。本文件不替代 Sovei 工作流，实际开发走 `explore → load → … → sync` 13 阶段，**以 `explore` 起手**（`sovei workflow explore <feature> --prd <path>` 或 `--brief "<描述>"` 一条指令创建 Feature + 需求分析 + 拆分提议）。

---

## 0. 当前状态快照

| 项 | 值 |
|---|---|
| 最新发布版本 | **2.6.1**（npm `latest`，2026-08-13，13 阶段闭环 + 七大重大更新） |
| 测试基线 | 214 / 214 通过（构建后） |
| Node 兼容 | CommonJS，`engines >= 14.18.0`（Node 14 可用） |
| 知识库 | 1 stable + 若干 candidate/pending |
| Skills | 8 阶段绑定，7 个第三方 skill 锁定 + 6 个基座模板（vue2/vue3/react/cli/python/quant） |
| P0 缺陷 | **全部清零**（含场景二 P0-1/P0-2、工作流 P0-1/P0-2） |
| 快速通道（S0） | ✅ 已实现（Feature 020/021/023/P2-7） |
| Merge Preflight | ✅ 已实现（preflight 模块） |
| 过期感知 L1 | ✅ 已实现（Feature 024） |
| load 阶段增强 | ✅ 已实现（Feature 025） |
| 上下文包膨胀 | ✅ 已解决（Feature 022） |
| Feature 拆分 | ✅ 已实现（Feature 030，含 P0-A 引擎自主拆分提示） |
| 七大重大更新 N1~N7 | ✅ 全部完成（2026-08-13） |
| 演进式架构治理 | ⚠️ **scan/status/inspect/accept/dismiss/check 已实现，但未接入工作流运行时**（见 P2-12） |
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
| 2026-08-12 | Feature 029 聚合视图命令（P1-2） | Feature 029 |
| 2026-08-13 | **Feature 030 拆分能力**（Feature 拆子变更并行开发 + P0-A 引擎自主拆分提示） | Feature 030 |
| 2026-08-13 | **N7 引擎 Feature 拆分能力** | Feature 030 |
| 2026-08-13 | **N1 12 节点 skills 分开存放**（init 新增 `sovei-flow/agents/`） | 重大更新 N1 |
| 2026-08-13 | **N2 Skills 基座**（init 预置 6 个技能模板） | 重大更新 N2 |
| 2026-08-13 | **N3 Codex 独立适配**（12 节点按钮 + skillPackage 技能包） | 重大更新 N3 |
| 2026-08-13 | **N4 init 产物改名 harness → sovei-flow**（`project migrate` 迁移脚本） | 重大更新 N4 |
| 2026-08-13 | **N5 开源 + MIT + README 全面重写 + npm 包路径调整** | 重大更新 N5 |
| 2026-08-13 | **N6 版本更新提示机制**（version-check.ts，零依赖 registry 检查） | 重大更新 N6 |
| 2026-08-13 | **P0-B 工作流节点调用层**（slash command / Codex skill / 文本三层） | P0-B |

---

## 2. 未完成项（按优先级排列）

### P1 — 高优先级（直接影响日常使用体验）

| # | 项 | 简述 | 预估工作量 |
|---|---|---|---|
| ~~P1-1~~ | ~~**`sovei feature archive <id>`**~~ | ✅ **已完成**（2026-08-11，Feature 026）：过程产物折叠到 `_archive/`，持久文件留顶层。排除法归档（白名单排除），幂等，状态检查。测试 186/186 通过 | — |
| ~~P1-2~~ | ~~**`sovei feature summary <id>`**~~ | ✅ **已完成**（2026-08-12，Feature 029）：从事件流 + 各阶段产物生成聚合 `summary.md`（需求→决策→变更→验证→经验→结论六章节），`_archive/` 回退支持归档后还原，支持 `--json` 结构化输出，状态容忍（in_progress/产物缺失降级），零运行时依赖。测试 192/192 通过。**P1 全部清零** | — |
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
| **P2-11** | **architecture scan 支持 Python（`.py`）** | 默认 `includeExtensions` 是 TS/JS 家族（`.ts/.tsx/.js/.jsx/.vue/.svelte/.mjs/.cjs`，见 `policy.ts`），不含 `.py`。需：① includeExtensions 加 `.py`（或按项目类型扩展）；② analyzer 的依赖解析（fanIn/fanOut）适配 Python `import`/`from ... import` 语法；③ branch/function 度量适配 Python 缩进块。**备注**：Sovei 核心（workflow/quick/governance/knowledge/context）与语言无关、正常在用；scan 仅是不支持 Python 的附带辅助功能，当前已有 `test_arch_layers.py` 替代，不阻塞任何实际开发。**来源**：别人 AI 引入的待办 | 有 Python 项目时 |
| **P2-12** | **架构信号注入工作流阶段（"随开发自动治理"闭环）** | 演进式架构治理目前是**独立手动命令**（scan/status/inspect/accept/dismiss/check），**未接入 12 阶段工作流运行时**。核查证据：`workflow-engine.ts:614` 装配上下文时加载的是 `context/snapshot.ts` 的**知识库快照**（`knowledge/.snapshot.json`），`src/context/` 对 `module-metrics.json`/`debt-register.json` 引用为 **0**；scope/converge/learn 阶段 prompt 虽写有"最新架构健康快照"字样，但引擎并未真正注入架构数据，只停留在让 AI 自行感知的文本提示层。需实现四步闭环：①**上下文注入**——`workflow-engine` 装配阶段上下文时读 `architecture/module-metrics.json` + `debt-register.json`，把涉及模块的信号/债务注入 scope/plan/converge；②**converge 门禁**——converge 后对比 baseline 与当前扫描，新增 refactor-required 热点时在报告提示；③**learn 自动登记**——多 Feature 反复触同一热点时自动调 `repository.accept` 生成债务条目（当前仅 prompt 建议未自动执行）；④**CI 挂接**——verify/complete 门禁可选 `architecture check --fail-on required`。**目标**：跑工作流时架构治理随开发自动发生，而非靠人手动敲 `sovei architecture` | 1 Feature |
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
| ❓ D12 | **是否启动自有 agent/skills 技能库（方案 A/D）？** | 摆脱对 mattpocock/softaworks 的依赖，沉淀我们自己的编码规范/工程方法论，`project init` 即引用。这是诉求一 |
| ❓ D13 | **是否扩展 adapter 生成每阶段 slash command + 结构化返回（方案 B）？** | 让 IDE agent 用斜杠命令直接触发 load/spec/implement 等阶段并拿 JSON 结果。这是诉求二的中成本方案 |
| ❓ D14 | **是否做 `sovei` 的 IDE 工具/MCP 封装层（方案 C）？** | 把 workflow/quick/context 暴露为 IDE 可调用工具。成本大，建议先看 B/F 的使用反馈再定 |
| ❓ D15 | **自有技能库内容优先级？** | 先吸收哪个：编码规范（TS/React/Git）、工作流增强、还是工程方法论？建议从 web-plugins 可剥离素材（WP-3/5）起步 |
| ❓ D16 | **是否做初始化四 agent 选择器 + 差异化安装（方案 F）？** | `project init` 交互式选 Claude Code/CodeBuddy/Trae/Codex，按各自指令/技能机制安装。诉求二在初始化环节的入口，建议优先 |
| ❓ D17 | **是否做 Codex 技能封装（方案 G）？** | 桌面版 Codex 不支持指令，需把 `sovei` 工作流封装成技能包（聚合或每阶段）。这是 Codex 用户的唯一顺畅触发方式 |
| ❓ D18 | **是否自研 CLI 交互面板层（方案 H）？** | 空格选择/Enter 确认/↑↓ 导航，应用 `adapters install`、`project init --agent` 等多选/不指定参数场景。受零运行时依赖约束，需自研（readline + 转义序列），不能引第三方库。是方案 F 的操作前提 |

---

## 5. 建议开发顺序

| 步骤 | 项 | 优先级 | 状态 |
|---|---|---|---|
| 1 | `sovei feature archive <id>` — 过程产物折叠 | P1 | ✅ 已完成（Feature 026） |
| 2 | `sovei feature summary <id>` — 聚合人可读视图 | P1 | ✅ 已完成（Feature 029，2026-08-12） |
| 3 | README 版本同步 | P1 | ✅ 已完成 |
| 4 | 知识提取复用价值阈值 | P1 | ⬅️ 下一个 P1 待开发 |
| 5 | **架构信号注入工作流阶段（P2-12，"随开发自动治理"闭环）** | P2 | ⬅️ 高价值待开发（用户确认） |
| 6 | `--json` 全覆盖 | P2 | ❌ 待开发 |
| 7 | `context build --paths` 语义修正 | P2 | ❌ 待开发 |
| 8 | WP-1 / P2-6 Skill reference 加载策略 | P2 | ❌ 待开发 |
| 9 | WP-2 verify 结构化审查 skill | P2 | ❌ 待开发 |
| 10 | CI/CD 集成模板 | P2 | ❌ 待开发 |
| 11 | 子 Agent 强化 SA-2/3/5/6 | P2 | ❌ 待评估 |
| 12 | 其余 P2（usage export / 多 binding / 预算值 / Cursor / O2 晋升 / **architecture scan 支持 Python P2-11**） | P2 | ❌ 待开发 |
| 12 | 统一关系模型（问题四） | P3 | ❌ 待决策 |
| 13 | 联邦星型 / Phase 4 / Phase 2 回放验证 | P3 | ❌ 待决策 |
| 14 | 本地使用优化（use-local.ps1 + README 补充） | 低 | ❌ 待开发 |
| 15 | **诉求一：自有 agent/skills 技能库（方案 A/D）** | P2 | ❌ 待决策（D12） |
| 16 | **诉求二：IDE agent 直接调用工作流（方案 B，slash command + 结构化返回）** | P2 | ❌ 待决策（D13） |
| 17 | **诉求二·初始化：四 agent 选择器 + 差异化安装（方案 F）** | P2 | ❌ 待决策（D16） |
| 18 | **诉求二·Codex：工作流技能封装（方案 G）** | P2 | ❌ 待决策（D17） |
| 19 | **诉求三：CLI 交互面板层（方案 H，空格选择/Enter 确认）** | P2 | ❌ 待决策（D18） |

> **原则**：先做 P1-1/P1-2 观察 spec 治理体验，再决定是否需要架构级拆分。P2 按"使用频率 × 痛点程度"排，不按编号顺序。
>
> **新诉求排期倾向（§10.5/10.6/10.7）**：先 A + D（自有技能库，低成本），再 **H（CLI 交互面板，是 F 的操作前提）+ F + G（初始化四 agent 选择 + Codex 技能封装，中成本）**，B（slash command 结构化返回）随 F/G 扩展，C 视 B/F 反馈再评估。A/D 是 F/G/B/C 的内容基础，H 是 F/G 的交互底座。

---

## 6. 发布说明校对（大版本更新时必做）

- **`packages/sovei-core/README.md` 是发布说明文件**，每次大版本更新需校对：
  - 「版本与发布」章节版本号。**已同步至 2.6.1**（2026-08-13 发布，含 13 阶段闭环 + 七大重大更新）。⚠️ 本 DEV_BACKLOG 之前写 2.5.9 已过期，现已修正。
  - 命令速查表是否覆盖全部新增命令（`workspace preflight`、`context cross-feature-index`、`context expand`、`adapters install/list`、`feature split/sub-change`、`project migrate`、`architecture scan/status/inspect/accept/dismiss/check` 等）
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
>
> **关联诉求一（§10.1，自有技能库）**：本节大部分待吸收项都沉淀进**自有 skill 命名空间 `harness/vendor/ec-web/skills/`**，作为诉求一"自有 agent/skills 技能库"的内容来源。剥离 EC 专属后通用部分对任何项目可用。

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

---

## 10. 用户新诉求分析（2026-08-11）：自有技能库 + IDE 直接调用工作流 + CLI 交互体验

> 用户原话（归纳）：① 突然意识到应该维护一套**属于我们自己的 agent 和 skills 技能库**，方便初始化项目时直接引用；② 当前 **IDE agent 不能通过指令直接调用我们的工作流能力**，使用上很难受；③（补充）**CLI 交互体验**：多选、或不指定参数时，要有**操作面板**（如空格选择、Enter 确认这种终端交互）。
>
> 本节把三个诉求拆开、对照现状、给出缺口判断与候选方案，供排期决策。

### 10.1 诉求一：维护自有 agent + skills 技能库，初始化即引用

**现状痛点**：
- harness 的 skill 来源目前**完全依赖外部 vendor**：`mattpocock`（6 个工程 skill）+ `softaworks`（lesson-learned）。这些是第三方维护，与我们的实际工程习惯有距离，且 github.com 不通时拉取受限（需 raw 通道）。
- 我们**没有自己沉淀的技能库**——`harness/vendor/` 下没有 `ec-web/`（自有命名空间），也没有"初始化即带上"的自有技能集。
- `project init`（Feature 023）目前只生成骨架 + IDE 适配器，**不含自有 skills/agents**。
- web-plugins 里有大量现成优质素材（coding-standards / skill-authoring-standards / vercel-react-best-practices 等），但它们是 **EC 前端专属、未与 harness 打通**，无法直接被 harness 项目引用。

**要解决的"初始化时引用"**：希望新项目 `project init` 后，立即能有一套自有的、开箱即用的 agent 指令 + skill，而不是每次都要手动 vendor 或依赖第三方。

**缺口判断**：
- 缺一个**自有 skill 命名空间/仓库**（如 `harness/vendor/ec-web/skills/` 或独立 `skills/` 目录），集中存放我们的编码规范、工程方法论、工作流增强 skill。
- 缺一个 **`project init --include-self-skills`** 或类似机制，把自有技能集作为 init 的可选/默认附带项。
- 缺对 web-plugins 优质素材的**吸收与剥离**（剥离 EC 专属部分，见 §8）。

### 10.2 诉求二：IDE agent 能直接（用指令/工具）调用工作流能力

**现状痛点**：
- 当前 adapter 机制（`adapters/registry.ts`）只是把 `sovei workflow <stage> <feature>` 的**文本指令**渲染进 AGENTS.md / CLAUDE.md / .cursorrules。IDE agent 看到的是"命令提示"，要自己开终端敲 `sovei`。
- CodeBuddy 的调用约定是 `SOVEI: <stage> <feature>` **字符串**，无任何 IDE 原生能力绑定（无 slash command 语义、无自定义工具/MCP 触发）。
- 结果：想让 agent 走 load/spec/implement 阶段，要么在对话里手写命令，要么让 agent 自己开 shell 执行——**割裂、不顺手、无法结构化返回**。

**要解决的"直接调用"**：希望 IDE agent 能以**原生、可触发**的方式调用工作流能力——例如斜杠命令（Claude/CodeBuddy 的 slash command）、IDE 自定义工具（tool/agent）、或 MCP 能力——并拿到**结构化返回**（当前阶段产物、下一步、风险等级等），而不是让 agent 猜命令。

**缺口判断**：
- adapter 目前只做**文本渲染**，缺**可执行工具层**：把 `sovei` 工作流暴露成 IDE 可调用的工具/命令（slash command 已部分支持，见 §10.3 已具备项）。
- 缺**结构化返回协议**：IDE 调用后能拿到 JSON 化的阶段产物/风险/下一步，供 agent 消费。
- CodeBuddy 适配器无 MCP（`mcp: false`），在 IDE 侧直接触发受限。
- **缺四 agent 初始化选择器**：`project init` 目前只支持 `--adapters <ids>` 手工传，没有"初始化时从四个 agent 里选"的引导；且四个 agent 用同一套文本渲染，没区分各自的指令/技能触发机制。
- **缺 Codex 技能封装**：Codex 桌面版**不支持指令（slash command）**，必须把 `sovei` 调用**封装成技能（skill）**，让 agent 以技能方式被触发，而不是指令方式。这是 Codex 与其他三个 agent（Claude Code/CodeBuddy/Trae）的本质差异。

### 10.3 已具备能力（避免重复造轮子）

| 已具备 | 说明 | 与两诉求关系 |
|---|---|---|
| **S0 快速通道 + slash command** | Feature 020/021/023：`sovei quick` + Claude/CodeBuddy 的 `.claude/commands`、`.codebuddy/commands` 下生成 `sovei-quick.md` | 诉求二的**雏形**：只覆盖 quick，未覆盖完整 12 阶段工作流 |
| **`adapters install`** | 把 quick 指令文本写入各 IDE contextFile | 只注入文本，未注入可执行工具 |
| **`sovei skills use/bind/sync`** | 连接外部 skill 并渲染进 agent 上下文 | 诉求一的**机制底座**：但依赖外部源，无自有命名空间 |
| **`project init --adapters`** | Feature 023：init 时装 IDE 适配器 | 诉求一的 init 引用入口雏形 |
| **skill-authoring-standards**（web-plugins） | 教写好 skill 的元技能（agentskills.io 规范 + 500 行上限 + 渐进披露） | 诉求一的**方法论底座**，可吸收 |

### 10.4 三个诉求的关联

前两诉求**不是独立的两件事**，而是指向同一方向：**把"我们的工作流 + 我们的技能"变成 IDE agent 原生可用的一套能力**。
- 诉求一提供"有什么"（自有技能库内容）。
- 诉求二提供"怎么调"（IDE 原生触发 + 结构化返回）。
- 结合后：新项目 init 即带自有技能，且 IDE agent 能直接触发工作流阶段并消费产物——形成"开箱即用 + 顺手驱动"的完整闭环。

**诉求三（CLI 交互体验）是给人类操作者的体验层**：前两诉求面向 IDE agent，诉求三面向**在终端直接用 `sovei` 命令的人**。当人不指定参数（或需要多选）时，需要交互面板（空格选择/Enter 确认）而不是"打印列表让你自己敲参数"。三者叠加后：机器用 IDE 顺畅调、技能库有内容、人敲 CLI 也顺手。

### 10.5 候选方案（供 §4 决策项引用）

| # | 候选方案 | 对应诉求 | 工作量 |
|---|---|---|---|
| **方案 A** | 建立自有 skill 命名空间 `harness/vendor/ec-web/skills/`，吸收剥离 web-plugins 素材 + 自建编码规范/工程方法论 skill；`project init` 可选附带 | 诉求一 | 中 |
| **方案 B** | 扩展 adapter：为每个工作流阶段生成 slash command（不只 quick），并输出结构化 JSON 返回 | 诉求二 | 中 |
| **方案 C** | 开发 `sovei` 的 **IDE 工具/MCP 封装层**：把 `workflow`/`quick`/`context` 暴露为 IDE 可调用工具，支持 CodeBuddy/Claude 等 | 诉求二 | 大 |
| **方案 D** | 吸收 `skill-authoring-standards` 为自有元技能，形成"我们怎么写 skill"的内部标准，反哺所有自建 skill | 诉求一 | 小 |
| **方案 E** | `project init --include-skills` 一键拉取自有技能集 | 诉求一 | 小 |
| **方案 F** | 初始化时四 agent 选择器 + 按 agent 能力差异化安装（Claude Code/CodeBuddy→slash command，Trae→文本，**Codex→技能封装**） | 诉求二 | 中 |
| **方案 G** | 为 Codex 生成 `sovei` 工作流**技能包**（每个阶段一个 skill / 一个聚合 skill），弥补桌面版不支持指令的短板 | 诉求二 | 中 |
| **方案 H** | **自研 CLI 交互面板层**（空格选择/Enter 确认/↑↓导航），应用到 `adapters install`、`project init --agent` 等多选/不指定参数场景 | 诉求三 | 中 |

> 建议排期倾向：**先 A + D（低成本，解决"自有技能库"），再 F + G（中成本，解决"初始化四 agent 选择 + Codex 技能封装"，这正是诉求二的核心落地），C 视 B/F 的使用反馈再评估**。**方案 H（CLI 交互）是 F/G 的操作前提——F 的四 agent 选择器正好需要 H 的交互面板。** A/D 是 F/G 的内容基础。

### 10.6 诉求二细化：初始化四 agent 选择 + Codex 技能封装（2026-08-11 补充）

> 用户补充：诉求二在初始化时提供**四个 agent 可选**——Claude Code / Trae / CodeBuddy / Codex。其中 **Codex 桌面版不支持指令**，所以 **Codex 的指令必须封装成技能（skill）** 来调用。

**四个 agent 的调用机制差异**（`adapters/registry.ts` + `installer.ts` 现状）：

| Agent | 调用机制 | 现状（初始化安装） | 期望（诉求二） |
|---|---|---|---|
| **Claude Code** | `.claude/commands/*.md` **slash command** | ✅ 已支持：写 `sovei-quick.md` + 追加 CLAUDE.md | 扩展为每阶段 slash command + 结构化返回 |
| **CodeBuddy** | `.codebuddy/commands/*.md` | ✅ 已支持：写 `sovei-quick.md` + 追加 AGENTS.md | 同上；并解决 `SOVEI:` 字符串约定无原生触发的痛点 |
| **Trae** | `.cursorrules` 追加**文本** | ⚠️ 仅文本追加，无指令文件 | 保持文本 + 提供可直接复制的指令片段 |
| **Codex** | **桌面版不支持 slash command/指令** | ⚠️ 仅 AGENTS.md 文本追加，**无技能封装** | **封装成技能（skill）**，agent 以技能方式触发 |

**Codex 为什么必须封装成技能**：
- 桌面版 Codex 没有 Claude/CodeBuddy 那样的 `/指令` 触发机制，agent 只能通过**技能（skill 文件 + 元数据 description）**被动感知"可以用什么能力"。
- 若只往 AGENTS.md 追加文本，Codex agent 可能在长上下文里忽略它，无法像 slash command 那样被显式触发。
- 封装为 skill 后：Codex agent 能通过 skill 的 `description` 在适当时机主动唤起 `sovei` 工作流，而非依赖用户手工敲指令。

**方案 F 设计要点（四 agent 初始化选择器）**：
- `project init` 交互式提供四选（或 `--agent <id>` 指定）：Claude Code / CodeBuddy / Trae / Codex。
- 按 agent 能力**差异化安装**，而非一刀切文本：
  - Claude Code / CodeBuddy → 生成每阶段 slash command（load/spec/implement/verify/...）+ quick。
  - Trae → `.cursorrules` 追加完整指令片段。
  - Codex → 生成 `sovei` **技能包**（写技能文件），并追加 AGENTS.md 简述 + 技能清单。
- 记录所选 agent 到 `project.config.json`（如 `ideAgent: codex`），供后续 `context build`/技能渲染感知宿主能力。

**方案 G 设计要点（Codex 技能包）**：
- 在 `harness/skills/` 或 `harness/vendor/ec-web/skills/` 下生成一组 sovei 技能：
  - 推荐：**一个聚合技能 `sovei-workflow`**（含全部阶段子命令说明）+ 可选每阶段独立技能（`sovei-load` / `sovei-spec` / `sovei-implement` ...）。
  - 每个技能遵循 agentskills.io 规范（frontmatter `name`/`description` + 渐进披露），`description` 写明触发时机，让 Codex 在合适场景主动唤起。
  - 技能内容 = 调用 `sovei workflow <stage> <feature>` 的操作步骤 + 产物/风险/下一步的结构化约定。
- 与方案 A（自有技能库）打通：Codex 技能包挂在自有 skill 命名空间下。

> **排期结论**：方案 F（四 agent 选择器）+ G（Codex 技能包）是诉求二在初始化环节的具体落地，**建议在方案 B（slash command 结构化返回）之前或并行**先做，因为初始化选择是用户最先接触的入口。

### 10.7 诉求三细化：CLI 交互面板（2026-08-11 补充）

> 用户补充：CLI 交互体验——**多选**、或不指定参数时，要有**操作面板**（空格选择、Enter 确认这种终端交互）。

**现状痛点**（以 `adapters install` 为例，`src/cli/commands/adapters.ts`）：
- 无参数时目前只 `console.log` 打印可选项列表 + 提示用户**手工敲 `--adapters trae,codebuddy`**，**没有任何交互面板**。
- 人想多选必须自己记下编号再拼参数，体验割裂、易错。
- 同类问题散落在多个命令（`adapters install`、`project init --adapters`、未来的 `project init --agent`、`skills bind` 等）——都是"打印列表让你自己敲"模式。

**关键约束：零运行时依赖**：
- `sovei` 是**零运行时依赖**（README + package.json `dependencies` 为空，发布物是单文件 `sovei.cjs`）。
- 因此**不能引入 inquirer / prompts / enquirer 等第三方交互库**——会打破零依赖卖点。
- 交互面板需**自研**：基于 Node 原生 `readline` + 终端转义序列（↑↓ 移动、空格 勾选、Enter 确认），内联到单文件即可，零新增依赖。

**方案 H 设计要点（自研 CLI 交互面板层）**：
- 建一个轻量 `src/cli/interactive/` 模块，提供两类原语：
  - **单选 `select(prompt, items)`**：↑↓ 导航，Enter 确认 → 返回选中项。用于 `project init --agent` 四选、无参数时选单个。
  - **多选 `multiselect(prompt, items)`**：↑↓ 导航，**空格勾选/取消**，Enter 确认 → 返回选中集合。用于 `adapters install`、`project init --adapters`。
- 终端能力检测：非 TTY（管道/CI/被脚本调用）时**自动降级为文本提示**（打印编号 + 让用户输入，或直接报"请用 --flag 指定"），保证 `--json`/脚本消费不受影响。
- 与 commander 参数解析结合：**有参数直接走参数；无参数才弹面板**，且面板只是便捷层，不阻塞脚本化。
- 应用范围：`adapters install`、`project init --adapters/--agent`、`skills bind`、`feature archive` 等所有"多选/不指定参数"命令。

> **排期结论**：方案 H 是方案 F 的操作前提——F 的四 agent 选择器（单选）和 `adapters install` 多选都需要 H 的交互面板。建议 **H 先于或并行于 F/G** 做。H 也是所有 CLI 多选命令的通用基础，收益面广。

---

## 11. 七大重大更新需求（2026-08-12）

> 用户原话归纳：先解决适配 code agent 的问题（即"指令就是 12 个节点，使用 / 触发"），然后做 7 项重大更新。经确认，**第 7 项（引擎是否支持 Feature 拆分）优先**——引擎当前不支持，已立项 Feature 030 走完整 Sovei 12 阶段工作流开发。其余 6 项在第 7 项完成后用拆分能力承载。

### 11.1 需求总览

| # | 需求 | 简述 | 状态 | 承载方式 |
|---|---|---|---|---|
| **N1** | 12 节点 skills 分开存放 | 类似 web-plugin 的 agent 和 skills 分开存放；三方 skills 复制到我们的文件夹；后续新增/更新三方 skills 也走此模式 | ✅ **已完成**（2026-08-13） | init 命令新增 `sovei-flow/agents/` 目录，与 `skills/` 分开存放 |
| **N2** | 添加 skills 基座 | 可注入 vue2/vue3/react/cli/py 等技能，以及量化系统等知识技能 | ✅ **已完成**（2026-08-13） | init 命令新增 `sovei-flow/skills/base/` 目录；预置 6 个技能模板（vue2/vue3/react/cli/python/quant） |
| **N3** | codex 单独适配 | codex 适配只暴露节点按钮；产物 harness 补充 agent 文件夹和 skills 文件夹 | ✅ **已完成**（2026-08-13） | codex 适配器新增 12 节点按钮 + skillPackage（聚合技能文件 sovei-workflow.md）；installer 支持技能包生成 |
| **N4** | init 产物改名 harness → sovei-flow | 需迁移脚本处理已初始化项目；改名影响面大（代码硬编码多处） | ✅ **已完成**（2026-08-13） | 24 源文件 + 19 测试文件路径替换；新增 `project migrate` 命令；当前仓库已迁移 |
| **N5** | 开源 + npm 包路径调整 | init 产物变更大，README 调整；正式开源；npm 包路径调整（用户会开放仓库） | ✅ **已完成**（2026-08-13） | LICENSE 改为 MIT；README 全面重写（sovei-flow 目录/Feature 拆分/Skills 基座/版本提示）；CHANGELOG 补 2.6.0 条目 |
| **N6** | 版本更新提示机制 | 两个提示：①提示更新；②建议更新有新能力支持 | ✅ **已完成**（2026-08-13） | 新增 version-check.ts（零依赖 npm registry 检查 + 24h 缓存 + 能力注册表）；集成 preAction/postAction 钩子；输出 stderr 不污染 JSON |
| **N7** | Feature 拆分能力 | 引擎是否支持一个 Feature 拆出几个大 change 并行开发 | ✅ **已完成**（Feature 030，2026-08-13） | 走完整 Sovei 12 阶段工作流 |

### 11.2 P0 追加要求（2026-08-12 用户补充）

> 用户追加：任务全部完成后还需要**验证引擎是否能自主拆分 Feature**。不仅要有 CLI 命令，还要有 agent 提示/指令方式触发。同时需要考虑**工作流节点如何调用**——是 `/load` 自然描述完需求执行，还是其他方式。**此项非常关键，放在开发总览的 P0。**

**P0 待解决的两个关键问题**：

| # | 问题 | 说明 |
|---|---|---|
| **P0-A** | **引擎自主拆分能力** | 当前 Feature 030 的 `feature split` 是 CLI 显式命令。用户要求引擎还能以 **agent 提示/指令**方式自主触发拆分——即在 scope 阶段产物完成后，AI 能主动建议/执行拆分，而非只靠人敲命令。需补充：①scope 阶段的拆分提议提示契约（已有雏形）；②agent 可调用的拆分指令（slash command 或 skill 触发）；③拆分结果的结构化返回供 agent 消费。 |
| **P0-B** | **工作流节点调用方式** | 12 个节点的调用入口需明确：是 IDE agent 用 `/load`、`/spec` 等 slash command 触发后**自然描述需求执行**，还是走其他路径（如 MCP 工具、skill 唤起）。这与 N1（skills 分开存放）、N3（codex 适配）强相关——不同 IDE 的触发机制不同（Claude/CodeBuddy 用 slash command，Codex 用 skill，Trae 用文本）。需在 Feature 030 完成后，结合 N1/N3 统一设计节点调用层。 |

> **P0 结论**：
> - ✅ **P0-A 已落地**（2026-08-13）：scope 阶段提示契约新增"拆分评估"段（[stages/index.ts:303-312](file:///d:/project/harness/packages/sovei-core/src/stages/index.ts#L303-L312)），AI 在 scope 完成后可主动建议运行 `feature split --json` 获取提议契约（[feature.ts:594-616](file:///d:/project/harness/packages/sovei-core/src/cli/commands/feature.ts#L594-L616)）。CLI + agent 提示双通道已就绪。
> - ✅ **P0-B 已落地**（2026-08-13）：按 IDE 触发机制分三层设计节点调用层：
>   - **Claude Code / CodeBuddy**（slash command）：`adapters install` 生成 12 个 `/sovei-<stage>` slash command 文件（[registry.ts slashCommands](file:///d:/project/harness/packages/sovei-core/src/adapters/registry.ts#L67-L71)），agent 用 `/sovei-load <feature>`、`/sovei-spec <feature>` 等触发，slash command 内封装"准备阶段→读提示契约→填产物→--complete"完整步骤。
>   - **Codex 桌面版**（skill 包）：已通过 `skillPackage` 生成 `sovei-workflow.md` 技能文件（N3），agent 通过技能 description 主动唤起工作流。
>   - **Trae / Gemini / Aider / Windsurf**（文本指令）：`quickChannelDirective` 追加 12 节点表格，agent 按表格运行 `sovei workflow <stage> <feature>` CLI 命令。
>   - **调用方式回答用户问题**：不是 `/load` 自然描述完需求执行，而是**每个阶段一个 slash command**，agent 输入 `/sovei-load 001-my-feature` 触发该阶段的完整 SOP（准备→提示契约→产物→完成）。需求描述在 `sovei workflow bootstrap` 时或 load 阶段记录到 Feature 元数据，后续阶段只推进不重新描述。

### 11.3 开发顺序

```
Phase 1（已完成 2026-08-13）：N7 — Feature 030 拆分能力（完整 12 阶段工作流）
  └─ ✅ 含 P0-A：引擎自主拆分的 agent 提示（scope 阶段"拆分评估"段）
Phase 2（已完成 2026-08-13）：用拆分能力承载 N1~N6（七大重大更新全部落地，发布 v2.6.1）
  ├─ N4（改名 sovei-flow + 迁移脚本）——影响面最大，先做
  ├─ N1（skills 分开存放）+ N2（skills 基座）——内容层
  ├─ N3（codex 适配）+ N6（版本提示）——接口层
  └─ N5（开源 + npm 路径）——收尾
Phase 3（待启动）：P2-12 — 架构信号注入工作流阶段（"随开发自动治理"闭环）
  └─ 当前架构治理是独立手动命令，未接入 12 阶段运行时（详见 §2 P2-12）
```

> **Phase 3 说明**：用户确认要做"跑工作流时架构治理随开发自动发生"。架构治理核心模块（analyzer/policy/repository）已随 v2.6.1 交付，但 engine 未注入架构数据到阶段上下文（scope/converge/learn 的 prompt 提到架构，实际运行时没喂数据）。P2-12 把这块补成真正的闭环，不改变原有 12 阶段工作流结构。

---

## 12. Feature 030 开发日志（2026-08-12 → 2026-08-13）

> Feature：`030-feature-sub-changes`（Feature 拆分为多个子变更）
> 走完整 Sovei 12 阶段工作流。本节记录各阶段进度与关键决策。
> **2026-08-13 闭合**：12 阶段全部完成，状态 `completed`，205/205 测试通过。

### 12.1 阶段进度

| 阶段 | 状态 | 产物 | 关键决策 |
|---|---|---|---|
| load | ✅ | load-summary.md | 识别 8 个影响模块（types/state-machine/event-store/workflow-engine/artifacts/cli/context/builder） |
| grill | ✅ | decision-log.md | 确定子变更粒度模型、状态独立性、并行性、与 change-control 的关系 |
| wayfind | ✅ | wayfinder.md + 决策工单 | 多角度分析后选定"共享前段（load→scope）+ 分叉后段（plan→verify）+ 聚合（learn→sync）"方案 |
| spec | ✅ | spec.md + reconciliation.md | 6 项验收标准（AC-1~AC-6）；嵌入式子变更状态；4 个新事件类型 |
| scope | ✅ | scope.md + coverage-matrix.md | 8 个影响模块清单 + 架构压力评估 |
| plan | ✅ | plan.md | 8 层改动顺序；状态/数据流；契约定义；迁移策略；验证方式 |
| tasks | ✅ | tasks.md | 11 个 TASK（TASK-001~011），按依赖排序 |
| implement | ✅ | change-manifest.md | 全部 11 个 TASK 完成（数据层/引擎层/接口层/验证层）+ P0-A 落地 |
| converge | ✅ | convergence-report.md | 验收标准对照，功能完整性确认 |
| verify | ✅ | evidence.md | 205/205 测试通过；AC 对照全绿；P0-A 提示契约验证 |
| learn | ✅ | learning-report.md | 3 个 candidate 知识条目入库（嵌入式子状态 / 聚合门禁 / AI 自主评估提示） |
| sync | ✅ | sync-report.md | 受保护路径审查；命令结果记录；工作流标记 completed |

### 12.2 implement 阶段任务进度

| TASK | 内容 | 层 | 状态 |
|---|---|---|---|
| TASK-001 | types.ts — SubChangeState 接口 + 4 事件类型 | 数据层 | ✅ 完成 |
| TASK-002 | state-machine.ts — reducer 4 个子变更 case + canExecuteStage 重载 + aggregationGate | 数据层 | ✅ 完成 |
| TASK-003 | event-store.ts — subChanges YAML 序列化/解析 | 数据层 | ✅ 完成 |
| TASK-004 | workflow-engine.ts — 子变更路由 + 聚合门禁 + splitFeature/listSubChanges | 引擎层 | ✅ 完成 |
| TASK-005 | artifacts/repository.ts — getSubChangePath helper | 引擎层 | ✅ 完成 |
| TASK-006 | feature.ts — feature split + sub-change list | 接口层 | ✅ 完成 |
| TASK-007 | workflow.ts — --sub-change 选项 | 接口层 | ✅ 完成 |
| TASK-008 | context.ts — --sub-change 选项 | 接口层 | ✅ 完成 |
| TASK-009 | builder.ts — 子变更聚焦上下文 | 接口层 | ✅ 完成 |
| TASK-010 | sub-change.test.mjs — 单元测试 | 验证层 | ✅ 完成（13 个测试） |
| TASK-011 | 回归测试 + archive 兼容 | 验证层 | ✅ 完成（205/205 零回归） |
| P0-A | stages/index.ts — scope 阶段提示契约"拆分评估"段 | 接口层 | ✅ 完成 |

### 12.3 关键设计决策摘要

1. **子变更粒度**：共享前段（load→scope）+ 分叉后段（plan→verify）+ 聚合（learn→sync）。一层嵌套，子变更不能再拆子变更。
2. **状态存储**：嵌入式——`WorkflowState.subChanges: SubChangeState[]`，与顶层状态同文件。不另起状态文件。
3. **事件类型**：4 个新事件（SUBCHANGE_CREATED / SUBCHANGE_STAGE_PREPARE / SUBCHANGE_STAGE_COMPLETE / SUBCHANGE_MERGED），每个携带 `subChangeId` 字段路由。
4. **向后兼容**：`subChanges` 默认 `[]`；旧事件无 `subChangeId` 走顶层分支；无 `sub-change-map.md` 的 Feature 走单管线。
5. **聚合门禁**：父 Feature 进入 learn 前 `aggregationGate()` 检查全部 merged。
6. **AI 拆分位置**：scope 阶段产物完成后，`feature split --json` 命令输出提议契约供 AI 消费。P0-A 已落地——scope 阶段提示契约末尾新增"拆分评估"段，AI 在完成 scope 产物后自然看到拆分信号并主动建议。

### 12.4 知识库增量（learn 阶段对账入库）

| 标题 | 类型 | 类别 | 证据 |
|---|---|---|---|
| 嵌入式子状态模式：子实体状态嵌入父实体状态同文件存储 | architecture | candidate | Feature 030：WorkflowState.subChanges 嵌入式存储，4 个子变更事件类型携带 subChangeId 路由，192 个原测试零破坏 |
| 聚合门禁独立于状态转移：门禁在引擎层拦截，reducer 保持纯函数 | rule | candidate | Feature 030：aggregationGate() 独立导出纯函数，prepareStage('learn') 调用检查全部 merged |
| AI 自主评估嵌入阶段提示契约，而非新增工作流阶段 | preference | candidate | Feature 030：scope 阶段 prompt 新增"拆分评估"段，feature split --json 输出提议契约 |

### 12.5 后续衔接（P0-B + Phase 2）

- **P0-B（工作流节点调用方式）**：在 N1/N3 开发时统一设计——不同 IDE 触发机制不同（Claude/CodeBuddy 用 slash command，Codex 用 skill，Trae 用文本）。N7 已提供 `feature split --json` 结构化输出和 scope 提示契约，P0-B 在此基础上补齐 IDE 侧触发入口。
- **Phase 2 启动顺序**：N4（改名）→ N1+N2（skills）→ N3+N6（codex+版本提示）→ N5（开源）。每项作为一个 Feature 走完整 Sovei 12 阶段。
