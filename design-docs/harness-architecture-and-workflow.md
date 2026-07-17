# Harness 完整架构与工作流

> 日期：2026-07-16
> 目的：梳理当前 Harness 在 CodeBuddy IDE 中的完整架构、工作流、已知问题、调整建议

---

## 一、当前完整架构

### 1.1 物理文件结构

```
E:\memory\ (中枢层 — 唯一源)
│
├── 中枢知识文件
│   ├── MEMORY.md                    ← 中枢索引入口
│   ├── constitution.md              ← 开发宪法（8 条核心原则）
│   ├── user-preferences.md          ← 编码偏好（10 条）
│   ├── vue-pitfalls.md              ← Vue 踩坑库（12+ 条，含完整根因分析）
│   ├── design-decisions.md          ← 技术决策（ADR）
│   ├── design-tools.md              ← 设计工具配置
│   ├── figma-config.md              ← Figma MCP 配置
│   ├── project-architecture.md      ← 项目架构
│   ├── canvas-generate-button-reuse.md   ← 功能复用记录
│   ├── canvas-share-detail-modal.md      ← 业务坑点记录
│   └── image-details-loading-optimization.md  ← 性能优化记录
│
├── harness/ (完整 Harness — 分发到项目的完整包)
│   ├── memory/                      ← 知识层（同上 13 个 md 副本）
│   │   └── skills/                  ← Skill 定义
│   ├── spec-harness/                ← 规则层
│   │   ├── implementation-rules.md  ← Stable 规则（已验证，开发前必读）
│   │   ├── pending-rules.md         ← 候选规则池（观察中，≥3 次命中后毕业）
│   │   ├── failure-taxonomy.md      ← 失败分类（F1-F8）
│   │   └── rejected-patterns.md     ← 已拒绝的模式
│   ├── codegraph/                   ← 代码地图层
│   │   ├── index.md                 ← 代码地图索引
│   │   ├── recent-work-code-map.md  ← 近期工作导航
│   │   ├── board-code-map.md        ← 自由画布代码地图
│   │   └── board-video-code-map.md  ← 视频画布代码地图
│   ├── templates/                   ← 模板层
│   │   ├── spec-template.md
│   │   ├── plan-template.md
│   │   ├── tasks-template.md
│   │   ├── checklist-template.md
│   │   └── constitution-template.md
│   ├── extensions/                  ← 扩展层（17 文件）
│   ├── scripts/                     ← 脚本层（10 文件）
│   ├── workflows/                   ← 工作流定义
│   └── integrations/               ← 集成配置
│
├── design-docs/                     ← 设计文档（不分发）
│   ├── CROSS_IDE_MEMORY_SOLUTION.md
│   └── SDD-MEMORY-INTEGRATION.md
│
├── .codebuddy/                      ← CodeBuddy IDE 适配层
│   ├── rules/
│   │   └── memory-loader.md         ← ⚠️ 纯 .md，非 RULE.mdc 格式
│   ├── skills/
│   │   └── knowledge-loader/
│   │       └── SKILL.md             ← ✅ 正确的 Skill 格式
│   └── memory/                      ← Working Memory
│       ├── MEMORY.md                ← 长期记忆
│       └── 2026-07-15.md            ← 每日日志
│
├── QUICKSTART.md                    ← 快速操作指引
├── SYNC.md                          ← 同步操作手册
└── README.md                        ← 体系说明

项目层 (A/B/C 工程各自一份)
<项目>/
├── .specify/
│   ├── memory/                      ← 中枢全量副本
│   ├── spec-harness/                ← 规则层副本
│   ├── codegraph/                   ← 代码地图副本
│   ├── templates/                   ← 模板副本
│   ├── feature.json                 ← 实例状态（各项目不同）
│   └── index.md                     ← 项目索引
├── specs/                           ← 需求目录（实例状态）
├── .codebuddy/
│   ├── rules/
│   │   ├── memory-loader.md         ← 副本
│   │   └── project_rules.md         ← 弱模型强制规则（不上 git）
│   └── skills/
│       └── knowledge-loader/
│           └── SKILL.md             ← 副本
└── .codegraph/                      ← 代码地图副本
```

### 1.2 逻辑分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        中枢层 (E:\memory\)                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  知识层       │  │  规则层       │  │  导航层                 │ │
│  │  memory/      │  │  spec-harness/│  │  codegraph/            │ │
│  │               │  │               │  │                        │ │
│  │ · 宪法        │  │ · stable 规则 │  │ · 近期工作地图          │ │
│  │ · 偏好        │  │ · pending 规则│  │ · 画布代码地图          │ │
│  │ · 踩坑库      │  │ · 失败分类    │  │ · 视频代码地图          │ │
│  │ · 决策记录    │  │ · 拒绝模式    │  │ · 代码地图索引          │ │
│  │ · 架构        │  │               │  │                        │ │
│  │ · 功能坑点    │  │               │  │                        │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘ │
│         │                 │                      │               │
│         └─────────────────┼──────────────────────┘               │
│                           │                                      │
│                    全量合并 / 分发                                 │
│                           │                                      │
├───────────────────────────┼──────────────────────────────────────┤
│                           ▼                                      │
│                    项目层 (A/B/C)                                 │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    CodeBuddy IDE 适配                        │ │
│  │                                                              │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐ │ │
│  │  │ Rules       │  │ Skills      │  │ Working Memory       │ │ │
│  │  │             │  │             │  │                      │ │ │
│  │  │ 强制加载     │  │ 按需触发     │  │ 自动注入              │ │ │
│  │  │ (alwaysApply)│  │ (description)│  │ (.codebuddy/memory/) │ │ │
│  │  │             │  │             │  │                      │ │ │
│  │  │ ⚠️ 当前是   │  │ ✅ 正确     │  │ ✅ 正确               │ │ │
│  │  │ 纯 .md 非   │  │ knowledge-  │  │ MEMORY.md            │ │ │
│  │  │ RULE.mdc    │  │ loader      │  │ YYYY-MM-DD.md        │ │ │
│  │  └─────────────┘  └─────────────┘  └──────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 三层 CodeBuddy 机制映射

| CodeBuddy 机制 | 加载方式 | 你的 Harness 对应 | 当前状态 | 理想状态 |
|---------------|---------|------------------|---------|---------|
| **Rules (alwaysApply: true)** | 每次会话强制加载原文 | `memory-loader.md`（纯 .md） | ⚠️ 非 RULE.mdc 格式，可能被当建议性 | 转为 RULE.mdc，放核心红线 |
| **Rules (alwaysApply: false)** | AI 判断后按需读取 | 无 | — | 放扩展规则、失败分类 |
| **Skills** | description 触发，三级加载 | `knowledge-loader/SKILL.md` | ✅ 格式正确 | 补 references/ 目录 |
| **Working Memory** | 自动注入 | `.codebuddy/memory/` | ✅ 正确 | 保持现状 |

---

## 二、完整工作流

### 2.1 会话启动流程

```
用户打开 CodeBuddy，开始新会话
         │
         ▼
┌─────────────────────────────────────┐
│  第一层：Rules 强制加载（如果有）      │
│  alwaysApply: true 的 RULE.mdc       │
│  → 开发宪法 8 条 + 编码偏好 5 条       │
│  → AI 知道"什么必须做 / 什么不能碰"     │
│  ⚠️ 当前缺失：memory-loader.md 非 mdc │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│  第二层：Working Memory 自动注入       │
│  .codebuddy/memory/MEMORY.md         │
│  .codebuddy/memory/YYYY-MM-DD.md     │
│  → AI 拿到跨会话上下文                 │
│  ✅ 当前正常                          │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│  第三层：Skill 元数据始终在上下文       │
│  knowledge-loader 的 YAML description │
│  (~100 词，几乎不占空间)              │
│  → AI 知道"有知识库可以加载"           │
│  ✅ 当前正常                          │
└──────────────────┬──────────────────┘
                   │
                   ▼
              用户提任务
```

### 2.2 任务执行流程

```
用户："修复自由画布局部修改的光标隐藏问题"
         │
         ▼
┌──────────────────────────────────────────────────┐
│  Step 1: AI 判断任务类型                           │
│  关键词匹配：自由画布、局部修改、光标               │
│  → 触发 knowledge-loader Skill                    │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│  Step 2: 加载 Skill 指令（第二级）                  │
│  读取 SKILL.md 的 Load Order                      │
│  → 1. 读 .specify/memory/MEMORY.md（索引）         │
│  → 2. 读 constitution.md（核心原则）               │
│  → 3. 读 vue-pitfalls.md（Bug 修复 → 踩坑库）      │
│  → 4. 读 .codegraph/recent-work-code-map.md       │
│     （涉及自由画布 → 代码地图）                     │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│  Step 3: 精确匹配踩坑记录                          │
│  vue-pitfalls.md 中找到：                         │
│  "局部修改隐藏系统光标必须同步设置 fabric.defaultCursor" │
│  → 拿到根因 + 解决方案 + 对应代码文件              │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│  Step 4: 在约束范围内写代码                        │
│  AI 已拿到：                                      │
│  · 宪法约束（显式优于隐式、模块化扩展）             │
│  · 编码偏好（Props 内联、中文注释、Git Bash）       │
│  · 踩坑解决方案（同步设 defaultCursor）            │
│  · 代码地图（相关文件路径）                        │
│  → 生成符合约束的代码                              │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│  Step 5: 人审                                     │
│  审查者检查：                                      │
│  · AI 是否遵守了踩坑记录的解决方案？               │
│  · 是否违反宪法原则？                              │
│  · 是否用了 Git Bash 语法？                        │
│  → 10 分钟，不需要逐行读代码                      │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│  Step 6: 知识更新（如果有新发现）                   │
│  · 新坑点 → 追加到 vue-pitfalls.md                │
│  · 新决策 → 追加到 design-decisions.md            │
│  · 新规则 → 先进 pending-rules.md，验证后毕业       │
│  · 新代码路径 → 更新 codegraph/                   │
│  → 写回 .specify/memory/ 或 codegraph/            │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│  Step 7: 同步到中枢（手动触发）                     │
│  用户："同步记忆到 E:\memory"                      │
│  → 合并项目层新内容到中枢                          │
│  → 再分发到其他项目                                │
└──────────────────────────────────────────────────┘
```

### 2.3 知识生命周期

```
                     发现新约束/坑点
                          │
                          ▼
                   ┌──────────────┐
                   │ pending-rules │  观察 1-2 次
                   │ (候选池)      │  不确定是否通用
                   └──────┬───────┘
                          │ 命中 ≥3 次
                          │ 无误报
                          ▼
                   ┌──────────────┐
                   │ implementation│  已验证，开发前必读
                   │ -rules.md     │  AI 必须遵守
                   │ (stable)      │
                   └──────┬───────┘
                          │ 规则过时
                          ▼
                   ┌──────────────┐
                   │ rejected-     │  已废弃，记录原因
                   │ patterns.md   │  防止重新提出
                   └──────────────┘

并行路径（踩坑记录）:
                     踩坑
                       │
                       ▼
               vue-pitfalls.md (无 resolved 标记)
                       │ 问题已修复且不再出现
                       ▼
               标记 resolved（当前缺失此机制 ⚠️）
```

---

## 三、已知问题与实践痛点

### 问题 1：Rules 格式不匹配（P0 — 必须修）

**现状**：`.codebuddy/rules/memory-loader.md` 是纯 Markdown 文件。

**问题**：CodeBuddy 期望的格式是 `.codebuddy/rules/<rule-name>/RULE.mdc`，带 YAML frontmatter：

```markdown
---
description: 规则描述
alwaysApply: true
enabled: true
---
```

**后果**：当前文件可能被当作建议性规则，弱模型会跳过。核心约束没有强制保障。

**修复方案**：

```
.codebuddy/rules/
├── core-constraints/          ← alwaysApply: true（强制）
│   └── RULE.mdc               ← 宪法精要 + 编码红线
├── memory-loader/             ← alwaysApply: false（智能体请求）
│   └── RULE.mdc               ← 知识加载指令（移入此处）
└── project-rules/             ← alwaysApply: true（强制）
    └── RULE.mdc               ← 弱模型规则（当前 project_rules.md）
```

### 问题 2：知识文件分散，Skill 缺少 references 目录（P1）

**现状**：`knowledge-loader` skill 只有 `SKILL.md`，没有 `references/` 目录。知识文件散落在 `.specify/memory/` 各处。

**问题**：CodeBuddy Skills 的三级加载机制中，第三级是 `references/` 按需加载。AI 需要 `read_file` 绝对路径才能读 `.specify/memory/` 下的文件，路径依赖项目结构，不够稳健。

**影响**：
- AI 可能不知道该读哪个文件
- 跨项目时路径可能不一致
- 没有利用 Skill 的打包资源机制

**修复方案**：在 skill 下建 `references/` 目录，放高频知识文件的符号链接或副本：

```
.codebuddy/skills/knowledge-loader/
├── SKILL.md
└── references/
    ├── constitution.md           ← 宪法精要
    ├── vue-pitfalls.md           ← 踩坑库
    ├── design-decisions.md       ← 决策记录
    └── code-map-index.md         ← 代码地图索引
```

### 问题 3：Rules 与 Skills 内容重叠（P1）

**现状**：`memory-loader.md`（Rules）和 `knowledge-loader/SKILL.md`（Skills）内容高度重叠——都描述了"加载什么、按什么顺序加载"。

**问题**：两个地方维护同一套逻辑，容易不同步。且 Rules 是"指令性约束"，Skills 是"能力包"，职责边界不清。

**修复方案**：明确分工：
- **Rules**：只放"必须遵守的约束"（宪法红线、编码偏好），不含加载逻辑
- **Skills**：只放"怎么加载知识"（加载顺序、触发条件、文件映射），不含约束内容

### 问题 4：知识同步是纯手动（P2）

**现状**：用户需要说"同步记忆到 E:\memory"才会触发同步。

**问题**：
- 容易忘记同步，导致各项目知识不一致
- 没有自动检测机制发现不一致

**当前缓解**：更新不频繁，人工同步即可（QUICKSTART.md 已说明）

**如果需要改进**：
- 用 CodeBuddy Automations 定时提醒同步（如每天下班前）
- 或写一个简单的 hash 对比脚本检测不一致

### 问题 5：踩坑记录无 resolved 机制（P2）

**现状**：`vue-pitfalls.md` 中的坑点没有 resolved/unresolved 标记。

**问题**：已修复的坑点和新坑点混在一起，AI 会把过时信息当约束。文件会越来越长。

**修复方案**：每个坑点加状态标记：

```markdown
## [RESOLVED] defineProps 外部类型导入问题
**状态**: resolved (2026-06-09)
...

## [ACTIVE] RecycleScroller 滚动加载陷阱
**状态**: active
...
```

### 问题 6：pending-rules 是空的（P2）

**现状**：`pending-rules.md` 只有模板，没有实际候选规则。

**问题**：规则生命周期没有运转起来。新发现的约束直接进 `vue-pitfalls.md` 或 `implementation-rules.md`，缺少观察期。

**修复方案**：下次发现新约束时，先进 `pending-rules.md` 标记观察次数，验证 3 次后再毕业。

### 问题 7：跨 IDE 一致性维护成本（P3）

**现状**：三套 IDE（Trae / Claude Code / CodeBuddy）各有 loader 副本，内容需手动保持一致。

**问题**：改一个要改三处，容易遗漏。

**当前缓解**：以 Trae 版为骨架，统一版本号。

**如果需要改进**：考虑用脚本从中枢自动生成三套副本。

### 问题 8：知识量增长后的上下文压力（P3）

**现状**：`vue-pitfalls.md` 已 566 行，且还在增长。

**问题**：AI 一次性读取全量踩坑库会占用大量上下文窗口。

**当前缓解**：memory-loader.md 有按任务类型加载的表格，不是全量加载。

**如果需要改进**：
- 按域拆分踩坑库（如 `pitfalls-canvas.md`、`pitfalls-video.md`、`pitfalls-css.md`）
- 或利用 Skill references 的按需加载，AI 只读相关条目

---

## 四、优先级排序与调整建议

| 优先级 | 问题 | 修复动作 | 工作量 | 效果 |
|--------|------|---------|--------|------|
| **P0** | Rules 格式不匹配 | `memory-loader.md` → `RULE.mdc` 格式 + 拆分强制/建议 | 1 小时 | 核心约束从"建议"变"强制" |
| **P0** | Rules 与 Skills 职责重叠 | Rules 只放约束，Skills 只放加载逻辑 | 30 分钟 | 消除维护双份的负担 |
| **P1** | Skill 缺 references | 建 `references/` 目录，放高频知识文件 | 1 小时 | 利用三级加载，减少上下文占用 |
| **P1** | 踩坑库无 resolved 标记 | 给现有坑点加状态标记 | 30 分钟 | 防止过时信息当约束 |
| **P2** | pending-rules 空置 | 下次新约束先进 pending | 0（流程改进） | 规则生命周期跑起来 |
| **P2** | 同步纯手动 | 用 Automations 定时提醒 | 15 分钟 | 减少遗忘风险 |
| **P3** | 跨 IDE 一致性 | 写从中枢生成副本的脚本 | 2 小时 | 消除手动维护三份 |
| **P3** | 知识量增长 | 按域拆分踩坑库 | 1 小时 | 减少单次上下文占用 |

---

## 五、理想架构（调整后）

```
┌─────────────────────────────────────────────────────────────┐
│                    中枢层 (E:\memory\)                       │
│                                                              │
│  知识层          规则层           导航层          模板层       │
│  memory/        spec-harness/    codegraph/     templates/   │
│  (踩坑/决策/     (stable/pending  (代码地图)      (spec/plan)  │
│   偏好/宪法)     /rejected)                                   │
│                                                              │
│  design-docs/ (不分发)                                      │
└────────────────────────┬────────────────────────────────────┘
                         │ 全量分发
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    项目层 (A/B/C)                            │
│                                                              │
│  .specify/ (Harness 完整副本)                               │
│  ├── memory/          ← 知识                                │
│  ├── spec-harness/    ← 规则                                │
│  ├── codegraph/       ← 导航                                │
│  └── templates/       ← 模板                                │
│                                                              │
│  .codebuddy/ (CodeBuddy 适配)                               │
│  ├── rules/                                                   │
│  │   ├── core-constraints/                                   │
│  │   │   └── RULE.mdc        ← alwaysApply: true             │
│  │   │      (宪法精要 + 编码红线 + 偏好)                      │
│  │   └── project-rules/                                      │
│  │       └── RULE.mdc        ← alwaysApply: true             │
│  │          (弱模型规则: Git Bash / 不跑 vue-tsc)             │
│  │                                                           │
│  ├── skills/                                                 │
│  │   └── knowledge-loader/                                   │
│  │       ├── SKILL.md        ← 加载指令（何时触发/加载顺序）  │
│  │       └── references/     ← 按需加载的知识文件             │
│  │           ├── constitution.md                             │
│  │           ├── vue-pitfalls.md                             │
│  │           ├── design-decisions.md                         │
│  │           └── code-map-index.md                           │
│  │                                                           │
│  └── memory/            ← Working Memory (自动注入)          │
│      ├── MEMORY.md      ← 长期记忆                           │
│      └── YYYY-MM-DD.md  ← 每日日志                           │
│                                                              │
│  specs/ (实例状态，各项目不同)                               │
└─────────────────────────────────────────────────────────────┘

加载时序:
  会话启动 → Rules (强制) → Working Memory (自动) → Skill 元数据 (始终)
  用户提任务 → Skill 触发 → references 按需加载 → AI 写代码 → 人审红线
  新知识 → 写回 .specify/ → 手动同步到中枢 → 分发到其他项目
```

---

## 六、与编排 Agent 的关系

```
当前阶段（轻量知识库）:
  知识库 + 强约束 → AI 在约束内写代码 → 人审红线 → 知识复利

未来演进（如果上编排 Agent）:
  知识库 + 强约束 → 作为编排 Agent 的约束层
  → Agent 自动跑需求→实现→验证
  → 约束层确保 Agent 不漂移
  → 知识库继续沉淀 Agent 产出的新知识

关键: 知识库是编排 Agent 的前置条件，不是替代品。
先有护栏，再谈自动驾驶。
```

---

*创建日期: 2026-07-16*
*用途: Harness 架构审视与调整规划*
