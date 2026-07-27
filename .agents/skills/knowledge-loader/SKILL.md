---
name: "knowledge-loader"
description: "Loads project Memory, Code Map, and spec-harness rules before working on requirements, bugs, architecture discussions, or cross-folder tasks. Invoke when starting tasks, switching work folders, or user says Memory/Code Map/rules."
---

# Knowledge Loader

Use this skill to load the project's shared knowledge before working on requirements, bugs, architecture discussions, or cross-folder tasks.

## When To Invoke

Invoke this skill when:

- Starting a task in this repository.
- User says "读 Memory", "读 Code Map", "读规则", "加载知识", or "按 Harness".
- Task involves bug fix, architecture discussion, technical decision, or current feature.
- You need to update Memory, Code Map, rules, or skills.

## Load Order

先解析 `<harness-root>`：中枢仓库存在 `harness/index.md` 时使用 `harness/`；产品工程存在 `.specify/index.md` 时使用 `.specify/`；产品工程同时存在两者时优先 `.specify/`。

### Step 1: Read indexes

1. Read `<harness-root>/index.md` — Harness 总入口，了解壳料分离结构和开发 Loop。
2. Read `<harness-root>/project.yaml` — 当前项目声明(项目名、技术栈、料文件清单)。换项目时这是第一个要改的文件。
3. Read `<harness-root>/project/memory/MEMORY.md` — 知识索引，了解可用文件。

### Step 2: Load core knowledge (by task type)

| Task type | Load file | Purpose |
|-----------|-----------|---------|
| Any task | `<harness-root>/project/memory/user-preferences.md` | 编码偏好 |
| Any task | `<harness-root>/project/memory/constitution.md` | 核心开发原则（完整版） |
| Bug fix | `<harness-root>/project/memory/vue-pitfalls.md` | Vue 踩坑库 |
| Architecture | `<harness-root>/project/memory/project-architecture.md` | 项目架构 |
| Technical decision | `<harness-root>/project/memory/design-decisions.md` | ADR 决策记录 |
| Design/Figma | `<harness-root>/project/memory/design-tools.md` + `<harness-root>/project/memory/figma-config.md` | 设计工具配置 |

### Step 3: Load rules (for implementation tasks)

| File | Purpose |
|------|---------|
| `<harness-root>/project/rules/implementation-rules.md` | Stable 规则（已验证，开发前必读） |
| `<harness-root>/project/rules/pending-rules.md` | 候选规则池（观察中） |
| `<harness-root>/spec-harness/failure-taxonomy.md` | 失败分类（F1-F8） |
| `<harness-root>/project/rules/rejected-patterns.md` | 已拒绝的模式 |
| `<harness-root>/spec-harness/memory-audit-checklist.md` | 记忆审计清单（5 维度定期检查） |

### Step 4: Load code map (by task domain)

| Task domain | Load file |
|-------------|-----------|
| 近期工作 / 首页改版 / 自由画布 | `<harness-root>/project/codegraph/recent-work-code-map.md` |
| 自由画布详情 | `<harness-root>/project/codegraph/board-code-map.md` |
| 画布视频 | `<harness-root>/project/codegraph/board-video-code-map.md` |
| 不确定时 | `<harness-root>/project/codegraph/index.md`（索引） |

## Keyword Triggers

| Keywords in user task | Priority load |
|----------------------|---------------|
| 首页、Header、搜索框、更新日志、通知 | `project/codegraph/recent-work-code-map.md#首页改版入口` |
| 自由画布、画板、局部修改、重绘、扩图 | `project/codegraph/recent-work-code-map.md#自由画布入口` + `project/codegraph/board-code-map.md` |
| 视频、Seedance、图生视频、文生视频 | `project/codegraph/board-video-code-map.md` + `project/rules/implementation-rules.md` |
| 上传、资源、素材、图片生成回填 | `project/memory/project-architecture.md#资源上传模块` |
| Bug、报错、异常、调试 | `project/memory/vue-pitfalls.md` + `workflows/systematic-debugging.md` |
| 架构、拆分、模块化、注册表 | `project/memory/constitution.md` + `project/memory/project-architecture.md` |
| 决策、为什么这么做、ADR | `project/memory/design-decisions.md` |
| 记忆审计、知识库检查、清理过时 | `spec-harness/memory-audit-checklist.md` |

## Weak Model Fallback

If unsure what to load, read these 3 files (~20KB total):

1. `<harness-root>/project/memory/user-preferences.md`
2. `<harness-root>/project/memory/vue-pitfalls.md`
3. `<harness-root>/project/memory/project-architecture.md`

宁可多读，不要漏读。

## Knowledge Update Targets

| Knowledge type | File |
|----------------|------|
| User preference | `<harness-root>/project/memory/user-preferences.md` |
| Vue pitfall | `<harness-root>/project/memory/vue-pitfalls.md` |
| Project structure | `<harness-root>/project/memory/project-architecture.md` |
| Technical decision (ADR) | `<harness-root>/project/memory/design-decisions.md` |
| Stable implementation rule | `<harness-root>/project/rules/implementation-rules.md` |
| Pending rule (observation) | `<harness-root>/project/rules/pending-rules.md` |
| Rejected pattern | `<harness-root>/project/rules/rejected-patterns.md` |
| Memory audit | `<harness-root>/spec-harness/memory-audit-checklist.md` |
| Debugging SOP | `<harness-root>/workflows/systematic-debugging.md` |
| Code map update | `<harness-root>/project/codegraph/recent-work-code-map.md` |

## Output Behavior

After loading knowledge, briefly mention which knowledge sources were used and continue with the user's task. Do not produce a long summary unless the user asks for one.
