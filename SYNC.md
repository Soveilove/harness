# Harness 同步操作手册

> `E:\memory\harness` 是中央 Harness 中转站。各工程改进先合并到这里，再分发到所有项目。

---

## 一、同步模型

```text
pino-front (A) / pino-front-b (B) / pino-front-c (C)
  各工程日常开发中演进 Harness
        ↓ merge 改进进中枢
E:\memory\harness
  中央 merge 中转站（唯一源 of truth）
        ↓ 分发
各项目
  ├── .specify/          ← 知识库副本
  ├── CLAUDE.md          ← Claude Code 项目规则
  ├── AGENTS.md          ← 通用 IDE 项目规则
  └── .codebuddy/        ← CodeBuddy 适配（RULE.mdc + SKILL.md）
```

### 核心原则

1. **Merge 中转站模式**：各工程改进先 merge 到 `E:\memory\harness`，再由中枢分发回全部工程。
2. **harness/ 是唯一源**：知识、规则、导航、模板、脚本、IDE 适配全在 `harness/` 下。
3. **项目是实例**：分发时保护项目实例状态（`feature.json`、`specs/`）。
4. **IDE 适配随项目走**：`CLAUDE.md` / `AGENTS.md` 分发到项目根目录，`.codebuddy/` 适配文件分发到项目 `.codebuddy/`。

---

## 二、合并：工程 → 中枢

### 触发方式

```text
合并各工程到 E:\memory\harness
```

或用脚本：
```bash
/e/memory/harness/scripts/bash/sync-harness.sh push <项目路径>
```

### 执行步骤

1. 读取各工程的 `.specify` 目录。
2. 对比中枢 `harness/`，识别较新/独有的文件。
3. 合并原则：
   - 中枢已有且工程版更新/更完整 → 用工程版覆盖
   - 工程有中枢缺失的通用文件 → 添加
   - 不删除中枢已有但工程缺少的内容（中枢是超集）
4. 更新 `harness/index.md` 和 `harness/memory/MEMORY.md`。
5. 不处理 `feature.json` / `specs/`（实例状态）。

### 各目录合并规则

| 目录 | 规则 |
|------|------|
| `memory/` | 追加新内容，冲突保留更具体/更近期的。`vue-pitfalls.md` 追加不删除。`design-decisions.md` 追加新 ADR。`user-preferences.md` 追加新偏好。 |
| `spec-harness/` | `implementation-rules.md` 追加新规则。`pending-rules.md` 更新观察次数。`rejected-patterns.md` 追加失败记录。`failure-taxonomy.md` 更新分类。 |
| `codegraph/` | 取最新/最全版本。各项目独有代码路径合并。 |
| `templates/` | 取最新版本。 |
| `scripts/` | 取最新版本。 |
| `workflows/` | 取最新版本。 |
| `extensions/` | 取最新版本。 |
| `integrations/` | 取最新版本。 |
| `ide-adapters/` | 取最新版本（中枢维护，不从项目合并）。 |

---

## 三、分发：中枢 → 项目

### 触发方式

```text
从 E:\memory\harness 分发到 <项目路径>
```

或用脚本：
```bash
/e/memory/harness/scripts/bash/sync-harness.sh pull <项目路径>
```

### 分发内容

| 源（中枢） | 目标（项目） | 策略 |
|-----------|------------|------|
| `harness/*` | `<项目>/.specify/` | 全量覆盖（排除 `ide-adapters/`） |
| `harness/ide-adapters/CLAUDE.md` | `<项目>/CLAUDE.md` | 覆盖 |
| `harness/ide-adapters/AGENTS.md` | `<项目>/AGENTS.md` | 覆盖 |
| `.codebuddy/rules/core-constraints/RULE.mdc` | `<项目>/.codebuddy/rules/core-constraints/RULE.mdc` | 覆盖 |
| `.codebuddy/skills/knowledge-loader/SKILL.md` | `<项目>/.codebuddy/skills/knowledge-loader/SKILL.md` | 覆盖 |
| `.specify/feature.json` | — | **不覆盖**（实例状态） |
| `specs/` | — | **不处理**（实例状态） |

### 全量分发

```bash
/e/memory/harness/scripts/bash/sync-harness.sh pull-all
```

遍历所有已注册项目，逐个执行分发。

---

## 四、查看同步状态

```bash
/e/memory/harness/scripts/bash/sync-harness.sh status
```

对比中枢与各项目的所有 `.md` 文件 + IDE 适配文件 + CodeBuddy 适配文件的 MD5 hash。

### 对比具体项目差异

```bash
/e/memory/harness/scripts/bash/sync-harness.sh diff <项目路径>
```

---

## 五、开发加载顺序

进入项目开发时优先读取：

```text
.specify/index.md
.specify/feature.json
.specify/spec-harness/implementation-rules.md
.specify/memory/MEMORY.md
.specify/codegraph/index.md
```

### 各 IDE 自动加载机制

| IDE | 自动加载 | 按需加载 |
|-----|---------|---------|
| **Claude Code** | 项目根 `CLAUDE.md` + `~/.claude/CLAUDE.md` | 读 `.specify/` 下的知识文件 |
| **CodeBuddy** | `.codebuddy/rules/RULE.mdc` (alwaysApply) + Working Memory | `knowledge-loader` SKILL 触发 |
| **Trae / Cursor / 其他** | 项目根 `AGENTS.md` | 读 `.specify/` 下的知识文件 |

---

## 六、已注册项目

| 项目 | 路径 | 角色 | 特殊规则 |
|------|------|------|---------|
| pino-front-b | `D:\holopix\pino-front-b` | B 工程实例 | — |
| pino-front | `E:\project\holopix\pino-front` | A 工程 / 当前开发实例 | 保护 feature.json 和 specs/ |
| pino-front-c | `D:\holopix\pino-front-c` | C 工程实例 | — |

---

## 七、常用口令

```text
合并各工程到 E:\memory\harness
从 E:\memory\harness 分发到 <项目路径>
全量分发 Harness 到所有项目
接入新项目 <项目路径>
```

---

*版本: 5.0.0*
*更新日期: 2026-07-16 — 增加跨 IDE 适配层（CLAUDE.md / AGENTS.md），增加个人全局规则，同步脚本支持 IDE 适配文件*
