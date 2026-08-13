# Sovei — 便携式开发 SOP 引擎

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](packages/sovei-core/LICENSE.md)
[![npm version](https://img.shields.io/npm/v/@soveilove/sovei.svg)](https://www.npmjs.com/package/@soveilove/sovei)

> 🚀 **v2.6.1 重大更新**：已实现企业级 13 阶段 SOP 工作流闭环。新增 `explore` 需求入口（`/sovei-explore --prd` 一条指令搞定 PRD→需求分析→拆分提议）、Feature 子变更并行开发、Skills 基座、IDE 全适配。**建议立即升级：`npm install -g @soveilove/sovei@latest`**

Sovei 是一个便携式 TypeScript 工作流引擎，提供开发 SOP、类型化项目知识、决策地图、重大变更控制和演进式架构治理。它定义"怎么沉淀知识"（工作流 + 知识生命周期），不定义"知识是什么"（那是项目专属内容）。

> 仓库：[github.com/Soveilove/harness](https://github.com/Soveilove/harness)

> **当前状态**：开源项目（MIT License）。13 阶段完整工作流（含 explore 需求入口）、Feature 拆分、Skills 基座、Codex 技能包适配、版本更新提示等能力已就绪。CLI 启动时自动检测新版本并提示。

## 设计思想

Sovei 2.6+ 借鉴五个主流框架的核心思想，并增加演进式架构治理和外部 Skills 运行时集成：

| 借鉴来源 | 核心思想 | 应用层 |
|---|---|---|
| Vite Plugin | hook 生命周期 + 可组合插件 | Stage 定义和扩展 |
| XState | 形式化状态机 + 可序列化 context | Workflow Engine |
| Redux | reducer 纯函数 + typed actions | Knowledge Store |
| NestJS DI | 依赖注入 + 模块化 | Service Container |
| Express Middleware | pipeline + context 传递 | Stage Pipeline |

## 壳料分离

| 层 | 内容 | 换项目时 |
|---|---|---|
| 壳（工具层） | 工作流引擎、模板、CLI、阶段定义 | 原样保留 |
| 料（项目层） | 踩坑库、代码地图、架构文档、ADR、实现规则 | 清空重填 |

当前项目声明见 [sovei-flow/project/project.config.json](sovei-flow/project/project.config.json)。

## 快速开始

```bash
# 安装依赖
pnpm --dir packages/sovei-core install

# 构建
pnpm --dir packages/sovei-core run build

# 使用 CLI
node packages/sovei-core/dist/cli/index.js --help

# 初始化新项目
node packages/sovei-core/dist/cli/index.js project init ./my-project --name "My Project"

# 创建新 Feature（带 PRD 的完整入口）
node packages/sovei-core/dist/cli/index.js workflow explore 001-my-feature --prd ./docs/prd.md

# 或：内联需求描述（无 PRD 文件时）
node packages/sovei-core/dist/cli/index.js workflow explore 001-my-feature --brief "实现用户登录的 OAuth2 支持"

# 填写 exploration.md + sub-change-map.md 后完成 explore 阶段
node packages/sovei-core/dist/cli/index.js workflow explore 001-my-feature --complete

# 准备阶段（生成提示契约和缺失模板，不推进状态）
node packages/sovei-core/dist/cli/index.js workflow load 001-my-feature

# 完成实际工作后显式校验并推进
node packages/sovei-core/dist/cli/index.js workflow load 001-my-feature --complete
node packages/sovei-core/dist/cli/index.js workflow grill 001-my-feature
# 填写 specs/001-my-feature/decision-log.md 后：
node packages/sovei-core/dist/cli/index.js workflow grill 001-my-feature --complete

# 查看状态
node packages/sovei-core/dist/cli/index.js workflow status 001-my-feature

# 返工
node packages/sovei-core/dist/cli/index.js workflow reopen 001-my-feature --target scope --reason "发现遗漏"
```

## 安装

```bash
# 全局安装（latest tag）
pnpm add --global @soveilove/sovei
sovei --version
sovei --help

# 或使用 npx 临时运行
npx @soveilove/sovei --help
```

## 工作流阶段

Sovei 2.6+ 共 13 个阶段，每次调用只执行一个：

```
explore → load → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync
```

查看所有阶段及其契约：

```bash
node packages/sovei-core/dist/cli/index.js workflow list-stages
```

阶段命令默认只执行 `prepare`：加载知识、输出 Prompt Contract，并创建缺失模板。
模板不会被视为完成。填写真实产物后使用 `--complete`，CLI 会校验产物再追加
`STAGE_COMPLETE` 事件。

### Wayfinder 决策地图

`wayfind` 仍是原有 13 阶段中的一个阶段。S2、大型或高不确定工作使用类型化决策地图；
S0/S1 且一个会话能说清的工作必须显式 `skip`，不能用空地图假装完成。

```bash
# 先准备 wayfind 阶段，再创建低分辨率地图
sovei workflow wayfind 001-my-feature
sovei wayfinder chart 001-my-feature \
  --destination "所有跨模块契约已形成可写入 Spec 的结论" \
  --notes "计费问题需要产品负责人确认"

# 决策票据不同于实现任务；地图只保存索引，细节在 decision-tickets/*.json
sovei wayfinder ticket add 001-my-feature \
  --title "确认续费边界" --question "老会员是否允许移动端续费" \
  --type grilling --interaction HITL
sovei wayfinder fog add 001-my-feature --summary "迁移范围要等续费结论后才能具体化"

# 每次调用只处理 frontier 中的一张票；处理前先认领
sovei wayfinder frontier 001-my-feature
sovei wayfinder claim 001-my-feature D-001 --actor product-owner --lease 240
sovei wayfinder resolve 001-my-feature D-001 --actor product-owner \
  --resolution "老会员本期不支持续费" --evidence "approval:BILLING-42"

# 未知区变得可描述后，毕业为新票据；超出 Destination 的票据显式排除
sovei wayfinder fog graduate 001-my-feature F-001 \
  --title "界定历史会员迁移" --question "哪些历史会员需要兼容" \
  --type research --interaction AFK --blocked-by D-001
sovei wayfinder exclude 001-my-feature D-002 --reason "不属于当前版本"

# 所有票据 resolved/excluded 且 fog 清空后，才允许完成阶段
sovei workflow wayfind 001-my-feature --complete

# 小型、明确工作不用建空地图
sovei wayfinder skip 002-small-fix --reason "单文件修复，无跨会话未决问题"
sovei workflow wayfind 002-small-fix --complete
```

规范数据以 `wayfinder-events.jsonl` 为准；`wayfinder.json` 是低分辨率索引，
`decision-tickets/*.json` 是票据详情读模型，`wayfinder.md` 是自动生成的人类视图。
`research` 必须使用 `AFK`，`prototype`/`grilling` 必须使用 `HITL`；HITL 与
research 票据没有证据或上下文引用时不能解决。认领带租约，可避免多个进程重复处理同一票据。

`implement` 按任务执行，`tasks.md` 必须使用稳定 checklist ID：

```bash
# tasks.md: - [ ] TASK-001: implement request adapter
sovei workflow implement 001-my-feature --task TASK-001
# 完成代码并在 change-manifest.md 中记录 TASK-001 后
sovei workflow implement 001-my-feature --task TASK-001 --complete
# 所有任务完成后关闭 implement 阶段
sovei workflow implement 001-my-feature --complete
```

重复执行 `bootstrap` 是幂等的，不会重置已有 Feature 状态。返工仍使用 `reopen`。

## 完整开发流程指引

以下是从零到一的完整开发流程，覆盖 13 个阶段的标准操作。

### 前置准备

```bash
# 1. 初始化项目（仅首次）
sovei project init ./my-project --name "My Project" --language typescript

# 2. 扫描现有代码库，生成业务覆盖面报告和知识库
sovei --root ./my-project project onboard
# AI 将按指南生成：
#   - sovei-flow/project/business-coverage.md（业务覆盖面报告）
#   - sovei-flow/project/business-map.json（能力依赖图）
#   - sovei-flow/project/knowledge/*.json（类型化知识）
```

### 阶段 1：explore — 需求探索与拆分提议

**职责**：读 PRD + 业务覆盖面 → 需求理解 + 拆分提议。兼任 Feature 入口。

```bash
# 入口模式 A：带 PRD 文件（推荐）
sovei workflow explore 001-user-auth --prd ./docs/prd-user-auth.md

# 入口模式 B：内联需求描述（小需求、无正式 PRD 时）
sovei workflow explore 001-quick-fix --brief "修复订单列表分页丢失问题"

# AI 按提示契约生成 exploration.md + sub-change-map.md 后，完成阶段
sovei workflow explore 001-user-auth --complete
```

**产出**：`exploration.md`（需求摘要 + 业务关联 + 拆分理由）、`sub-change-map.md`（拆分提议表或 "no-split"）

### 阶段 2：load — 代码现状探索

**职责**：读源码 → 理解当前架构、模块边界、已有实现、风险点。

```bash
sovei workflow load 001-user-auth
# AI 读取代码库关键文件，生成 load-summary.md
sovei workflow load 001-user-auth --complete
```

**产出**：`load-summary.md`（代码库现状摘要 + 相关已有实现 + 潜在风险点）

### 阶段 3：grill — 决策拷问

**职责**：区分事实核实、可推断决策与范围性决策，逐项解决业务决策。

```bash
sovei workflow grill 001-user-auth
# AI 填写 decision-log.md（事实核实 / 可推断决策 / 范围性决策）
sovei workflow grill 001-user-auth --complete
```

**产出**：`decision-log.md`（决策树，含 D1/D2/.../R1/R2/...）

### 阶段 4：wayfind — 决策地图（S2+ 风险）

**职责**：大型或高不确定工作使用类型化决策地图；小型工作可显式 skip。

```bash
# 小需求：直接跳过
sovei wayfinder skip 001-user-auth --reason "需求明确，无跨会话未决问题"
sovei workflow wayfind 001-user-auth --complete

# 大型需求：创建决策地图
sovei workflow wayfind 001-user-auth
sovei wayfinder chart 001-user-auth --destination "所有跨模块契约已形成结论"
# 逐票处理 frontier 中的决策...
sovei workflow wayfind 001-user-auth --complete
```

### 阶段 5：spec — 需求规格

**职责**：编写验收标准，产出版本对齐文档。

```bash
sovei workflow spec 001-user-auth
# AI 生成 spec.md + reconciliation.md
sovei workflow spec 001-user-auth --complete
```

**产出**：`spec.md`（验收标准）、`reconciliation.md`（PM 需求与技术的对齐文档）

> **确认门**：S2/S3 风险 Feature 在 spec 完成后需产品 + 技术确认。

### 阶段 6：scope — 范围界定与拆分修正

**职责**：基于代码影响面确定范围，修正 explore 阶段的拆分提议。

```bash
sovei workflow scope 001-user-auth
# AI 生成 scope.md + 修正 sub-change-map.md（如有必要）
sovei workflow scope 001-user-auth --complete
```

**产出**：`scope.md`（范围界定 + 影响面分析）

### 拆分 Feature（可选）

explore 或 scope 完成后，如果需求涉及多个可独立验证的功能域，可拆分为子变更并行开发：

```bash
# 获取拆分提议契约
sovei feature split 001-user-auth --json

# 查看子变更状态
sovei feature sub-change list 001-user-auth

# 在子变更上执行阶段（plan→verify 阶段可用 --sub-change）
sovei workflow plan 001-user-auth --sub-change SC-001
```

### 阶段 7-8：plan + tasks — 计划与任务拆解

```bash
sovei workflow plan 001-user-auth
# AI 生成 plan.md
sovei workflow plan 001-user-auth --complete

sovei workflow tasks 001-user-auth
# AI 生成 tasks.md（checklist 格式：- [ ] TASK-001: ...）
sovei workflow tasks 001-user-auth --complete
```

### 阶段 9：implement — 逐任务实施

```bash
# 逐个任务执行
sovei workflow implement 001-user-auth --task TASK-001
# 完成代码 + 更新 change-manifest.md 后
sovei workflow implement 001-user-auth --task TASK-001 --complete

# 所有任务完成后关闭 implement 阶段
sovei workflow implement 001-user-auth --complete
```

**产出**：`change-manifest.md`（变更清单：目标 + 任务文件 + 行为变更 + 测试）

### 阶段 10-11：converge + verify — 收敛与验证

```bash
# 收敛：检查实现与 Spec 一致性
sovei workflow converge 001-user-auth
# AI 填写 convergence-report.md（差距分类 + 架构健康）
sovei workflow converge 001-user-auth --complete

# 验证：运行测试，产出证据
sovei workflow verify 001-user-auth
# AI 填写 evidence.md（测试结果 + 功能验证 + 兼容性验证）
sovei workflow verify 001-user-auth --complete
```

> **确认门**：verify 完成后需产品 + 技术确认。可 override：
> ```bash
> sovei workflow override-confirm 001-user-auth --stage verify --role tech --by <name> --reason "全量测试通过"
> sovei workflow override-confirm 001-user-auth --stage verify --role product --by <name> --reason "验收标准全部满足"
> ```

### 阶段 12-13：learn + sync — 学习与同步

```bash
# 学习：提取可复用模式、教训
sovei workflow learn 001-user-auth
# AI 填写 learning-report.md
sovei workflow learn 001-user-auth --complete

# 同步：确认所有变更已同步到源码/测试/文档/配置
sovei workflow sync 001-user-auth
# AI 填写 sync-report.md
sovei workflow sync 001-user-auth --complete
# Feature 状态变为 completed
```

### 常用操作速查

```bash
# 查看 Feature 状态
sovei workflow status 001-user-auth

# 列出所有阶段及其契约
sovei workflow list-stages

# 返工到指定阶段
sovei workflow reopen 001-user-auth --target scope --reason "发现遗漏"

# 构建上下文包（供 AI 代理使用）
sovei context build --stage spec --feature 001-user-auth

# 快速通道（小改动，不走完整工作流）
sovei quick "修复拼写错误" --paths src/utils/format.ts
```

### 关键设计原则

1. **explore 与 load 职责正交**：explore 读 PRD + 业务覆盖面（需求侧），load 读源码（代码侧），避免重复读代码浪费上下文
2. **一个命令一条指令**：`explore --prd` 同时完成 Feature 创建 + PRD 复制 + 阶段准备
3. **两层拆分互补**：explore 基于需求功能域做首次拆分提议，scope 基于代码影响面做二次修正
4. **prepare → complete 两段式**：`prepare` 生成提示契约和模板，AI 填写产物后 `--complete` 校验并推进，防止空模板被视为完成
5. **向后兼容**：老 Feature 无 explore 阶段事件时自动静默跳过，不阻塞推进

## 外部 Skills 运行时

Sovei 支持将第三方 Skills（如 [Matt Pocock skills](https://github.com/mattpocock/skills)）绑定到工作流阶段，
在执行阶段时自动将 Skill 内容注入到 AI 代理的 prompt 中。这意味着每个阶段不仅使用 Sovei 原生的
阶段契约，还能获得外部专业方法论的指导。

### Skill 映射

| Sovei 阶段 | 外部 Skill | 作用 |
|---|---|---|
| grill | `mattpocock/grilling` | 设计树 + frontier 轮次提问纪律 |
| spec | `mattpocock/domain-modeling` | 术语表维护 + ADR 判定 |
| tasks | `mattpocock/to-tickets` | tracer-bullet 纵向切片 |
| implement | `mattpocock/implement` | TDD 优先 + code-review 收尾 |
| converge | `mattpocock/code-review` | 双轴审查（Standards + Spec） |
| verify | `mattpocock/code-review` | 同上（复用） |
| learn | `mattpocock/handoff` | 对话压缩为交接文档 |

### Prompt 注入结构

```
## 权威规则          ← Sovei 原生（revision + 产物权威性）
## 外部 Skill 指令    ← 第三方 SKILL.md body
# 阶段：xxx          ← Sovei 原生（输入/操作/输出/停止条件）
```

外部 Skill 加载失败时自动回退到原生 prompt，不阻断工作流。CLI 输出会显示实际使用的
Skill 来源：`使用 Skill：mattpocock/grilling v1.0.0` 或 `使用 Skill：native`。

### Skills 治理命令

```bash
# 查看当前 skill 配置状态
sovei skills status

# 从 git 仓库安装 skill
sovei skills install --git https://github.com/mattpocock/skills.git --ref main \
  --paths skills/productivity/grilling --ids mattpocock/grilling

# 从本地目录安装
sovei skills install --path ./my-skill --id myorg/my-skill

# 检查上游更新
sovei skills upgrade mattpocock/grilling

# 查看与上游的差异
sovei skills diff mattpocock/grilling

# 绑定 skill 到阶段
sovei skills bind --stage grill --skill mattpocock/grilling --enable

# 同步到 IDE 上下文文件
sovei skills sync

# 从 IDE 上下文文件移除
sovei skills clean
```

Skill 配置存储在 `sovei-flow/skills/skill-map.yaml`（绑定）和 `sovei-flow/skills/skill-lock.yaml`
（版本锁定 + checksum）。Vendor 文件位于 `sovei-flow/vendor/`。升级必须人工审查 diff 后确认，
不自动跟随上游 latest。

## 项目场景

```bash
# 新项目：写入指定目录；已有声明默认拒绝覆盖
sovei project init D:/work/new-app --framework vue --language typescript

# 老项目：扫描当前 --root；重复执行会刷新确定性候选，不重复堆积
sovei --root D:/work/legacy-app project onboard --depth 4

# 同项目多工程：在 Hub 根目录维护注册表
sovei --root D:/work/app-main workspace register D:/work/app-main --id main --hub
sovei --root D:/work/app-main workspace register D:/work/app-feature --id feature
sovei --root D:/work/app-main workspace sync feature
sovei --root D:/work/app-main workspace promote feature
```

Hub 只向卫星分发 stable 知识；卫星只向 Hub 提交 candidate。项目身份、重复 ID、
重复路径和知识 ID 冲突都会阻止同步。Hub 的业务红线也会作为权威治理数据同步到卫星。

## 项目工程规范（Rules）

项目规范存储在 `sovei-flow/project/rules/*.rules.json`。它和另外两类约束严格分开：

| 类型 | 解决的问题 | 生效方式 |
|---|---|---|
| Project Rules | 代码风格、架构边界、验证命令、目录和阶段约束 | active 后按 stage + path 注入上下文 |
| Knowledge rule | 从实践中归纳的实现经验 | candidate 经证据审查后晋级 stable |
| Governance redline | 认证、计费、数据完整性等不可破坏业务边界 | 显式启用，并参与重大变更门禁 |

新项目和老项目使用不同的信任链：

```bash
# 新项目：只创建空 Rules 容器，不猜测、不补充默认规范
sovei project init D:/work/new-app --language typescript
sovei --root D:/work/new-app rules validate

# 已有项目：仅在发现原有 Agent/IDE Rules 时适配 candidate，绝不自动生效
sovei --root D:/work/legacy-app project onboard
sovei --root D:/work/legacy-app rules adapt
sovei --root D:/work/legacy-app rules list --lifecycle candidate
sovei --root D:/work/legacy-app rules activate ADAPTED_... \
  --reviewer tech-lead --reason "已与当前代码和团队约定核对"
```

适配器只读取有界范围内的显式规则源：Codex 的根目录或分层 `AGENTS.md`、Cursor 的
`.cursorrules` 和 `.cursor/rules/*`、Claude Code 的根目录或分层 `CLAUDE.md` 和
`.claude/rules/*`。`package.json` 脚本、`tsconfig` 和技术栈只是项目事实，不会被推断为
Rules。没有原有规则时不会创建 `adapted.rules.json`；重复适配保持幂等，并保留已人工
审查的状态和证据。其他 IDE 可沿规则源适配器模式扩展。

规则支持 `required/advisory`、`candidate/active/deprecated`、路径 glob、排除路径、
工作流阶段和 command/review 验证项。配置非法或 ID 重复时 fail closed；没有传目标路径时，
解析器保守返回该阶段的全部 active 规则，避免在 scope 尚不明确时漏掉限制。

```bash
sovei rules resolve --stage implement --paths "packages/core/src/a.ts,packages/ui/src/b.vue"
sovei context build 001-my-feature --stage implement --paths "packages/core/src/a.ts"
```

当前 Sovei 仓库已有 `AGENTS.md`，因此通过同一适配链生成待审核 candidate；不会因为
Sovei 正在开发自己，就绕过生命周期直接生成 active 规范。

## 极端需求变更与业务红线

功能方向大幅变化时，不要直接修改旧 Spec，也不要只执行普通 `reopen`。先声明项目级
业务红线，再创建 Material Change Request：

```bash
# absolute 不允许例外
sovei governance redline add AUTH_REQUIRED \
  --title "Protected actions require authentication" \
  --rule "All purchase and account mutations require authenticated identity" \
  --enforcement absolute

# approval-required 允许有外部审批证据的例外
sovei governance redline add BILLING_CONTRACT \
  --title "Billing contract changes require approval" \
  --rule "Price, renewal, refund, and entitlement semantics require business approval" \
  --enforcement approval-required

sovei governance redline list

# target 是最早失效的阶段；商业方向或红线变化至少回到 grill
sovei workflow change 001-my-feature \
  --target grill \
  --summary "Replace one-time purchase with subscription" \
  --reason "The approved business model changed" \
  --dimensions "business-direction,business-redline,acceptance-or-api-contract"
```

命令会生成 `specs/<feature>/change-requests/CHG-*.json`。应用前必须填写：

- `affectedSurfaces`：业务、接口、权限、计费、数据及兼容面。
- `changeDimensions`：决定最晚允许回退的阶段，防止重大变化被伪装成实现细节。
- `supersedes`：除标准阶段产物外，还需要失效的 Feature 文件。
- `authorizedBy`、`authorizedAt`、`authorizationReference`：重大变更授权证据。
- 每条 active redline 的 `disposition`、`rationale` 和必要 evidence。

创建 draft 后普通 stage、task complete 和 reopen 会被冻结，防止 AI 在审查期间继续引用旧需求。
如果方向变化被撤回，必须显式取消并记录原因：

```bash
sovei workflow cancel-change 001-my-feature CHG-1234567890 \
  --reason "Product retained the original direction"
```

完成审查后应用：

```bash
sovei workflow apply-change 001-my-feature CHG-1234567890
```

应用时 CLI 会执行以下门禁：

- 没有 active 红线时默认阻断，而不是假设“没有风险”。
- 业务方向/红线至少回到 `grill`，用户行为/API 契约回到 `spec`，影响面回到
  `scope`，技术设计回到 `plan`；CLI 拒绝过晚的 target。
- `absolute` 红线不能使用 exception；`approval-required` 例外必须有审批人、时间和引用。
- Change Request 绑定创建时的事件基线；期间工作流发生变化后必须重新创建审查单。
- 从 `targetStage` 开始的旧产物会移动到 `history/revision-*/change-*/`，当前目录重新生成。
- 阶段 Prompt 明确 `history/` 只用于显式差异分析，不能作为当前需求来源。

停用红线也必须保留原因，并追加治理审计事件：

```bash
sovei governance redline deactivate BILLING_CONTRACT --reason "Contract retired by policy GOV-2026-04"
```

## 知识管理

知识有类型化 schema 和生命周期管理：

```bash
# 添加知识
sovei knowledge add --type pitfall --title "..." --content "..." --feature 001-my-feature --tags "vue,events"

# 查看知识
sovei knowledge list
sovei knowledge list --type rule --lifecycle stable

# 晋级知识（candidate → pending → stable）
sovei knowledge promote <id> --feature <feature> --description "证据描述"

# 搜索
sovei knowledge query "内存泄漏"

# 统计
sovei knowledge stats
```

### 知识生命周期

```
candidate (单次观察) → pending (2+ 次验证) → stable (3+ 次验证，人工确认)
```

单次观察永远不会直接晋级到 stable。

## 演进式架构治理

早期代码允许保持简单，随着持续迭代再根据实际压力治理。Sovei 不使用
“超过 2000 行就强制拆分”的单一规则，而是联合判断：

- 文件和函数体积
- 分支复杂度
- Git 90 天变更频率
- 模块扇入、扇出和循环依赖
- UI、API、状态、路由、事件、校验、持久化等职责混杂

单纯体积大只能进入 `watch`。至少两个压力维度叠加后，才会升级为
`refactor-candidate` 或 `refactor-required`。

```bash
# 扫描并保存健康快照
sovei architecture scan --paths src --top 20

# 查看最新热点和已登记技术债
sovei architecture status

# 查看一个模块的信号、依赖和最长函数
sovei architecture inspect src/views/editor/index.vue
sovei architecture inspect ARC-1234ABCD

# 接受为治理事项，只登记，不自动重写代码
sovei architecture accept ARC-1234ABCD \
  --reason "连续多个 Feature 修改且职责继续增长"

# 对稳定生成文件等误报保留决策记录
sovei architecture dismiss ARC-1234ABCD \
  --reason "生成文件，低 churn，不作为手工维护边界"

# CI 适应度检查（实时扫描当前源码，不依赖旧快照）
sovei architecture check --fail-on required
```

支持的治理策略：

- `extract-module`：提取纯函数、类型、API adapter 等低风险职责。
- `branch-by-abstraction`：高扇入或循环依赖时先建立抽象兼容层。
- `expand-migrate-contract`：高 churn、多职责模块分批扩展、迁移、收口。
- `stabilize-with-tests`：边界不清时先补行为基线，再决定拆分。

架构数据保存在 `sovei-flow/project/architecture/`：策略、当前快照、趋势历史和
债务登记相互分离。`scope`、`converge`、`learn` 会使用这些信号，但原有
13 阶段工作流保持不变。

## 目录结构

```
sovei/
├── packages/sovei-core/          # TypeScript 引擎包
│   ├── src/
│   │   ├── engine/               # 状态机 + 事件存储
│   │   ├── stages/               # 13 个阶段插件
│   │   ├── architecture/         # 架构健康分析 + 债务登记
│   │   ├── knowledge/            # 知识仓库 (Redux store)
│   │   ├── providers/            # DI 容器
│   │   ├── storage/              # 存储后端
│   │   ├── artifacts/            # Artifact 仓库
│   │   ├── config/               # 配置
│   │   └── cli/                  # CLI 命令（含 version-check 版本提示）
│   └── test/                     # 测试
├── sovei-flow/                   # 项目工作流层（init 产物，换项目清空重填）
│   ├── agents/                   # 工作流阶段 agent 指令模板
│   ├── project/                  # 料（换项目清空重填）
│   │   ├── project.config.json   # 项目声明
│   │   ├── knowledge/            # 类型化知识 (JSON)
│   │   ├── architecture/         # 健康策略、快照、历史、债务
│   │   ├── codegraph/            # 代码地图
│   │   └── rules/                # 规则库
│   ├── skills/                   # Skill 配置（map + lock）
│   │   └── base/                 # 预置技能基座（vue2/vue3/react/cli/python/quant）
│   └── vendor/                   # 第三方 Skill 源文件
├── specs/                        # Feature 实例
└── design-docs/                  # 架构设计文档
```

## 架构设计

详细架构设计见 [design-docs/](design-docs/)。

## 技术栈

- **运行时**：Node.js >= 14.18
- **语言**：TypeScript 7.x
- **依赖**：commander (CLI)、zod (schema 验证)、yaml (配置解析)
- **发布产物零运行时依赖**（dependencies 为空，单文件 `sovei.cjs`）
- **无 Python、无 PowerShell 依赖**（发版脚本除外）

## 发布 Sovei CLI

发布脚本位于仓库根目录 `release-sovei.ps1`。它会检查 npm 身份、远端版本、
Git 工作区、类型检查、完整测试和 tarball 白名单，正式发布前再交互读取 6 位 OTP。
OTP 不会写入文件。

发布包只包含压缩混淆后的 `dist/release/sovei.js`、包声明和说明文件；不发布
source map、TypeScript 源码、声明映射或内部模块目录。混淆用于提高逆向成本，
不等同于密码学加密，密钥和必须保密的业务算法仍不得放入本地 CLI。

```powershell
# 仅预检，不发布、不需要 OTP
pnpm run release:sovei:check

# 正式发布 package.json 中的当前版本，默认使用 next 标签
pnpm run release:sovei

# 可选：明确校验预期版本
.\release-sovei.ps1 -ExpectedVersion 2.1.0-dev.2
```

默认禁止从存在未提交变更的工作区发布。紧急情况下可以显式运行
`.\release-sovei.ps1 -AllowDirty`，但正常流程应先审查并提交本次版本变更。
发布脚本属于仓库维护工具；已发布的 Sovei CLI 运行时仍不依赖 PowerShell。

## 许可

MIT License — 详见 [LICENSE.md](packages/sovei-core/LICENSE.md)。
