# E:\memory — AI 开发 Harness 中枢

> 这是一个**知识驱动的 AI 开发护栏系统**，不是普通的文档库。
> 核心目标：在 AI 写代码前就给约束，防止 AI 静默漂移，把验证从"逐行读代码"降到"对齐业务红线"。

---

## 体系定位

```
E:\memory\ (Harness 中枢 — 唯一源)
│
├── harness/                    ← 完整 Harness（分发到项目的全部内容）
│   ├── memory/                 ← 知识层（宪法、踩坑、决策、偏好、架构）
│   ├── spec-harness/           ← 规则层（stable/pending/rejected/taxonomy/audit）
│   ├── codegraph/              ← 导航层（代码地图）
│   ├── templates/              ← 模板层（spec/plan/tasks/checklist）
│   ├── scripts/                ← 脚本层（sync-harness.sh 等）
│   ├── workflows/              ← 工作流（systematic-debugging 等）
│   ├── extensions/             ← 扩展（git hooks）
│   ├── integrations/           ← IDE 集成 manifest
│   └── ide-adapters/           ← 跨 IDE 适配文件（CLAUDE.md / AGENTS.md）
│
├── .codebuddy/                 ← CodeBuddy IDE 适配层
│   ├── rules/                  ← 强制规则（alwaysApply: true）
│   ├── skills/                 ← 按需知识加载（Skill）
│   └── memory/                 ← Working Memory（自动注入）
│
├── design-docs/                ← 设计文档（不分发）
├── docs/                       ← 个人文档（不分发）
├── backups/                    ← 备份
├── README.md                   ← 本文件
├── QUICKSTART.md               ← 快速操作指引
└── SYNC.md                     ← 同步操作手册
```

## 规则注入层次

```
全局个人规则（~/.claude/CLAUDE.md）
  ↓ 所有项目通用：沟通风格、AI 协作约定、通用编码习惯
项目级规则（CLAUDE.md / AGENTS.md / .codebuddy/rules/）
  ↓ 项目特定：架构红线、Vue 约束、环境约束、知识加载指引
知识库（.specify/）
  ↓ 按需加载：踩坑库、决策记录、代码地图、实现规则
```

## 各 IDE 规则加载对照

| IDE | 全局规则 | 项目规则 | 知识加载 |
|-----|---------|---------|---------|
| **Claude Code** | `~/.claude/CLAUDE.md` | 项目根 `CLAUDE.md` | 读 `.specify/` |
| **CodeBuddy** | `~/.codebuddy/rules/` | `.codebuddy/rules/RULE.mdc` | `knowledge-loader` SKILL |
| **Trae** | `~/.trae/rules/` | 项目根 `AGENTS.md` | 读 `.specify/` |
| **Cursor** | `~/.cursor/rules/` | 项目根 `AGENTS.md` | 读 `.specify/` |

## 核心原理

**事前约束替代事后验证**：

```
AI 写代码前 → 先读知识库（红线、参数链路、坑点）
  → AI 在约束范围内写代码
  → 人审"AI 是否遵守红线"（10 分钟，不需要逐行读代码）
  → 新坑点/决策写回知识库 → 下次 AI 自动拿到
```

## 已注册项目

| 项目 | 路径 | 角色 |
|------|------|------|
| pino-front | `E:\project\holopix\pino-front` | A 工程 / 当前开发实例 |
| pino-front-b | `D:\holopix\pino-front-b` | B 工程实例 |
| pino-front-c | `D:\holopix\pino-front-c` | C 工程实例 |

## 常用操作

```text
从 E:\memory\harness 分发到 <项目路径>
全量分发 Harness 到所有项目
合并各工程到 E:\memory\harness
接入新项目 <项目路径>
```

详见 [QUICKSTART.md](QUICKSTART.md) 和 [SYNC.md](SYNC.md)。

---

*更新日期: 2026-07-16 — 增加跨 IDE 适配层，增加个人全局规则，三层规则注入体系*
