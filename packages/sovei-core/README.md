# Sovei

> ⚠️ **高速迭代中**：当前版本更新频率较高，API 可能在 minor 版本间调整。建议关注最新版本。

Sovei 是一个便携式 TypeScript 工作流引擎，提供开发 SOP、类型化项目知识、
决策地图、重大变更控制和演进式架构治理。

## 能力概览

Sovei 把「AI 辅助开发」变成一条可审计、可回放、可治理的工程流水线，
而不是一次性提示词。核心能力包括：

| 能力 | 说明 |
|---|---|
| **结构化开发工作流** | 13 阶段 SOP（explore → load → sync），一次只推进一步，每步产出可审查的产物 |
| **Feature 拆分** | 一个 Feature 拆分为多个子变更并行开发（`feature split`），共享前段（load→scope）、分叉后段（plan→verify）、聚合收尾（learn→sync） |
| **类型化项目知识** | 知识条目有生命周期（candidate → pending → stable），单次观察不能直接晋级 |
| **业务红线治理** | 认证、计费、数据完整性等不可碰的红线被显式记录并自动守卫 |
| **决策地图** | 跨会话的大型工作用 wayfinder 拆成可认领、可追踪的决策区域 |
| **重大变更控制** | 自动检测代码变更是否触碰红线和知识边界 |
| **演进式架构治理** | 记录架构意图，扫描架构漂移，输出治理报告 |
| **需求对齐与确认门** | spec 产出 reconciliation.md，PM/技术双确认后放行 |
| **外部 Skills 生态** | 把第三方 AI skills（grilling、code-review 等）绑定到各阶段，增强 agent 能力 |
| **Skills 基座** | init 即带预置技能模板（vue2/vue3/react/cli/python/quant），按项目技术栈注入 |
| **多 Agent 适配** | 自动把规范/知识/skills 渲染进 Codex、Claude Code、Cursor 等上下文文件；Codex 桌面版通过技能包触发 |
| **版本更新提示** | 启动时检测 npm 最新版本，输出更新提示或新能力建议（可 `SOVEI_NO_UPDATE_CHECK=1` 关闭） |
| **老项目快速接入** | `onboard --evidence-only` 采集证据，生成 onboarding 指南供 agent 消化 |

## 安装

```bash
npm install -g @soveilove/sovei
sovei --version
sovei --help
```

## 快速上手

### 新项目

```bash
sovei project init ./my-app --framework vue --language typescript
```

创建目录结构，按技术栈写入种子知识，并生成 `AGENTS.md` 让所有 AI agent
（Codex、Claude Code、Cursor 等）自动发现 Sovei。

### 老项目接入

对于已有代码但没有 Sovei 的项目：

```bash
cd your-existing-project
sovei project init . --force
sovei project onboard --evidence-only
```

`--evidence-only` 会采集证据（目录结构、import 关系、正则命中），然后打印一段
**AGENT ONBOARDING GUIDE**。把整段输出复制给你的 AI agent，agent 会：

1. 读取证据文件，对照真实源码验证每个业务能力
2. 读代码识别业务红线（认证、计费、数据完整性等）
3. 通过 Sovei CLI 命令写入候选红线和知识
4. 生成 `sovei-flow/project/onboard-report.md` 供人工审核

agent 完成且人工审核后：

```bash
sovei governance redline list
sovei knowledge list --lifecycle candidate
cat sovei-flow/project/onboard-report.md
```

审核通过后，才开始正式开发：

```bash
sovei workflow explore 001-first-feature --prd ./docs/prd.md
# 或内联需求：
sovei workflow explore 001-first-feature --brief "实现用户认证功能"
```

### 开发流程闭环（/ 命令指引）

在 IDE 中，一条指令走完：**PRD 输入 → 需求分析 → 代码实现 → 验证 → 归档**

```text
/sovei-explore    →  PRD 入口 + 需求理解 + 拆分提议
/sovei-load       →  代码现状探索
/sovei-grill      →  决策拷问（事实/推断/范围）
/sovei-spec       →  需求规格 + 验收标准
/sovei-scope      →  范围界定 + 拆分修正
/sovei-plan       →  实施计划
/sovei-tasks      →  任务拆解
/sovei-implement  →  逐任务编码
/sovei-converge   →  收敛检查（Spec vs 实现）
/sovei-verify     →  验证 + 确认门
/sovei-learn      →  经验提取
/sovei-sync       →  同步完成
```

小改动走快速通道：`/sovei-quick <描述> --paths <文件>`

### 需求对齐与确认门

spec 阶段产出 `reconciliation.md`（需求对齐文件），还原代码现状、翻译 PM
需求、列出方案代价、提取确认疑问。

渲染技术审查和产品审查两个视图：

```bash
sovei governance review-pack generate 001-my-feature
# 生成 specs/001-my-feature/tech-review.md 和 product-review.md
```

PM 在 product-review.md 签字后导入确认：

```bash
sovei governance review-pack import 001-my-feature
  --product specs/001-my-feature/product-review.md
  --by "张三" --reference "PRD-001"
```

技术负责人单独确认：
```bash
sovei workflow confirm 001-my-feature --stage spec --role tech
  --by "李四" --reference "JIRA-123"
```

确认门在 spec（S2/S3 风险）和 verify（所有风险）后自动阻塞。
可带理由覆盖（审计留存）：
```bash
sovei workflow override-confirm 001-my-feature --stage verify --role product
  --by "王五" --reason "紧急热修复，事后补审"
```

### 跨 Feature 上下文

开发新 Feature 时，加载其他 Feature 的决策日志，让 agent 理解之前做了什么：

```bash
sovei context build --stage spec 002-next-feature --cross-feature
```

### Feature 拆分为子变更

大型 Feature 可拆分为多个子变更并行开发。共享前段（load→scope）后分叉后段（plan→verify），
最后聚合收尾（learn→sync）。scope 阶段完成后 AI 会主动建议拆分：

```bash
# 获取拆分提议契约（JSON，供 AI 消费）
sovei feature split 001-big-feature --json

# 列出子变更状态
sovei feature sub-change list 001-big-feature

# 对子变更执行阶段（--sub-change 指定子变更 ID）
sovei workflow plan 001-big-feature --sub-change backend-api
sovei workflow plan 001-big-feature --sub-change frontend-ui --complete

# 子变更上下文聚焦
sovei context build --stage implement 001-big-feature --sub-change backend-api
```

子变更间可声明依赖关系；无依赖可并行推进，有依赖需等前置 merged。所有子变更 merged 后
父 Feature 才能进入 learn 阶段（聚合门禁）。

### Skills 基座

`project init` 会在 `sovei-flow/skills/base/` 下生成预置技能模板，按项目技术栈注入：

| 技能 | 说明 | 启用命令 |
|---|---|---|
| vue2 | Vue 2 开发规范（Options API / Vuex / Vue Router） | `sovei skills use --local sovei-flow/skills/base/vue2` |
| vue3 | Vue 3 开发规范（Composition API / script setup / composables） | `sovei skills use --local sovei-flow/skills/base/vue3` |
| react | React 开发规范（函数组件 + Hooks / 状态管理 / 性能优化） | `sovei skills use --local sovei-flow/skills/base/react` |
| cli | CLI 工具开发规范（commander / 零运行时依赖 / 单文件打包） | `sovei skills use --local sovei-flow/skills/base/cli` |
| python | Python 开发规范（类型注解 / dataclass / asyncio） | `sovei skills use --local sovei-flow/skills/base/python` |
| quant | 量化系统知识（回测框架 / 数据管道 / 风控系统） | `sovei skills use --local sovei-flow/skills/base/quant` |

agent 指令与 skills 分开存放：`sovei-flow/agents/` 存放工作流阶段指令模板，`sovei-flow/skills/` 存放技能文件。

### 外部 Skills（增强 Agent 能力）

Sovei 可以把第三方 AI skills 绑定到各阶段，让开发 Agent 在执行某阶段时
自动加载对应 skill 的指令与参考资料。当前版本内置以下绑定（全部可替换）：

| 阶段 | 绑定 Skill | 作用 |
|---|---|---|
| grill | `mattpocock/grilling` | 用持续追问打磨需求与方案 |
| wayfind | `sovei/native/wayfind` | 决策地图原生实现 |
| spec | `mattpocock/domain-modeling` | 领域建模，产出规范 spec |
| tasks | `mattpocock/to-tickets` | 把 spec 拆成可执行的 tickets |
| implement | `mattpocock/implement` | 落地实现 |
| converge / verify | `mattpocock/code-review` | 代码审查 |
| learn | `softaworks/lesson-learned` | 从 git diff 提取工程经验回流知识库 |

外部 skill 失败时自动回退到内置实现，CLI 会报告实际 skill 来源，
保证流程不会被单点故障卡死。

```bash
# 查看当前绑定状态
sovei skills status

# 把新 skill 绑定到某个阶段
sovei skills bind --stage grill --skill mattpocock/grilling --enable

# 将已接入 skills 渲染进 Agent 上下文文件（AGENTS.md / CLAUDE.md / .cursorrules）
sovei skills sync
```

## 命令速查

| 命令 | 用途 |
|---|---|
| `sovei project init <path>` | 初始化新项目（生成 `sovei-flow/` 目录 + agents + skills 基座） |
| `sovei project migrate` | 迁移已初始化项目（`harness/` → `sovei-flow/`） |
| `sovei project onboard` | 扫描已有项目并初始化知识 |
| `sovei project onboard --evidence-only` | 采集证据 + 打印 agent 指南 |
| `sovei project status` | 查看项目状态 |
| `sovei project map` | 查看业务拓扑 |
| `sovei workflow bootstrap <feature>` | 初始化新 Feature |
| `sovei workflow <stage> <feature>` | 准备阶段 |
| `sovei workflow <stage> <feature> --complete` | 完成阶段并推进 |
| `sovei workflow <stage> <feature> --sub-change <id>` | 对子变更执行阶段 |
| `sovei workflow confirm <feature> --stage --role --by --reference` | 确认门签字 |
| `sovei workflow override-confirm <feature> --stage --role --by --reason` | 覆盖确认门 |
| `sovei feature split <feature> --json` | 拆分提议契约（scope 后可用，供 AI 消费） |
| `sovei feature sub-change list <feature>` | 列出子变更状态 |
| `sovei context build --stage <stage> <feature>` | 获取上下文包 |
| `sovei context build --stage <stage> <feature> --sub-change <id>` | 子变更上下文聚焦 |
| `sovei context build --stage spec <feature> --cross-feature` | 包含其他 Feature 决策 |
| `sovei context cross-feature-index <feature> --paths <paths>` | 输出其他 Feature 决策日志的相关性索引（JSON，供子 Agent 并行消费） |
| `sovei context expand <feature-id> <artifact-name>` | 按需展开单个 Feature 产物（截断 4000 字符） |
| `sovei quick <target> --paths <file>` | 快速通道：低风险局部修改的机器先审 + Git diff 验证 |
| `sovei governance redline add/list/update/deactivate` | 管理业务红线 |
| `sovei governance review-pack generate/import` | 需求对齐审查文件 |
| `sovei knowledge add/list/promote/deprecate/query/review/stats` | 管理项目知识 |
| `sovei rules validate/adapt/activate/refine/deprecate/list/resolve` | 项目工程规范治理 |
| `sovei architecture scan/status/check` | 演进式架构治理 |
| `sovei skills init/status/bind/use/sync/clean/install/upgrade/diff` | 外部 Skills 接入与管理 |
| `sovei agent list/show` | 查看宿主 Agent 能力画像 |
| `sovei wayfinder chart/skip/status/frontier/ticket/fog/claim/release/resolve/exclude` | 跨会话决策地图 |
| `sovei workspace register/list/sync/promote/unregister` | 多工作区管理 |
| `sovei workspace preflight <source> <target>` | 合并前语义冲突预检（红线/知识/coverage 三类检测） |
| `sovei adapters install/list` | 安装/查看 IDE 适配器（CodeBuddy/Claude Code/Codex/Trae） |
| `sovei change list/apply` | 重大变更控制 |
| `sovei context build` / `sovei quick` | 过期感知：sync 后若代码已绕过 Sovei 修改（HEAD 前进），输出「治理资产可能已过期」提示（`--json` 含 `stale` 字段） |

## 架构

- **壳料分离**：`packages/sovei-core/` 是壳（换项目保留），
  `sovei-flow/project/` 是料（换项目清空）。
- **agents 与 skills 分开存放**：`sovei-flow/agents/` 存放工作流阶段指令，`sovei-flow/skills/` 存放技能文件（含 `base/` 预置基座）。
- **状态机**：纯函数 reducer + 事件溯源，所有状态变更通过 EventStore 追加。
- **Feature 拆分**：子变更状态嵌入父 Feature 状态同文件存储；聚合门禁独立于状态转移（reducer 保持纯函数）。
- **知识生命周期**：candidate → pending → stable，单次观察不得直接晋级。
- **确认门**：按风险等级自动阻塞，不是第 13 个阶段。
- **三层 agent 模型**：脚本采集证据，agent 做语义判断，人做最终决策。
- **决策地图**：wayfinder 把跨会话的大型工作拆成可认领、可追踪的决策区域（含 fog 待澄清区）。
- **多工作区**：同一项目多处 checkout 时，hub 持有稳定知识，satellite 同步到本地。

## 版本与发布

- 当前稳定版：`2.6.1`，通过 npm `latest` 渠道发布。
- 环境要求：Node.js `>= 14.18`，发布产物为 CommonJS 单文件，零运行时依赖（dependencies 为空）。
- 安装的是单一可执行文件 `dist/release/sovei.cjs`（已混淆），无需构建即可运行。
- 发布渠道为公开包（`publishConfig.access: public`），全局安装后提供 `sovei` 命令。
- **版本更新提示**：CLI 启动时自动检测 npm 最新版本。若检测到新版本，输出更新提示；
  若新版本引入了新能力，输出"建议更新"提示并列出能力清单。设置环境变量 `SOVEI_NO_UPDATE_CHECK=1` 可关闭检测。
- **更新频率**：处于高速迭代期，API 可能在 minor 版本间调整，发布默认只递增 patch 版本号；
  有破坏性变更时会递增 minor/major。建议定期 `npm update -g @soveilove/sovei`。

仓库：https://github.com/Soveilove/harness

## 反馈

- 提交 Bug 或功能建议：[Issues](https://github.com/Soveilove/harness/issues)
- 讨论与提问：[Discussions](https://github.com/Soveilove/harness/discussions)