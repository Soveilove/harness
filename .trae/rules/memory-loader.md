# Memory 加载规则

> 双层记忆架构：先加载个人通用层（中枢），再加载项目特有层
> 三套 IDE（Trae / Claude / CodeBuddy）共用此规则，内容保持一致。

## 启动时加载

每次会话开始时，按以下顺序加载：

### 第一步：个人层（中枢，跨项目通用）

读取 `E:\memory\MEMORY.md` 了解可用的个人通用记忆。

> 注意：由于各 IDE 可能无法跨盘读取，项目 `.specify/memory/` 下保留了这些文件的副本。
> 如果 `E:\memory\` 可读则读中枢源；不可读则读项目副本。两者内容应保持一致。

根据任务类型按需加载：

| 任务类型 | 加载文件 | 用途 |
|---------|---------|------|
| 任何任务 | user-preferences.md | 了解用户编码偏好 |
| 开发任务 | constitution.md | 遵循核心开发原则 |
| Bug 修复 | vue-pitfalls.md | 避免已知问题 |
| 设计稿相关 | design-tools.md + figma-config.md | 使用正确工具 |

### 第二步：项目层（项目特有）

读取 `.specify/memory/MEMORY.md` 了解可用的项目记忆。

同时读取 `.specify/feature.json` 判断当前活跃 feature；如果任务涉及当前 feature、首页改版或自由画布，优先读取 `.codegraph/recent-work-code-map.md`。

如果用户说明已从其它工作目录同步 Code Map，或任务涉及多个独立分支文件夹，以当前工作目录中 `.codegraph/recent-work-code-map.md` 顶部 `Code Map 版本` 为准；需要同步流程时读取 `requirements-analysis/MULTI_WORKSPACE_KNOWLEDGE_SYNC.md`。

## 上下文注入规则

根据用户任务中的关键词和当前文件位置，按需加载最小必要上下文。优先读取入口文件，再沿 Code Map 指定链路继续展开，不要一次性读取全仓库。

| 触发条件 | 优先加载 | 继续展开 |
|---------|---------|---------|
| 首页、Header、搜索框、更新日志、通知、响应式 | `.codegraph/recent-work-code-map.md#首页改版入口` | `specs/001-home-responsive-header/`、`src/Layout/Header.vue`、相关 composables |
| 自由画布、画板、局部修改、重绘、扩图、选中图片工具 | `.codegraph/recent-work-code-map.md#自由画布入口` + `.codegraph/board-code-map.md` | `src/views/workspace/board/detail/`、`ImageContextToolbar/`、相关 hooks/store |
| 上传、资源、素材、图片生成回填 | `.specify/memory/project-architecture.md#资源上传模块` + `.codegraph/recent-work-code-map.md` | `useAssetUpload`、board task listener、asset/service 调用链 |
| 当前 Speckit feature、正式需求、spec、plan、tasks | `.specify/feature.json` + 项目 rules 中的 SPECKIT 部分 | 对应 `specs/<feature>/spec.md`、`plan.md`、`tasks.md`、`quickstart.md` |
| Bug、报错、异常、调试、修复 | `vue-pitfalls.md` + `.specify/memory/project-architecture.md` | Code Map 中对应模块入口、相关组件和 service |
| 架构、拆分、模块化、注册表、策略模式 | `constitution.md` + `.specify/memory/project-architecture.md` | `CLAUDE.md`、相关模块的 `index.ts/types.ts/service.ts` |
| 跨目录、同步、Code Map 版本、多个 IDE | `requirements-analysis/MULTI_WORKSPACE_KNOWLEDGE_SYNC.md` | 当前目录 `.codegraph/recent-work-code-map.md` 顶部同步信息 |

执行顺序：

1. 先判断任务类型和关键词。
2. 读取个人层 Memory 的核心文件。
3. 读取项目层 Memory 索引和核心约束。
4. 按上表读取最相关的 Code Map 小节或 spec 文件。
5. 再搜索或读取具体代码文件。
6. 如果发现新的稳定入口、链路或踩坑，更新对应层级的 Memory / Code Map。

## 弱模型兜底：不确定时直接预加载

如果不确定当前任务类型，或不确定该读哪些 Memory，直接读取以下 3 个文件（总约 20KB）：

1. `.specify/memory/user-preferences.md`
2. `.specify/memory/vue-pitfalls.md`
3. `.specify/memory/project-architecture.md`

宁可多读，不要漏读。

## 按需加载

### 个人层（E:\memory\ 或 .specify/memory/ 副本）

| 任务类型 | 加载文件 | 用途 |
|---------|---------|------|
| 任何任务 | user-preferences.md | 了解用户编码偏好 |
| 任何任务 | constitution.md | 遵循核心原则 |
| Bug 修复 | vue-pitfalls.md | 避免已知问题 |
| 设计稿相关 | design-tools.md + figma-config.md | 使用正确工具 |

### 项目层（.specify/memory/）

| 任务类型 | 加载文件 | 用途 |
|---------|---------|------|
| 架构讨论 | project-architecture.md | 了解项目结构和模块 |
| 技术决策 | design-decisions.md | 遵循已有决策 |
| 自由画布生成按钮 | canvas-generate-button-reuse.md | 复用 GenerateButton 组件 |

## 更新 Memory

### 知识类型判断

| 知识类型 | 存储位置 | 文件 |
|---------|---------|------|
| 用户偏好/习惯 | 个人层 | `user-preferences.md` |
| Vue 通用踩坑 | 个人层 | `vue-pitfalls.md` |
| 核心开发原则 | 个人层 | `constitution.md` |
| 项目架构/模块 | 项目层 | `project-architecture.md` |
| 项目技术决策 | 项目层 | `design-decisions.md` |
| 项目特有踩坑 | 项目层 | `vue-pitfalls.md`（追加，或单独文件） |

### 同步规则

由于 IDE 根路径限制，通用文件在中枢（`E:\memory\`）和项目层（`.specify/memory/`）各存一份。
修改任意一边后，需要手动同步到另一边（说「同步记忆」即可触发）。

项目特有文件（project-architecture.md、design-decisions.md 等）不需要同步，各项目独立维护。

### 提升规则

当项目层的知识在多个项目中复用时，提升到个人层：
1. 将内容添加到 `E:\memory\` 对应文件
2. 在项目层副本中同步更新（或改为引用个人层）
3. 更新 MEMORY.md 索引

## Memory 写作规范

每个 Memory 条目应包含：

```markdown
## [知识标题]

**问题/偏好**: [描述]

**Why**: [原因解释]

**How to apply**: [如何应用]

**Related**: [[相关-memory-文件名]]
```

---

**版本**: 3.1.0
**创建日期**: 2026-06-10
**更新日期**: 2026-06-23 — 统一三套 IDE loader + 弱模型兜底预加载
