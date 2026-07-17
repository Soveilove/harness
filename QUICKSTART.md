# Harness 快速操作指引

> 本文件是 AI 助手和开发者接手时的快速参考。读完即可理解整个体系并执行所有操作。

---

## 一、体系概览

### 三层架构

| 层级 | 位置 | 内容 | 说明 |
|------|------|------|------|
| **中枢层** | `E:\memory\harness\` | 知识 + 规则 + 导航 + 模板 + 脚本 + IDE 适配 | 唯一源，修改先在这里改 |
| **项目层** | `<项目>/.specify\` | Harness 知识库副本 | 随分发更新 |
| **项目根** | `<项目>/CLAUDE.md` `<项目>/AGENTS.md` | IDE 适配文件 | 随分发更新 |

### 规则注入层次

```
全局个人规则（~/.claude/CLAUDE.md）
  ↓ 所有项目通用：沟通风格、AI 协作约定、通用编码习惯
项目级规则（<项目>/CLAUDE.md + AGENTS.md + .codebuddy/rules/）
  ↓ 项目特定：架构红线、Vue 约束、环境约束、知识加载指引
知识库（<项目>/.specify/）
  ↓ 按需加载：踩坑库、决策记录、代码地图、实现规则
```

**优先级**：项目级 > 全局个人级。项目级规则覆盖全局规则的冲突项。

### 各 IDE 规则加载对照

| IDE | 全局规则 | 项目规则 | 知识加载 |
|-----|---------|---------|---------|
| **Claude Code** | `~/.claude/CLAUDE.md` | 项目根 `CLAUDE.md`（自动加载） | 读 `.specify/` 下的文件 |
| **CodeBuddy** | `~/.codebuddy/rules/personal.mdc` | `.codebuddy/rules/core-constraints/RULE.mdc` (alwaysApply) | `knowledge-loader` SKILL 按需触发 |
| **Trae** | `~/.trae/rules/` | 项目根 `AGENTS.md` | 读 `.specify/` 下的文件 |
| **Cursor** | `~/.cursor/rules/` | 项目根 `AGENTS.md` | 读 `.specify/` 下的文件 |
| **其他** | — | 项目根 `AGENTS.md` | 读 `.specify/` 下的文件 |

### 目录结构

```text
E:\memory\
├── harness/                        ← 完整 Harness（唯一源）
│   ├── index.md                    ← Harness 总入口
│   ├── memory/                     ← 知识层（宪法、踩坑、决策、偏好、架构）
│   ├── spec-harness/               ← 规则层（stable/pending/rejected/taxonomy/audit）
│   ├── codegraph/                  ← 导航层（代码地图）
│   ├── templates/                  ← 模板层（spec/plan/tasks/checklist）
│   ├── scripts/                    ← 脚本层（bash + powershell）
│   ├── workflows/                  ← 工作流（systematic-debugging 等）
│   ├── extensions/                 ← 扩展（git hooks）
│   ├── integrations/               ← IDE 集成 manifest
│   └── ide-adapters/               ← 跨 IDE 适配文件模板
│       ├── CLAUDE.md               ← → 分发到项目根 CLAUDE.md
│       ├── AGENTS.md               ← → 分发到项目根 AGENTS.md
│       └── personal-rules-template.md ← 个人全局规则模板（参考，不分发）
├── .codebuddy/                     ← CodeBuddy IDE 适配层
│   ├── rules/core-constraints/
│   │   └── RULE.mdc               ← 强制规则（alwaysApply: true）
│   ├── skills/knowledge-loader/
│   │   └── SKILL.md               ← 知识加载 Skill
│   └── memory/                    ← Working Memory
│       ├── MEMORY.md              ← 长期记忆
│       └── YYYY-MM-DD.md          ← 每日日志
├── design-docs/                    ← 设计文档（不分发）
├── docs/                           ← 个人文档（不分发）
├── backups/                        ← 备份
├── README.md                       ← 体系说明
├── QUICKSTART.md                   ← 本文件
└── SYNC.md                         ← 同步操作手册
```

---

## 二、已注册项目

| 项目 | 路径 | 角色 | 特殊规则 |
|------|------|------|---------|
| pino-front | `E:\project\holopix\pino-front` | A 工程 / 当前开发实例 | 保护 feature.json 和 specs/ |
| pino-front-b | `D:\holopix\pino-front-b` | B 工程实例 | — |
| pino-front-c | `D:\holopix\pino-front-c` | C 工程实例 | — |

---

## 三、新项目接入

```text
接入新项目 <项目路径>
```

**执行步骤**：

1. **创建目录**：
   ```bash
   mkdir -p "<项目路径>/.specify"
   mkdir -p "<项目路径>/.codebuddy/rules/core-constraints"
   mkdir -p "<项目路径>/.codebuddy/skills/knowledge-loader"
   ```
2. **复制 Harness 知识库**：`cp -r E:\memory\harness\* "<项目路径>/.specify/"`（排除 `ide-adapters/`）
3. **复制 IDE 适配文件到项目根目录**：
   - `CLAUDE.md` → `<项目路径>/CLAUDE.md`
   - `AGENTS.md` → `<项目路径>/AGENTS.md`
4. **复制 CodeBuddy 适配文件**（如果用 CodeBuddy）：
   - `RULE.mdc` → `.codebuddy/rules/core-constraints/`
   - `SKILL.md` → `.codebuddy/skills/knowledge-loader/`
5. **改写 `.specify/index.md` 标题**：改为新项目自标识
6. **注册项目**：在 README.md / QUICKSTART.md / SYNC.md 的已注册项目表追加一行
7. **验证**：检查文件是否齐全

### 或用脚本

```bash
cd /e/memory/harness/scripts/bash
./sync-harness.sh pull <项目路径>
```

---

## 四、日常操作

### 1. 分发：中枢 → 项目

```text
从 E:\memory\harness 分发到 <项目路径>
```

或用脚本：
```bash
/e/memory/harness/scripts/bash/sync-harness.sh pull <项目路径>
```

**分发内容**：
- `harness/*` → `<项目>/.specify/`（8 个子目录 + 配置文件）
- `harness/ide-adapters/CLAUDE.md` → `<项目>/CLAUDE.md`
- `harness/ide-adapters/AGENTS.md` → `<项目>/AGENTS.md`
- `.codebuddy/rules/core-constraints/RULE.mdc` → `<项目>/.codebuddy/rules/`
- `.codebuddy/skills/knowledge-loader/SKILL.md` → `<项目>/.codebuddy/skills/`
- **保护**：`feature.json`、`specs/` 不覆盖

### 2. 合并：项目 → 中枢

```text
合并各工程到 E:\memory\harness
```

或用脚本：
```bash
/e/memory/harness/scripts/bash/sync-harness.sh push <项目路径>
```

**合并原则**：
- 中枢已有且工程版更新 → 用工程版覆盖
- 工程有中枢缺失的文件 → 添加
- 不删除中枢已有但工程缺少的内容（中枢是超集）

### 3. 全量分发

```bash
/e/memory/harness/scripts/bash/sync-harness.sh pull-all
```

### 4. 查看同步状态

```bash
/e/memory/harness/scripts/bash/sync-harness.sh status
```

---

## 五、AI 如何在项目中使用 Harness

### 进入项目时

1. **自动加载规则**：
   - Claude Code 自动读 `CLAUDE.md`
   - CodeBuddy 强制加载 `RULE.mdc` + 自动注入 Working Memory
   - 其他 IDE 读 `AGENTS.md`（如果支持）

2. **按需加载知识**（触发条件）：
   - 开始任务 / 切换工作文件夹
   - 用户说"读 Memory"、"读 Code Map"、"读规则"
   - 任务涉及 bug 修复、架构讨论、技术决策

3. **加载流程**：
   ```
   读 .specify/index.md（总入口）
     → 读 .specify/memory/MEMORY.md（知识索引）
     → 按任务类型加载：
       Bug 修复 → vue-pitfalls.md + systematic-debugging.md
       架构讨论 → constitution.md + project-architecture.md
       技术决策 → design-decisions.md
       实现任务 → implementation-rules.md
       代码导航 → codegraph/ 下对应地图
   ```

4. **知识更新**（完成任务后）：
   - 新踩坑 → `vue-pitfalls.md`
   - 新决策 → `design-decisions.md`
   - 新规则 → `implementation-rules.md` 或 `pending-rules.md`
   - 失败模式 → `rejected-patterns.md`
   - 代码地图更新 → `codegraph/`
   - Working Memory 日志 → `.codebuddy/memory/YYYY-MM-DD.md`

---

## 六、个人全局规则设置

个人全局规则**不随 harness 分发**，手动复制到各 IDE 全局位置：

| IDE | 全局规则位置 | 操作 |
|-----|------------|------|
| Claude Code | `~/.claude/CLAUDE.md` | 已创建 |
| CodeBuddy | `~/.codebuddy/rules/personal.mdc` | 手动创建（加 YAML frontmatter） |
| Cursor | `~/.cursor/rules/personal.mdc` | 手动创建 |
| Trae | `~/.trae/rules/personal.mdc` | 手动创建 |

模板见 `harness/ide-adapters/personal-rules-template.md`。

**全局规则只放**：沟通风格、AI 协作约定、通用编码习惯（所有项目通用）。
**不放**：项目特定约束（架构红线、Vue 约束等放在项目级 `CLAUDE.md` / `RULE.mdc`）。

---

## 七、注意事项

1. **harness/ 是唯一源**：修改先在 `E:\memory\harness\` 改，再分发
2. **IDE 适配文件同步分发**：`CLAUDE.md` / `AGENTS.md` 随 harness 分发到项目根目录
3. **设计文档不分发**：`design-docs/` 只在中枢存放
4. **个人文档不分发**：`docs/` 只在中枢存放
5. **个人全局规则不分发**：手动设置在各 IDE 全局位置
6. **同步频率**：更新不频繁，人工同步即可

---

*创建日期: 2026-06-23*
*更新日期: 2026-07-16 — 增加跨 IDE 适配层（CLAUDE.md / AGENTS.md），增加个人全局规则，更新分发流程*
