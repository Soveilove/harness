# Pino Front 中央 Harness

> 这是 Pino 前端 A/B/C 多工程共用的 merge 中转站 Harness。
> 所有关于"如何开发这个项目"的收敛知识都放在 `.specify/` 下，
> 与 `AGENTS.md` / `CLAUDE.md` 等通用 IDE 配置分离。
>
> 这个 Harness 是持续进化的：每次开发都是一次 feedback loop，
> 偏差和经验会沉淀到规则库，下次写 spec 时注入规则，减少多轮返工。

## 当前 Feature 指针

- 见 `.specify/feature.json`
- 当前：`specs/111-asset-marquee-area`

## 三层结构

| 层 | 目录/文件 | 回答的问题 |
|---|---|---|
| **业务语义层** | `.specify/memory/business-map.md` | 当前系统有哪些业务能力？每个能力的边界、约束、易错点、spec 来源是什么？ |
| **代码结构层** | `.specify/codegraph/` | 代码在哪？链路怎么走？改某个模块前按什么顺序读？ |
| **长期记忆层** | `.specify/memory/` | 项目宪法、架构决策（ADR）、技术架构、踩坑记录、用户偏好 |
| **规则库层** | `.specify/spec-harness/` | 通用实现规则、候选规则池、失败模式、失败分类 |
| **执行技能层** | `.specify/skills/` | 可复用的检查清单与执行流程（如新增画布面板、视频模块） |

## 开发 Loop（自我进化）

```text
发现需求
  ↓
读 .specify/memory/business-map.md 定位能力条目
  ↓
读 .specify/spec-harness/implementation-rules.md + 业务域检查清单
  ↓
生成 specs/<feature>/spec.md → plan.md → tasks.md
  ↓
按 tasks.md 实现
  ↓
spec-review：实现是否匹配 spec？是否违反规则库？
  ↓
发现偏差/缺陷
  ↓
提炼规则：
  ├─ 通用规则 → spec-harness/implementation-rules.md
  ├─ 业务域规则 → memory/business-domain-checklists/<域>.md
  ├─ 某能力规则 → memory/business-map.md 对应条目
  └─ 还不确定 → spec-harness/pending-rules.md（观察池）
  ↓
积累 ≥5 条候选规则或每月触发一次 spec-retrospective
  ↓
合并重复规则、淘汰误报规则、升级通用原则
  ↓
下次写 spec 时，AI 先读规则库 → 生成更准确的 spec/plan/tasks
```

## 使用顺序速查

| 场景 | 先读 | 再读 | 最后 |
|---|---|---|---|
| 接手某模块 | `memory/business-map.md` 对应条目 | `codegraph/` 对应地图 | `specs/<feature>/spec.md` |
| 写新需求 spec | `memory/business-map.md` 相关条目 | `spec-harness/implementation-rules.md` | 业务域 checklist |
| 改自由画布 | `codegraph/recent-work-code-map.md` | `codegraph/board-code-map.md`（必要时） | `skills/canvas-video-panel/`（视频相关） |
| 改自由画布视频 | `memory/business-map.md` 自由画布视频条目 | `codegraph/board-video-code-map.md` | `skills/canvas-video-panel/SKILL.md` |
| 出现返工/缺陷 | 对应 spec 和代码 | `spec-harness/rejected-patterns.md` 查历史 | 把新规则写入规则库 |

## 跨工程同步（ABC 三个工程 → E 盘中央 Harness → 分发回项目）

- **中央 Harness 在 E 盘**：作为多个项目实例的"源 of truth"。
- **项目工程只保留当前项目相关的实例化内容**。
- **同步方向**：
  1. 在项目工程中开发 → 偏差/规则/地图更新沉淀到项目 `.specify/`。
  2. 定期把项目 `.specify/` 的改进 merge 到 E 盘中央 Harness。
  3. 从 E 盘中央 Harness 把通用规则、新技能、新地图分发回其他项目工程（ABC 等）。
- **项目相关 vs 通用**：
  - 通用（`constitution.md`、`design-decisions.md` 中通用 ADR、`skills/` 通用检查清单）→ 放中央 Harness，分发所有项目。
  - 项目特定（`project-architecture.md` 中的具体路径、`codegraph/`、`business-map.md` 中本项目能力）→ 留在项目工程，可从中提炼通用规则再升级。

## 目录速览

```text
.specify/
├── index.md                      # 本文件：Harness 总入口
├── feature.json                  # 当前 feature 指针
├── memory/                       # 长期记忆
│   ├── constitution.md           # 项目宪法
│   ├── design-decisions.md       # ADR 架构决策记录
│   ├── project-architecture.md   # 技术架构与目录约定
│   ├── business-map.md           # 业务能力地图（规则库主载体）
│   ├── business-domain-checklists/ # 业务域检查清单
│   ├── vue-pitfalls.md           # Vue 踩坑记录
│   ├── user-preferences.md       # 用户编码偏好
│   └── canvas-*.md               # 特定模块记忆
├── codegraph/                    # 代码地图
│   ├── index.md
│   ├── recent-work-code-map.md
│   ├── board-code-map.md
│   └── board-video-code-map.md
├── spec-harness/                 # 开发 Harness 规则库
│   ├── implementation-rules.md   # 正式通用规则库
│   ├── pending-rules.md          # 候选规则池
│   ├── rejected-patterns.md      # 失败模式/负反馈
│   └── failure-taxonomy.md       # 失败分类（T1-T7 等）
└── skills/                       # 可执行技能
    ├── add-canvas-module-panel/
    └── canvas-video-panel/
```
