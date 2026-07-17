# 跨 IDE Memory 共享方案

> 解决 Harness Memory 只在 Claude Code 中生效的问题，实现 Trae、CodeBuddy 等 IDE 的知识共享。

## 一、问题分析

### 当前状态

| IDE | Memory 支持 | 存储位置 | 问题 |
|-----|-------------|----------|------|
| Claude Code | ✅ 原生支持 | `~/.claude/projects/<project>/memory/` | 只在 Claude 中生效 |
| Trae | ❌ 无原生支持 | `.trae/` | 无法使用 Memory |
| CodeBuddy | ❌ 无原生支持 | `.codebuddy/` | 无法使用 Memory |
| 其他 IDE | ❌ 无原生支持 | 各自配置目录 | 无法使用 Memory |

### 核心矛盾

```
Harness Memory = Claude Code 专属功能
         ↓
其他 IDE 无法自动加载 Memory
         ↓
切换 IDE = 丢失上下文
```

## 二、解决方案

### 方案架构

```
┌─────────────────────────────────────────────────────────────┐
│                    统一 Memory 存储                          │
│                .specify/memory/ (项目内)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   MEMORY.md (索引)                                          │
│   ├── user-preferences.md                                   │
│   ├── project-architecture.md                               │
│   ├── vue-pitfalls.md                                       │
│   └── design-decisions.md                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 各 IDE 通过不同方式加载
                            ▼
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Claude Code  │    Trae      │  CodeBuddy   │   其他 IDE   │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ 方式 1:      │ 方式 1:      │ 方式 1:      │ 方式 1:      │
│ 软链接到     │ 在 rules/    │ 在 rules/    │ 在各自的     │
│ 用户目录     │ 中引用       │ 中引用       │ 配置中引用   │
│              │              │              │              │
│ 方式 2:      │ 方式 2:      │ 方式 2:      │ 方式 2:      │
│ 通过 skill   │ 创建 skill   │ 创建 skill   │ 手动加载     │
│ 同步加载     │ 自动加载     │ 自动加载     │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **A. 统一到 .specify/memory/** | 项目内统一位置，易于管理 | 需要各 IDE 配置加载 | ⭐⭐⭐⭐⭐ |
| **B. 软链接方案** | Claude 可原生使用 | 依赖软链接，Windows 兼容性差 | ⭐⭐⭐ |
| **C. 各 IDE 独立 Memory** | 简单直接 | 知识碎片化，无法共享 | ⭐⭐ |

### 推荐方案：统一到 .specify/memory/

## 三、详细实施步骤

### Step 1: 创建统一 Memory 目录

```
项目根目录/
├── .specify/
│   └── memory/                    # 统一 Memory 位置
│       ├── MEMORY.md              # 索引文件
│       ├── user-preferences.md    # 用户偏好
│       ├── project-architecture.md # 项目架构
│       ├── vue-pitfalls.md        # 踩坑记录
│       └── design-decisions.md    # 设计决策
│
├── .claude/
│   └── rules/
│       └── memory-loader.md       # Claude 加载规则
│
├── .trae/
│   └── rules/
│       └── memory-loader.md       # Trae 加载规则
│
└── .codebuddy/
    └── rules/
        └── memory-loader.md       # CodeBuddy 加载规则
```

### Step 2: 为每个 IDE 创建加载规则

#### Claude Code 加载规则

文件: `.claude/rules/memory-loader.md`

```markdown
# Memory 加载规则

## 自动加载 Memory

在处理任何需求之前，必须先读取以下 Memory 文件：

1. **索引文件**: `.specify/memory/MEMORY.md`
2. **用户偏好**: `.specify/memory/user-preferences.md`
3. **项目架构**: `.specify/memory/project-architecture.md`
4. **踩坑记录**: `.specify/memory/vue-pitfalls.md`
5. **设计决策**: `.specify/memory/design-decisions.md`

## 使用方式

- 根据 Memory 中的偏好调整实现方式
- 参考 vue-pitfalls 避免已知问题
- 遵循 design-decisions 中的架构决策

## 更新 Memory

当用户说"记住这个"或需要沉淀知识时，更新对应的 Memory 文件。
```

#### Trae 加载规则

文件: `.trae/rules/memory-loader.md`

```markdown
# Memory 加载规则

## 启动时加载

每次会话开始时，读取 `.specify/memory/MEMORY.md` 了解可用的 Memory。

## 按需加载

根据任务类型加载对应的 Memory：
- 开发任务 → 加载 user-preferences.md
- 架构讨论 → 加载 project-architecture.md
- Bug 修复 → 加载 vue-pitfalls.md
- 技术决策 → 加载 design-decisions.md

## 更新 Memory

当用户要求记录知识时，更新 `.specify/memory/` 中的对应文件。
```

#### CodeBuddy 加载规则

文件: `.codebuddy/rules/memory-loader.md`

```markdown
# Memory 加载规则

## 启动时加载

每次会话开始时，读取 `.specify/memory/MEMORY.md` 了解可用的 Memory。

## 按需加载

根据任务类型加载对应的 Memory：
- 开发任务 → 加载 user-preferences.md
- 架构讨论 → 加载 project-architecture.md
- Bug 修复 → 加载 vue-pitfalls.md
- 技术决策 → 加载 design-decisions.md

## 更新 Memory

当用户要求记录知识时，更新 `.specify/memory/` 中的对应文件。
```

### Step 3: 创建 Memory 更新 Skill（可选）

为每个 IDE 创建一个 `update-memory` skill，方便用户更新 Memory。

文件: `.claude/skills/update-memory/SKILL.md`

```markdown
---
name: "update-memory"
description: "更新 .specify/memory/ 中的知识文件"
argument-hint: "要记录的知识内容"
user-invocable: true
---

## 用户输入

```
$ARGUMENTS
```

## 执行流程

1. 分析用户输入，确定知识类型：
   - 偏好/习惯 → user-preferences.md
   - 踩坑/解决方案 → vue-pitfalls.md
   - 架构/模块 → project-architecture.md
   - 决策/选择 → design-decisions.md

2. 读取对应的 Memory 文件

3. 追加新知识，格式：
   ```markdown
   ## [知识标题]

   **问题/偏好**: [描述]

   **解决/原因**: [解释]

   **How to apply**: [应用方式]

   ---
   ```

4. 更新 MEMORY.md 索引（如有必要）

5. 输出确认信息
```

### Step 4: .gitignore 配置

将 Memory 目录加入 .gitignore（如果不想推送到 Git）：

```gitignore
# 个人 Memory（可选推送）
.specify/memory/

# 或者只忽略特定文件
.specify/memory/user-preferences.md
```

如果希望团队共享部分 Memory，可以只忽略个人偏好：

```gitignore
# 只忽略个人偏好
.specify/memory/user-preferences.md
```

## 四、使用方式

### 在 Claude Code 中

```bash
# 方式 1：自动加载（通过 rules）
# rules/memory-loader.md 会自动让 Claude 读取 Memory

# 方式 2：手动触发
"读取 Memory 了解我的偏好"

# 方式 3：更新 Memory
"记住这个：我偏好使用注册表模式"
```

### 在 Trae 中

```bash
# 方式 1：自动加载（通过 rules）
# .trae/rules/memory-loader.md 会自动让 Trae 读取 Memory

# 方式 2：手动触发
"读取 .specify/memory 了解项目上下文"

# 方式 3：更新 Memory
"把这个记录到 .specify/memory/vue-pitfalls.md"
```

### 在 CodeBuddy 中

```bash
# 方式 1：自动加载（通过 rules）
# .codebuddy/rules/memory-loader.md 会自动让 CodeBuddy 读取 Memory

# 方式 2：手动触发
"读取 .specify/memory 了解项目上下文"

# 方式 3：更新 Memory
"把这个记录到 .specify/memory/vue-pitfalls.md"
```

## 五、与 Harness Memory / Code Map 的关系

### 双轨并行

```
.specify/memory/              ~/.claude/projects/<project>/memory/
(Harness Memory 的"源")      (Claude Code 专属 Memory)
       │                              │
       │                              │
       └──────────────────────────────┘
                    │
                    ▼
              可以软链接
              或者复制同步
```

### 与 Code Map 的区别

| 类型 | 路径 | 职责 | 同步方式 |
|------|------|------|----------|
| Memory | `.specify/memory/` | 偏好、踩坑、架构、决策等稳定知识 | 多工作目录之间按主题合并 |
| Code Map | `.codegraph/recent-work-code-map.md` | 近期需求入口、模块链路、任务定位 | 多工作目录之间按版本复制/合并 |
| IDE 加载入口 | `.trae/rules/`、`.cursor/rules/`、`.claude/rules/`、各 IDE `skills/` | 告诉 Agent 什么时候读取 Memory / Code Map | 各 IDE 都需要同步等价规则 |

关键原则：

- **只同步 Memory 不够**：Agent 还需要 rules / skills 知道什么时候读取。
- **只改 Trae 不够**：Cursor、Claude、CodeBuddy、Qoder、Roo 等 IDE 如果有独立 rules / skills，也需要同步等价加载规则。
- **Code Map 不替代 Memory**：Code Map 记录“东西在哪、当前改哪里”，Memory 记录“偏好、约束、踩坑、决策”。
- **多工作目录同步时不要复制 CodeGraph 数据库**：只复制 `.codegraph/recent-work-code-map.md`，不复制 `.db`、`cache/`、日志和运行时文件。

详细流程见：`requirements-analysis/MULTI_WORKSPACE_KNOWLEDGE_SYNC.md`

### 建议策略

| 场景 | 建议做法 |
|------|----------|
| 只用 Claude Code | 使用 Harness Memory 即可，不需要额外配置 |
| 多 IDE 切换 | 使用 `.specify/memory/` 作为统一 Memory 源，并同步各 IDE rules / skills |
| 多独立分支文件夹 | 同步 `.specify/memory/` + `.codegraph/recent-work-code-map.md` + `requirements-analysis/MULTI_WORKSPACE_KNOWLEDGE_SYNC.md` |
| 团队协作 | 将部分 Memory 推送到 Git，共享给团队 |
| 个人先行验证 | 先用本地 Memory / Code Map，成熟后再迁移到 `.specify/memory/` 或项目文档 |

## 六、迁移指南

### 从 Harness Memory 迁移到 .specify/memory/

```bash
# 1. 创建目标目录
mkdir -p .specify/memory

# 2. 复制 Memory 文件
cp -r ~/.claude/projects/d--holopix-pino-front-c/memory/* .specify/memory/

# 3. 创建软链接（可选，让 Claude Code 也能使用）
# Windows (管理员权限):
# mklink /D "C:\Users\Administrator\.claude\projects\d--holopix-pino-front-c\memory" "d:\holopix\pino-front-c\.specify\memory"

# 4. 为各 IDE 创建加载规则
# 创建 .claude/rules/memory-loader.md
# 创建 .trae/rules/memory-loader.md
# 创建 .codebuddy/rules/memory-loader.md
```

## 七、优缺点总结

### 优点

1. **统一存储**: 所有 IDE 共享同一个 Memory 源
2. **灵活管理**: 可以选择性推送到 Git
3. **易于迁移**: 只是文件位置变化，格式不变
4. **团队协作**: 可以共享部分 Memory 给团队

### 缺点

1. **需要配置**: 每个需要使用 Memory 的 IDE 都需要配置加载规则
2. **非自动**: 不像 Harness Memory 那样自动加载，需要依赖 rules/skills
3. **维护成本**: 需要维护多个 IDE 的加载规则

## 八、后续优化方向

1. **创建同步脚本**: 自动同步 .specify/memory/ 到各 IDE 的配置目录
2. **创建通用 Skill**: 一个 skill 适配所有 IDE
3. **Memory 版本控制**: 使用 Git 管理 Memory 的版本历史
4. **Memory 分类标签**: 支持按标签筛选 Memory

---

**版本**: 1.0.0
**创建日期**: 2026-06-09
**作者**: Claude
