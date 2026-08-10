# Sovei

> ⚠️ **高速迭代中**：当前版本更新频率较高，API 可能在 minor 版本间调整。建议关注最新版本。

Sovei 是一个便携式 TypeScript 工作流引擎，提供开发 SOP、类型化项目知识、
决策地图、重大变更控制和演进式架构治理。

## 能力概览

Sovei 把「AI 辅助开发」变成一条可审计、可回放、可治理的工程流水线，
而不是一次性提示词。核心能力包括：

| 能力 | 说明 |
|---|---|
| **结构化开发工作流** | 12 阶段 SOP（load → learn → sync），一次只推进一步，每步产出可审查的产物 |
| **类型化项目知识** | 知识条目有生命周期（candidate → pending → stable），单次观察不能直接晋级 |
| **业务红线治理** | 认证、计费、数据完整性等不可碰的红线被显式记录并自动守卫 |
| **决策地图** | 跨会话的大型工作用 wayfinder 拆成可认领、可追踪的决策区域 |
| **重大变更控制** | 自动检测代码变更是否触碰红线和知识边界 |
| **演进式架构治理** | 记录架构意图，扫描架构漂移，输出治理报告 |
| **需求对齐与确认门** | spec 产出 reconciliation.md，PM/技术双确认后放行 |
| **外部 Skills 生态** | 把第三方 AI skills（grilling、code-review 等）绑定到各阶段，增强 agent 能力 |
| **多 Agent 适配** | 自动把规范/知识/skills 渲染进 Codex、Claude Code、Cursor 等上下文文件 |
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
4. 生成 `harness/project/onboard-report.md` 供人工审核

agent 完成且人工审核后：

```bash
sovei governance redline list
sovei knowledge list --lifecycle candidate
cat harness/project/onboard-report.md
```

审核通过后，才开始正式开发：

```bash
sovei workflow bootstrap 001-first-feature
```

### Feature 开发工作流

每次调用只执行一个阶段：

```text
load → grill → wayfind → spec → scope → plan → tasks → implement
→ converge → verify → learn → sync
```

```bash
# 初始化新 Feature
sovei workflow bootstrap 001-my-feature

# 获取阶段提示词 + 上下文包，交给 AI agent
sovei context build --stage grill 001-my-feature

# 准备阶段（创建产物模板）
sovei workflow grill 001-my-feature

# 完成阶段并推进
sovei workflow grill 001-my-feature --complete
```

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
| `sovei project init <path>` | 初始化新项目 |
| `sovei project onboard` | 扫描已有项目并初始化知识 |
| `sovei project onboard --evidence-only` | 采集证据 + 打印 agent 指南 |
| `sovei project status` | 查看项目状态 |
| `sovei project map` | 查看业务拓扑 |
| `sovei workflow bootstrap <feature>` | 初始化新 Feature |
| `sovei workflow <stage> <feature>` | 准备阶段 |
| `sovei workflow <stage> <feature> --complete` | 完成阶段并推进 |
| `sovei workflow confirm <feature> --stage --role --by --reference` | 确认门签字 |
| `sovei workflow override-confirm <feature> --stage --role --by --reason` | 覆盖确认门 |
| `sovei context build --stage <stage> <feature>` | 获取上下文包 |
| `sovei context build --stage spec <feature> --cross-feature` | 包含其他 Feature 决策 |
| `sovei governance redline add/list/update/deactivate` | 管理业务红线 |
| `sovei governance review-pack generate/import` | 需求对齐审查文件 |
| `sovei knowledge add/list/promote/deprecate/query/review/stats` | 管理项目知识 |
| `sovei rules validate/adapt/activate/refine/deprecate/list/resolve` | 项目工程规范治理 |
| `sovei architecture scan/status/check` | 演进式架构治理 |
| `sovei skills init/status/bind/use/sync/clean/install/upgrade/diff` | 外部 Skills 接入与管理 |
| `sovei agent list/show` | 查看宿主 Agent 能力画像 |
| `sovei wayfinder chart/skip/status/frontier/ticket/fog/claim/release/resolve/exclude` | 跨会话决策地图 |
| `sovei workspace register/list/sync/promote/unregister` | 多工作区管理 |
| `sovei change list/apply` | 重大变更控制 |
| `sovei context build` / `sovei quick` | 过期感知：sync 后若代码已绕过 Sovei 修改（HEAD 前进），输出「治理资产可能已过期」提示（`--json` 含 `stale` 字段） |

## 架构

- **壳料分离**：`packages/sovei-core/` 是壳（换项目保留），
  `harness/project/` 是料（换项目清空）。
- **状态机**：纯函数 reducer + 事件溯源，所有状态变更通过 EventStore 追加。
- **知识生命周期**：candidate → pending → stable，单次观察不得直接晋级。
- **确认门**：按风险等级自动阻塞，不是第 13 个阶段。
- **三层 agent 模型**：脚本采集证据，agent 做语义判断，人做最终决策。
- **决策地图**：wayfinder 把跨会话的大型工作拆成可认领、可追踪的决策区域（含 fog 待澄清区）。
- **多工作区**：同一项目多处 checkout 时，hub 持有稳定知识，satellite 同步到本地。

## 版本与发布

- 当前稳定版：`2.5.9`，通过 npm `latest` 渠道发布。
- 环境要求：Node.js `>= 14.18`，发布产物为 CommonJS 单文件，零运行时依赖（dependencies 为空）。
- 安装的是单一可执行文件 `dist/release/sovei.cjs`（已混淆），无需构建即可运行。
- 发布渠道为公开包（`publishConfig.access: public`），全局安装后提供 `sovei` 命令。
- **更新频率**：处于高速迭代期，API 可能在 minor 版本间调整，发布默认只递增 patch 版本号；
  有破坏性变更时会递增 minor/major。建议定期 `npm update -g @soveilove/sovei`。

仓库：https://github.com/Soveilove/sovei

## 反馈

- 提交 Bug 或功能建议：[Issues](https://github.com/Soveilove/sovei/issues)
- 讨论与提问：[Discussions](https://github.com/Soveilove/sovei/discussions)