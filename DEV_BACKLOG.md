# Sovei 待办总清单（缺陷 + 待开发 + 使用方式）

> 生成日期：2026-08-11（本次对齐至 Feature 025，含 022/023/024/025 更新）
> 依据：全面扫描 `specs/` 下全部 Feature 的 learning-report / decision-log / workflow-state.yaml、`design-docs/` 设计文档、源码与 npm 发布状态。
> 目的：给出一张可判断方向的**开发总清单**，供人工排期。本文件不替代 Sovei 工作流，实际开发仍走 `load → … → sync` 12 阶段。

---

## 0. 当前状态快照

| 项 | 值 |
|---|---|
| 最新发布版本 | **2.5.9**（npm `latest` 渠道，已发布，2026-08-10） |
| 测试基线 | 179 / 179 通过（构建后） |
| Node 兼容 | 发布产物 CommonJS，`engines >= 14.18.0`（Node 14 可用） |
| 知识库 | 1 stable + 若干 candidate/pending |
| Skills | 8 阶段绑定，7 个第三方 skill 锁定 |
| 最新 Feature | 025-load-stage-enhancement（completed）；024-stale-aware-l1（completed）；023-quick-agent-adapters（completed）；022-context-budget-subagent（completed）；021-quick-json-slim（completed）；020-quick-context-governance（completed） |
| 快速通道（S0） | ✅ 已实现（Feature 020 + 021 + 023）：`sovei quick <target>` 六步闭环 + usage 事件记录 + Git diff 验证 + `--json` 输出精简（117KB→37KB）+ 自动 .gitignore 排除 + IDE 适配器 slash command |
| Merge Preflight | ✅ 已实现（未发布）：`sovei workspace preflight <source> <target>`，三类语义冲突检测 + 四种裁决动作 |
| 过期感知 L1 | ✅ 已实现（Feature 024）：sync 记录仓库级基线 + `context build` / `quick` 对比 HEAD 提示「治理资产可能已过期」（非阻断），`--json` 附加 `stale` 字段 |
| load 阶段增强 | ✅ 已实现（Feature 025）：load 产出 `load-summary.md` + 知识加载补齐 code-map/rule + postExecute 校验 + grill 依赖 load-summary + prompt 增加探索方法论 |
| 战略级缺口 | 问题四（统一关系模型 / Graph Coding）未实现；问题三（Drift Detection）第一期不做——没有门禁 drift 一定发生（做检测也没用），有门禁不需要检测（个人用 L1 过期感知已覆盖） |

---

## 1. 全局总览：已完成 vs 未完成

### ✅ 已完成项

| # | 项 | 完成时间 | 来源 |
|---|---|---|---|
| ✅ | **工作流自身 P0-1**：Feature 016-skill-verify 闭合 | 2026-08-07 | §2.1 |
| ✅ | **工作流自身 P0-2**：013 O1「声明式适配器注册」晋级 stable | 2026-08-07 | §2.1 |
| ✅ | **问题一**：skills 空壳 → Feature 014 解决 | 2026-08-06 | §2.5 |
| ✅ | **场景二 P0-1**：红线 branch 作用域隔离（已发 2.5.7） | 2026-08-09 | §4 |
| ✅ | **场景二 P0-2**：merge preflight 语义冲突预检 | 2026-08-10 | §4 / §2.5 |
| ✅ | **P1-1**：两套 contract 数据源 → Feature 019 统一 | 2026-08-09 | §2.2 |
| ✅ | **问题二**：S0 快速通道 → Feature 020 六步闭环 + Feature 021 JSON 精简 | 2026-08-09 | §2.5 / §2.7 |
| ✅ | **quick --json 输出膨胀**：Feature 021 修复（117KB→37KB） | 2026-08-10 | §2.7 |
| ✅ | **Graph Coding 第 4 层**：语义合并预检 → preflight 模块 | 2026-08-10 | §2.5 |
| ✅ | **P1-3 上下文包膨胀**：shadow policy 激活 + 字符预算截断 + cross-feature Top-N 过滤 | 2026-08-10 | Feature 022 |
| ✅ | **SA-1 子 Agent 契约**：cross-feature-index + expand CLI 命令 | 2026-08-10 | Feature 022 |
| ✅ | **IDE 适配器快速通道指令**：用户交互式选择安装 4 个 IDE（Trae/CodeBuddy/CC/Codex）的快速通道指令文件 | 2026-08-10 | Feature 023 |
| ✅ | **quick --exclude 自动 .gitignore**：sovei quick 无 --exclude 时自动从 .gitignore 读取排除路径 | 2026-08-10 | Feature 023 后修 |
| ✅ | **_subagentContract 契约提示**：cross-feature-index 输出包装 _subagentContract 对象，告知宿主 AI 分派子 Agent | 2026-08-10 | Feature 022 后修 |
| ✅ | **过期感知 L1（P0）**：sync 记录仓库级基线 + context build / quick 对比 HEAD 提示 | 2026-08-10 | Feature 024-stale-aware-l1 |
| ✅ | **load 阶段增强（P1）**：补齐知识加载（code-map/rule）+ postExecute 校验 + load-summary.md 产出 + grill 依赖 + 探索方法论 prompt | 2026-08-10 | Feature 025-load-stage-enhancement |

### ❌ 未完成项（按优先级排列）

| 优先级 | # | 项 | 简述 | 详见 |
|---|---|---|---|---|
| **P1** | ~~P1-3~~ | ~~**上下文包膨胀**~~ | ✅ **已实现**（Feature 022，2026-08-10）：shadow policy actual 激活（scoped 变体）+ 字符预算截断（applyBudget）+ cross-feature Top-N 相关性过滤 + 子 Agent 契约（cross-feature-index / expand CLI 命令）+ _subagentContract 契约提示 + 修复 FilesystemStorage.list() 不返回目录的预存 bug。164/164 测试通过 | §2.3 |
| **P1** | ~~—~~ | ~~**load 阶段探索能力增强**~~ | ✅ **已实现**（Feature 025，2026-08-10）：load 产出 load-summary.md + 知识加载补齐 code-map/rule + postExecute 校验 + grill requiredArtifacts 依赖 + prompt 增加探索方法论指导。179/179 测试通过 | §3.5 |
| **P0** | — | ~~**过期感知（L1）**~~ | ✅ **已实现**（Feature 024-stale-aware-l1，2026-08-10）：sync 完成时记录仓库级基线 `sync-baseline.json`（branch+head+recordedAt）；`context build` / `quick` 对比当前 HEAD 与基线，同分支且 HEAD 前进时提示「治理资产可能已过期」（非阻断 warning），`--json` 附加 `stale` 字段；跨分支/无基线/HEAD 失败均不提示。173/173 测试通过 | §3.6 |
| **P2** | — | **CI/CD 集成模板** | GitHub Actions / GitLab CI 流水线模板（企业推广时用） | §3.6 |
| **P2** | — | **`--json` 全覆盖** | workflow/knowledge/workspace 等命令无法被脚本/CI 消费 | §3.6 |
| **P1** | ~~SA-1~~ | ~~**子 Agent：cross-feature 并行过滤**~~ | ✅ **已实现**（Feature 022，2026-08-10）：`context cross-feature-index` 输出 JSON 索引 + `context expand` 按需展开，供宿主 AI 分派子 Agent 并行读取 | §2.9 |
| **P2** | P1-2 | **`mcp` 能力字段无消费方** | 预留边界，需决定做不做 MCP server | §2.2 |
| **P2** | P2-1 | **013 O2 sentinel upsert 晋升** | 已覆盖 3 Feature，第 4 个复用则晋升 stable | §2.4 |
| **P2** | P2-2 | **外部 Skills 多 binding** | 一个阶段注入多个 skill | §2.6 |
| **P2** | P2-3 | **Skill 附加文件解析** | vendor skill 的 CONTEXT-FORMAT.md 等被忽略 | §2.6 |
| **P2** | P2-4 | **usage export --redacted** | usage.jsonl 脱敏共享 | §2.7 |
| **P2** | P2-5 | **`context build --paths` 语义修正** | --paths 应过滤 required 红线/stable rules | §2.7 |
| **P2** | P2-6 | **阶段上下文预算值** | 等评测数据再定阈值 | §2.7 |
| **P2** | P2-7 | **quick 通道「过度防御 + 冷启动」缺陷** | `needsEscalation` 任何不确定都 escalated，首次无 commit 仓库体验差 | §3.7.1 |
| ~~P2~~ | ~~—~~ | ~~**Feature 流程遗留清理**~~ | ✅ **已完成**（2026-08-11）：4 个卡在 in_progress 的 Feature（002/009/012/015）全部归档 | §3.8 |
| **P2** | SA-2 | **子 Agent：context build 组装** | 分组并行加载 required 项 | §2.9 |
| **P2** | SA-3 | **子 Agent：converge/verify 代码审查** | 分维度并行审查 | §2.9 |
| **P2** | SA-5 | **子 Agent：preflight 并行检测** | 三类冲突检测并行 | §2.9 |
| **P2** | SA-6 | **子 Agent：learn 知识提取** | 并行提取/搜索/评估，写入串行 | §2.9 |
| **P2** | — | **统一关系模型**（问题四，Graph Coding 核心） | 定义关系 schema + 适配器，还差 4 层 | §3.6 |
| **P2** | — | **联邦星型（multi-hub）** | 多主干/多团队对账 | §4 |
| **P2** | — | **Cursor Adapter** | Phase 3 剩余项 | §6 |
| **P2** | — | **Phase 4：vendor lock + 上游 diff + 安装器评估** | 外部 Skills 生命周期 | §6 |
| **P2** | — | **Phase 2 回放验证** | 真实 Feature 回放完整工作流 | §6 |
| 低 | — | **一键本地安装脚本** `use-local.ps1` | build + npm link 一条命令 | §1.3 |
| 低 | — | **README 补充本地使用章节** | npm link 说明 | §1.3 |

---

## 2. 本地使用方式（已支持，勿混淆"必须发版"）

**结论：本地同一台电脑使用，根本不需要发布到 npm。** 发布 npm 只对**跨电脑**（把工具带到别的机器）有必要。

### 2.1 本地直接用（推荐，改源码即刻生效）

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

### 2.2 什么时候必须发布 npm

只有**要在这台电脑之外的机器**（公司电脑、其他环境）用新版时，才走 `pnpm run release:sovei` 发布。发布流程、OTP、`latest`/`next` 标签见根目录 `release-sovei.ps1` 与 README「发布 Sovei CLI」。

### 2.3 建议（可后续做，非必须）

| 需求 | 说明 | 状态 |
|---|---|---|
| 一键本地安装脚本 | 建一个 `use-local.ps1`：build + `npm link`，一条命令让本机全局 `sovei` 指向最新源码 | 待开发（低优先级） |
| README 补充本地使用章节 | 当前 README 已含本地 `node dist/cli/index.js` 示例，可补 `npm link` 与"无需发版即可本地用"的说明 | 待开发（低优先级） |

---

## 3. 工作流自身待解决问题（独立于两场景）

### 3.1 ✅ P0 — 已全部处理

> 两项 P0 已于 **2026-08-07** 全部处理完成。

| # | 项 | 处理结果 |
|---|---|---|
| P0-1 | **Feature 016-skill-verify 闭合** | ✅ 补 `sync-report.md` → `sovei workflow sync 016-skill-verify --complete`；状态 `completed`，12 阶段全完成（verify 107/107） |
| P0-2 | **013 O1「声明式适配器注册」晋级 stable** | ✅ 人工审查证据充分后放行：`knowledge add` 录入 `rule-sync-851e0638`（candidate）→ `promote` pending → stable；证据 012/013 两轮验证 |

> 附带修复：环境版本错位（全局旧版 2.4.0 无 `sync` 阶段导致 replay 报错；仓库本地依赖为陈旧快照 2.4.1）。已通过更新全局到 2.5.6 + `pnpm install` 刷新本地 `file:packages/sovei-core` 快照对齐。
>
> 使用约定：harness 自我迭代用仓库本地产物（复刻开发者 `pnpm install` 后 `pnpm exec sovei`），业务项目用全局发布版。

### 3.2 P1 — 架构债务

| # | 项 | 现状 | 建议动作 |
|---|---|---|---|
| ~~P1-1~~ | ~~两套 contract 数据源并存~~ | ✅ **已实现**（Feature 019-contract-single-source，completed）：契约单一源为 `stages/index.ts` 的 `stageRegistry`（`StageDefinition.contract`）；`WorkflowDefinition` 仅含编排字段（version/stageOrder/maxStagesPerInvocation/allowChaining），不再重复产物契约（见 `engine/types.ts:66-94`） | — |
| P1-2 | **`mcp` 能力字段无消费方** | `adapters/registry.ts` 的 `mcp: true`（codex/claude/gemini/windsurf）无 MCP server 消费，仅预留边界 | 明确做不做 MCP server；不做则长期挂起 |
| ~~P1-3~~ | ~~**上下文包膨胀（Context Pack Bloat）**~~ | ✅ **已实现**（Feature 022-context-budget-subagent，completed）：shadow policy scoped 变体激活 + 字符预算截断（applyBudget）+ cross-feature Top-N 相关性过滤 + 子 Agent 契约（cross-feature-index / expand CLI）+ _subagentContract 提示 + FilesystemStorage.list() bug 修复 | — |

### 3.3 ✅ P1 — 上下文包膨胀（已完成）

> ✅ **已于 2026-08-10 由 Feature 022-context-budget-subagent 完成**，详见上方已完成项表格。以下为问题分析存档。

> 快速通道（S0/Quick）开发过程中发现：随着 Feature 积累，`sovei context build` 产出的上下文包只会越来越大，最终撑爆 Agent 上下文窗口。

**问题根因**（核对源码 `context/builder.ts` + `cli/commands/context.ts`）：

| 维度 | 现状 | 增长趋势 |
|---|---|---|
| **required 项无上限** | 所有 active 红线 + 所有 stable 知识规则 + 所有 required 项目规范 + 当前 Feature 全部 `.md` 产物（每个截断 4000 字符）全部塞入 required，无整体字符/token 预算 | 红线/知识/规则只增不减，required 单调增长 |
| **cross-feature 全量加载** | `--cross-feature` 遍历 `specs/` 下**所有**其他 Feature 目录，每个读 `decision-log.md` 截断 4000 字符塞入 suggested | Feature 从 10→50→100，cross-feature 块从 ~36KB→180KB→360KB |
| **shadow policy 未激活** | `context/policy.ts` 已实现 `scoped`（按 path/symbol 匹配筛选）和 `index+on-demand`（只给摘要索引，按需展开）两个削减变体，但 `actual: 'full'` 硬编码——基础设施就位但从未用于实际削减 | 削减能力已有，只差激活开关 |
| **suggested 仅条数限制** | candidate/pending 知识最多 20 条（`slice(0, 20)`），但每条无字符上限；advisory 项目规范无限制 | 知识库膨胀后 suggested 也在涨 |
| **Feature 产物无聚合上限** | 每个 Feature 可有多个 `.md` 产物（reconciliation / spec / tasks 等），每个独立截断 4000 字符，无聚合 cap | 单 Feature 产物块可达 20-30KB |

**影响**：
- Agent 上下文窗口被上下文包占满，留给实际代码推理的空间不足
- 快速通道（S0）本应轻量，但上下文包和完整工作流一样重，失去"快速"意义
- 长期项目（50+ Feature）上下文包可能超出 Agent 窗口上限，直接不可用

**建议方案**（分阶段）：

1. **激活 shadow policy 的 scoped 变体作为实际交付模式**（P1，核心）：
   - `buildContextPack` 输出时根据 `--paths`/`--symbols` 匹配结果，将 required 拆为「确定命中」+「全局不变量」两部分，未命中的降级为 suggested
   - `actual` 从 `'full'` 改为可选 `'full' | 'scoped' | 'index+on-demand'`，默认 `scoped`
   - 向后兼容：无 `--paths` 时回退 `full`

2. **引入字符预算 + 优先级截断**（P1）：
   - 定义上下文包总字符预算（如 32KB / 64KB，可配置）
   - 优先级：全局不变量红线 > 命中路径的红线/规范 > 当前 Feature 产物 > stable 知识 > cross-feature > candidate 知识
   - 超预算时按优先级从低到高截断/降级为索引摘要

3. **cross-feature 相关性过滤**（P2）：
   - 不再全量加载所有 Feature 的 decision-log，按 domain/tags/path 重叠度筛选 Top-N（如 5 个最相关）
   - 或改为 index+on-demand：只给 Feature ID + 标题摘要，Agent 按需 `sovei context expand <feature>`

4. **Feature 产物聚合上限**（P2）：
   - 单 Feature 产物块设定聚合上限（如 12KB），超限时按 stage 相关性优先保留

### 3.4 P2 — 观察项（低风险顺带）

| # | 项 | 现状 |
|---|---|---|
| P2-1 | **013 O2 sentinel upsert 晋升** | 已覆盖 011/012/013，保持 candidate；**再被第 4 个 Feature 复用则晋升 stable** |
| 低 | **adapted.rules.json confidence 字段校验** | `adapted.rules.json` 中 20 条 deprecated 规则含 `"confidence": "medium"`。该字段是 schema 合法可选字段（`z.enum(['high','medium','low']).optional()`），当前 `rules validate` + `context build` 均通过无报错。若曾出现校验告警属历史遗留（可能 schema 更新前的产物），不影响工作流推进——全部规则已 deprecated，confidence 仅辅助人工审查 |

### 3.5 ✅ P1 — load 阶段探索能力增强（已完成）

> 2026-08-10 分析新增，**已于 2026-08-10 由 Feature 025-load-stage-enhancement 完成**。

**问题**：load 阶段是 12 阶段链中最薄的一环，仅做状态校验 + `workflow-state.yaml` 初始化，对后续阶段的信息增益几乎为零。

**已完成内容**（Feature 025，179/179 测试通过）：

| 方向 | 完成情况 |
|---|---|
| **补齐设计文档承诺（P1）** | ✅ `TASK_TYPE_MAP['general']` 增加 `code-map` 和 `rule`；增加 postExecute 校验 |
| **增加主动探索能力（P2）** | ✅ load 产出 `load-summary.md`；grill `requiredArtifacts` 增加 `load-summary.md`；load prompt 增加探索方法论指导 |
| **绑定外部 Skill（P3）** | ❌ 延后（已决策 D3，不绑定外部 skill） |

**遗留项**：
- P3 绑定外部 Skill 待后续评估

**关联**：
- 与 P1-3（上下文包膨胀）互补：P1-3 解决"上下文包太大"，本项解决"load 阶段上下文太薄"
- 与 drift detection（问题三）正相关：load 产出 `load-summary.md` 记录代码库快照，drift detection 可以此为 baseline 对比

### 3.6 战略级能力缺口（Drift Detection + 统一关系模型）

> 源自 2026-08-06 讨论确定的四大战略问题。问题一已解决，问题二已部分解决（S0 快速通道已实现），问题三和问题四完全未实现。详见 `technical-sharing/TECH_SHARING_MATERIAL_POLISHED.md` §15。

#### 问题三：Drift Detection（代码变更检测）

**问题**：普通 AI 会话（不经 Sovei 工作流）直接变更代码后，业务红线、代码地图、知识库等治理资产不可信——代码已经改了，但红线/地图/知识还停留在旧版本。

**现状**：❌ 完全未实现。无 spec Feature、无源码模块。仅在 `specs/014-skills-runtime-completion/learning-report.md` 中作为"后续观察 skills 效果的场景"被提及。

**需要实现的能力**：
1. **代码变更检测**：对比 baseline revision 与当前工作区，识别哪些文件/符号发生了变更
2. **影响面评估**：变更是否触及已有红线 scope、coverage-matrix 命中的代码表面、knowledge 条目的 codeEvidence
3. **可信度标记**：被 drift 的红线/地图/知识自动标记为 `stale`，提示需要重新验证
4. **CLI 入口**：`sovei drift check` 或类似命令，输出 drift 报告

**依赖**：统一关系模型（问题四）是理想基础——有关系图才能精确计算影响面。但 MVP 可先做基于 path/scope 的粗粒度检测。

**与 S0 快速通道的关系**：S0 的 `evaluateQuickRun` 已有 `verifyGitChanges` 做 Git diff 范围验证（验证声明范围 vs 实际 diff），但**不做语义级 drift 检测**——不检查变更是否使红线/知识失效。

#### 问题四：统一关系模型（Unified Relationship Model / Graph Coding）

**问题**：业务地图、代码地图、业务红线、Context Pack、Scope、Coverage Matrix、Wayfinder、Spec/Task/Evidence 等关系分散在不同 JSON、文档和模块中，没有统一的关系模型来驱动自动推理。

**现状**：❌ 完全未实现。`technical-sharing/TECH_SHARING_MATERIAL_POLISHED.md` §15 明确指出"Graph-aware Coding 的基础设施已经开始形成，但关系图还没有完全变成可自动推理、可自动影响执行的统一系统"。

**距离最终 Graph Coding 还差 5 层**：

| # | 缺失能力 | 状态 | 说明 |
|---|---|---|---|
| 1 | **统一关系模型** | ❌ 未实现 | 定义业务能力、代码入口、模块、规则、Spec、Task、Evidence 之间的关系，不再分散在各 JSON/文档/模块 |
| 2 | **正向影响分析** | ❌ 未实现 | 业务需求变化后，自动重新计算受影响的代码、规则和验证面 |
| 3 | **反向同步** | ❌ 未实现 | 代码修改后，反向更新代码地图和业务地图，形成双向同步 |
| 4 | ~~语义合并预检~~ | ✅ **已实现** | 由 preflight 模块实现（2026-08-10） |
| 5 | **图查询上下文** | ❌ 未实现 | AI 根据关系图自动生成最小且正确的上下文，而非依赖阶段规则和人工组织（与 P1-3 上下文包膨胀治理直接相关） |

**设计原则**（来自 014 学习报告，尚未晋升 stable）：
- `structural-fact`（可自动覆盖）vs `semantic-annotation`（不可自动覆盖）的区分应成为统一关系模型的核心设计原则
- skill body 是 structural-fact，Sovei 阶段契约是 semantic-annotation

**建议路径**：
1. 先做 drift detection（问题三 MVP，基于 path/scope 粗粒度）
2. 再做统一关系模型（定义关系 schema + 适配器接入现有 JSON）
3. 最后做影响分析引擎 + 图查询上下文（依赖前两者）

### 3.6 P2 — 外部 Skills 运行时后续

> 来源：`specs/014-skills-runtime-completion/learning-report.md` §建议的后续行动。

| # | 项 | 现状 | 说明 |
|---|---|---|---|
| P2-2 | **多 binding 支持** | ❌ 未实现 | 一个阶段注入多个 skill（如 grill 同时绑定 grilling + domain-modeling）。需扩展 `skill-map` schema 和 `MarkdownSkillAdapter` 逻辑。当前 `skill-map.json` 每阶段只允许一个 skill ID |
| P2-3 | **Skill 附加文件解析** | ❌ 未实现 | `domain-modeling` 的 `CONTEXT-FORMAT.md` 和 `ADR-FORMAT.md` 目前被忽略。`MarkdownSkillAdapter` 已有 `skillDir` + `loadReferenceFiles()` 可内联 `references/*.md`，但 vendor skill 的附加文件不在 `references/` 约定路径下。需扩展 adapter 支持读取 skill 目录下指定文件列表 |

### 3.7 P2 — Quick 通道后续项

> 来源：`specs/020-quick-context-governance/exploration.md` §9 未决项。

| # | 项 | 状态 | 说明 |
|---|---|---|---|
| — | ~~`quick --json` 输出膨胀~~ | ✅ **已由 Feature 021 解决**（2026-08-10）：`QuickEvaluationResult.policy` 从完整 `ContextPolicyResult` 改为 `QuickPolicySummary` 摘要类型（仅 controlPlane + shadowSummaries + index）。输出从 117KB 降至 37KB（68% 缩减）。剩余体积属 P1-3 范畴 | — |
| P2-4 | **`usage export --redacted`** | ❌ 后续迭代 | `usage.jsonl` 默认 gitignore 后如何团队评测共享。需定义脱敏字段、时间桶聚合、导出命令 |
| P2-5 | **`context build --paths` 语义修正** | ❌ 建议单独立项 | `--paths` 当前仅用于 project rules 匹配，不影响 required 红线/stable rules 的筛选。应修正为：`--paths` 同时过滤 required 中的红线和 stable rules。与 P1-3 直接相关 |
| P2-6 | **标准流程各阶段上下文预算值** | ❌ 等评测数据 | shadow policy 已计算三变体字符数，但未设定阈值。需先观测真实使用数据再定预算 |
| P2-7 | **quick 通道「过度防御 + 冷启动」缺陷** | ❌ 待评估 | `evaluateQuickRun` 的 `needsEscalation` 任何「不确定」都 escalated（详见 §3.7.1） | §3.7.1 |

#### 3.7.1 P2-7 — quick 通道「过度防御 + 冷启动」缺陷（2026-08-10 分析新增）

> 来源：实际使用 `sovei quick "..." --paths <file>` 时 escalated 分析。**不是「为了开发而开发」——有真实治理价值，但判定策略过保守、冷启动体验差。**

**现象**：quick 返回 `git: null` + escalated + 「人工介入：目标范围或上下文相关性仍不确定」。用户易误判为「无 commit 导致」，实际根因更深。

**根因**（核对 `quick/run.ts` + `context/policy.ts`）：

| 维度 | 现状 | 问题 |
|---|---|---|
| **needsEscalation 判定过严** | `run.ts` L148-151：`!target \|\| status==='escalated' \|\| status==='expanded' \|\| declaredPaths.length!==1` 任一满足即 escalated | 5 个条件都是「不确定就拒绝」，正常路径极窄，几乎必然 escalated |
| **status='expanded' 误伤** | `policy.ts` L177：`uncertain = 有 paths 且有未命中的红线/规则候选` → `status='expanded'` → 触发 escalated | 传了 `--paths` 但上下文存在未完全锁定的红线/规则候选时，**相关性不确定被当成「拒绝实施」**，未先做 git 验证就 early-return |
| **`git: null` 的误解** | escalated 分支 `return { git: null }`（run.ts L161），**根本没走到 git 验证** | 用户误以为「无 commit 导致」，实际是 needsEscalation 提前拦截；冷启动仓库只是次要因素 |
| **冷启动无引导** | 仓库无 commit 时即使走 git 验证也返回 `baseline-unreadable`，但无「建议先建基线 commit」引导 | 首次使用体验差，用户不知所措 |

**与「为开发而开发」的判断**：
- **核心机制不过度**：机器先审 + git 范围验证是 Sovei 治理承诺，有 usage 事件观测支撑，解决「问题二：小需求触发完整流程」。
- **判定策略过度防御**：把「上下文相关性不确定」和「git 无法验证」都当作「拒绝实施」的充分条件，与「快速」初衷矛盾。

**建议改进**（分三个方向，按价值/成本排序）：

| 优先级 | 方向 | 内容 | 理由 |
|---|---|---|---|
| **P1** | **区分「可安全降级」与「必须人工」** | `status='expanded'`（相关性不确定）应作为警告而非硬性 escalated——先做 git 范围验证（diff 不受上下文相关性影响），再让用户确认上下文。仅当 git 无法验证时才真正阻塞 | 直接解决「几乎必然 escalated」的核心痛点，改动聚焦 `run.ts` needsEscalation 逻辑 |
| **P2** | **冷启动引导** | 无 commit / 非 git 仓库时，quick 明确提示「当前仓库无 commit，无法做 diff 范围验证；建议先建立基线 commit」而非笼统 escalated | 提升首次体验，改动小 |
| **P2** | **放宽 declaredPaths 限制** | 允许 0 个/多个路径的合理降级（0 个路径时用 target 语义匹配），不强制恰好 1 个 | 降低误伤，与 P1 协同 |

**关联**：
- 与「问题二（S0 快速通道）」直接相关——本项是它的体验缺陷，非新能力。
- 与 P2-5（`--paths` 语义修正）协同：`--paths` 正确过滤 required 红线/规则后，`status='expanded'` 的误触发会减少。

### 3.8 ✅ P2 — Feature 流程状态遗留清理（已完成）

> ✅ **已于 2026-08-11 完成**。4 个卡在 `in_progress` 的 Feature 经人工确认后全部归档（status 改为 completed，decision-log 记录归档原因）。

| Feature | 原状态 | 归档原因 |
|---|---|---|
| `002-onboard-prompt` | 卡在 grill | onboarding 已由后续 Feature 迭代多次完成 |
| `009-artifact-contract-alignment` | 卡在 wayfind | decision-log 已明确"建议终止"；契约对齐已由 Feature 019 解决 |
| `012-external-skills-runtime` | 卡在 implement | 已被 `014-skills-runtime-completion` 完整替代 |
| `015-learn-reconcile-verify` | 卡在 sync | 已由 `015-workflow-version-semantics` 替代 |

### 3.9 P2 — 子 Agent 强化方向（架构观察）

> 2026-08-10 新增。思考：Sovei 工作流中部分查询/节点是串行 I/O 密集型操作，可用子 Agent（sub-agent）并行化以提升效率。当前 Sovei 是单进程 CLI，所有阶段串行执行；以下为候选强化点，需评估可行性和收益后再立项。

| # | 候选节点 | 现状（串行瓶颈） | 子 Agent 强化设想 | 优先级 |
|---|---|---|---|---|
| **SA-1** | **cross-feature 相关性过滤** | `--cross-feature` 串行遍历所有 Feature 目录读 `decision-log.md`，Feature 50+ 时 I/O 瓶颈明显 | 子 Agent 并行读取 → 各自输出摘要 + 相关性评分 → 主 Agent 取 Top-N。直接解决 P1-3 和 P2-5 | **P1** |
| SA-2 | **context build 组装** | required 项（红线 + 知识 + 规范 + 产物）串行加载 | 子 Agent 分组并行加载，主 Agent 合并 + 优先级截断。与 SA-1 协同 | P2 |
| SA-3 | **converge/verify 代码审查** | 单一 Agent 会话做全部审查 | 子 Agent 分维度并行（类型安全/测试覆盖/规则合规/架构合规），主 Agent 汇总裁决 | P2 |
| **SA-4** | **drift detection 影响面评估** | 未实现。MVP 需逐一检查红线 scope / coverage-matrix / knowledge codeEvidence | 子 Agent 按规则类别并行扫描，主 Agent 汇总 drift 报告 | **P1**（与 drift MVP 同期） |
| SA-5 | **preflight 三类冲突检测** | `MergePreflightChecker` 串行执行红线→知识→coverage | 三类互相独立可并行。当前数据量小收益有限，规模化后可提升 | P2 |
| SA-6 | **learn 知识提取** | learn postExecute 串行解析→匹配→创建/晋级 | 子 Agent 并行（提取/搜索/评估），知识库写入串行保一致性 | P2 |

**设计约束**：
- 子 Agent 强化是**宿主 AI 层面的并行编排**，不是 Sovei CLI 自身的并发改造。Sovei CLI 仍是单进程，通过输出结构化 JSON 让宿主 AI（如 CodeBuddy）决定是否分派子 Agent。
- 需要定义**子 Agent 契约**：输入（path/参数 JSON）+ 输出（结构化结果 JSON），类似当前 `sovei quick --json` 的模式。
- 优先实施 SA-1（cross-feature 并行过滤），因为它直接解决 P1-3 上下文包膨胀的核心痛点，且契约边界清晰。

---

## 4. 场景一（通用用户项目）待开发

> 详见 `design-docs/SOVEI_SCENARIOS_DECISION.md §2.5`。

| 优先级 | 待开发 | 现状 | 价值 |
|---|---|---|---|
| P1 | spec 四层 git 分层策略固化为命令/模板 | ❌ 未实现 | 解决"spec 快速迭代满、git 历史被刷" |
| P1 | Feature 收敛后主动归档过程产物 | ⚠️ 部分（仅 change/reopen 时归档） | 解决"过程产物堆积" |
| P1 | 知识提取复用价值阈值（最少证据） | ❌ 未实现 | 防 knowledge 膨胀 |

---

## 5. 场景二（多分支/多工程协作）

> 详见 `design-docs/SOVEI_SCENARIOS_DECISION.md §3.5`。

| 优先级 | 待开发 | 现状 | 价值 |
|---|---|---|---|
| ~~P0~~ | ~~红线 branch 作用域隔离~~ | ✅ **已实现**（2026-08-09，已发 2.5.7）：`Redline` schema 新增可选 `branches: string[]`（缺省/空=全局）；`syncToSatellite` 按目标 satellite 的 `branch` 过滤；`governance redline add/update/import` 支持 `--branch`（update 另支持 `--clear-branches`） | 个人多工程：工程专属红线不互相污染 |
| ~~P0~~ | ~~merge preflight 语义冲突预检~~ | ✅ **已实现**（2026-08-10）：新增 `src/preflight/` 模块，三类语义冲突检测（红线/知识/coverage）+ 四种裁决动作（merge/isolate/override/manual）+ 事件流 + CLI `sovei workspace preflight` | 规模化合并防线 |
| P2 | 联邦星型（multi-hub） | ❌ 未实现（当前单 hub） | 多主干/多团队对账，规模化后再做 |

---

## 6. 发布说明校对（大版本更新时必做）

- **`packages/sovei-core/README.md` 是发布说明文件**，每次大版本更新需校对：
  - 「版本与发布」章节版本号（✅ 已同步至 2.5.7，2026-08-10）
  - 命令速查表是否覆盖全部新增命令
  - 能力概览表、外部 Skills 绑定表、安装/上手示例
  - 环境要求（Node >= 14.18）、发布产物 `sovei.cjs`、零运行时依赖描述
- 详见长期记忆「packages/sovei-core/README.md 发布说明校对规则」。

---

## 7. IDE 适配器与发布生命周期

> 来源：`design-docs/SOVEI_HARNESS_WORKFLOW_DESIGN.md` Phase 3/4。

| 优先级 | 待开发 | 现状 | 说明 |
|---|---|---|---|
| P2 | **Cursor Adapter** | ❌ 未实现（`adapters/registry.ts` 中 `cursor: pending`） | Phase 3 剩余项。Codex/Claude/CodeBuddy/Trae 已完成，Cursor 未做 |
| P2 | **Phase 4：harness-release.yaml + vendor lock** | ❌ 未实现 | 建立 vendor skill 版本锁定文件，记录每个第三方 skill 的来源 commit/tag |
| P2 | **Phase 4：上游 diff 追踪** | ❌ 未实现 | 追踪 vendor skill 上游变更，提供 diff 报告 + 人工批准流程 |
| P2 | **Phase 4：安装器/缓存/离线分发评估** | ❌ 未实现 | 评估是否需要 skill 安装器、本地缓存和离线分发能力（当前网络约束：github.com 不通，需 raw 通道） |
| P2 | **Phase 2 回放验证** | ❌ 未完成 | 用一个真实普通 Feature 和一个长周期 Feature 回放验证完整工作流 |

---

## 8. 建议开发顺序

| 步骤 | 项 | 状态 |
|---|---|---|
| 1 | ~~清工作流自身债（P0）：016 收尾 → O1 晋级~~ | ✅ 已完成（2026-08-07） |
| 2 | ~~场景二 P0-1 红线分支隔离~~ | ✅ 已完成（2026-08-09，已发 2.5.7） |
| 2 | ~~场景二 P0-2 merge preflight~~ | ✅ 已完成（2026-08-10） |
| **3** | ~~**上下文包膨胀（P1-3）**~~：激活 shadow policy scoped 变体 + 字符预算截断 | ✅ 已完成（2026-08-10，Feature 022） |
| **4** | ~~**Drift Detection MVP**~~ → 第一期不做。改为 **过期感知 L1**（个人级 P0） | ✅ 已完成（2026-08-10，Feature 024） |
| **5** | ~~**load 阶段增强**（补齐知识加载 + postExecute + 主动探索产出）~~ | ✅ 已完成（2026-08-10，Feature 025） |
| **6** | **README 版本同步 + Feature 遗留清理** | ❌ 待开发 |
| **5** | **场景一 P1**：spec 分层 git 策略 + 主动归档 + 知识阈值 | ❌ 待开发 |
| **6** | **统一关系模型**（§3.6 问题四）：关系 schema + 适配器接入现有 JSON | ❌ 待开发 |
| 6.6 | **quick 通道「过度防御 + 冷启动」修复（P2-7）**：`status='expanded'` 降级为警告 + 冷启动引导 + 放宽 declaredPaths | ❌ 待开发 |
| 7 | 本地使用优化（P2）：`use-local.ps1` + README 补充 | ❌ 待开发 |
| 8 | ~~Feature 流程遗留清理（§3.8）：人工确认 4 个卡住的 Feature~~ | ✅ 已完成（2026-08-11） |
| 9 | 最后 P2：联邦星型、Cursor Adapter、Phase 4、O2 晋升、多 binding/附加文件 | ❌ 待开发 |
| 10 | ~~**子 Agent 强化**（§3.9）~~：SA-1 已实现（cross-feature-index + expand CLI 契约 + _subagentContract 提示）；SA-2~6 待评估 | ✅ SA-1 已完成（2026-08-10） |
| 10.5 | ~~**IDE 适配器快速通道指令**~~：sovei adapters install/list + project init --adapters + slash command 生成 + .gitignore 自动排除 | ✅ 已完成（2026-08-10，Feature 023） |

---

## 9. 待人工决策

| # | 决策项 | 当前状态 |
|---|---|---|
| ✅ | 013 O1「声明式适配器注册」晋级 stable | 已决（2026-08-07） |
| ✅ | P0-1 红线 branch 作用域隔离 | 已决（2026-08-09，已发 2.5.7） |
| ✅ | P0-2 merge preflight 语义冲突预检 | 已决（2026-08-10，已实现未发布） |
| ✅ | 问题一（skills 空壳）| 已决（Feature 014） |
| ✅ | 问题二（S0 快速通道）| 已部分决（Feature 020/021/022/023，~~上下文包膨胀~~已解决，~~过期感知 L1~~ 已由 Feature 024 解决，~~load 阶段增强~~ 已由 Feature 025 解决） |
| ✅ | **上下文包膨胀（P1-3）**：激活 scoped 变体 + 预算截断 + cross-feature 过滤 | 已决（2026-08-10，Feature 022） |
| ✅ | **过期感知 L1（P0）**：sync 记录仓库基线 + context build/quick 对比 HEAD 提示 | 已决（2026-08-10，Feature 024） |
| ✅ | **Drift Detection（§3.6 问题三）**：第一期不做。没有门禁 drift 一定发生（做检测也没用），有门禁不需要检测。个人用 L1 过期感知 + 基线重新校准，企业靠 CI 门禁强制 | 已决（2026-08-10） |
| ✅ | **load 阶段探索能力增强（§3.5）**：方向一（补齐知识加载+postExecute）+ 方向二（主动探索产出 load-summary.md）已实现；方向三（绑定 skill）延后（D3 决策） | 已决（2026-08-10，Feature 025） |
| ❓ | **quick 通道「过度防御 + 冷启动」修复（P2-7，§3.7.1）**：是否做？核心是 `status='expanded'` 从「硬性 escalated」降级为「警告 + 先做 git 验证」；冷启动引导 + 放宽 declaredPaths 为可选增强。**判断依据**：quick 通道使用频率——若个人日常主要走完整工作流，quick 仅锦上添花，可延后；若依赖 quick 做小需求快速通道，则值得优先 | 待决（2026-08-10 分析） |
| ❓ | **统一关系模型（§3.6 问题四）**：本轮是否启动？关系 schema 设计范围——一次性整合所有 JSON 还是分批接入？ | 待决 |
| ❓ | **`context build --paths` 语义修正（P2-5）**：是否与 P1-3 合并为一个 Feature？ | 待决 |
| ❓ | **联邦星型**：是否本轮做？（单 hub 已满足个人三工程） | 待决 |
| ❓ | **`mcp` 字段**：做 MCP server 还是长期挂起？ | 待决 |
| ❓ | **Cursor Adapter**：是否有实际使用需求驱动？ | 待决 |
| ✅ | **子 Agent 强化（§3.9）**：SA-1 已实现（Feature 022），提供 cross-feature-index + expand CLI 契约 + _subagentContract 提示 | 已决（2026-08-10） |
| ✅ | **IDE 适配器快速通道指令**：sovei adapters install/list + project init --adapters，用户交互式选择安装 | 已决（2026-08-10，Feature 023） |
| ✅ | **quick --exclude 自动 .gitignore**：无 --exclude 时自动从 .gitignore 读取排除路径，移除 dist/** 硬编码 | 已决（2026-08-10） |
| ❓ | **Phase 4 外部 Skills 生命周期**：是否启动？网络约束（github.com 不通）是否影响？ | 待决 |
