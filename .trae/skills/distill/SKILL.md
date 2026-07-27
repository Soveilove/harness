---
name: distill
description: "Scan project-local records (debug records in .debug-records/ or specs/ Feature artifacts), cluster by failure taxonomy or business capability, and generate knowledge candidate proposals for harness. Use when accumulating enough records to distill, when user says distill/蒸馏/提取知识/沉淀知识, or when Sovei learn stage needs to propose knowledge destinations. Only proposes candidates; never auto-promotes to stable rules."
---

# 知识蒸馏 (Distill)

从项目本地记录中批量提取、聚类、提议知识候选,喂给 harness 的 pending/rejected-patterns 池。人工确认后才晋级。

## 命令格式

| IDE | 命令 | 说明 |
|---|---|---|
| Codex | `$distill --source <path> --type <debug|specs>` | 默认 `--source .debug-records/ --type debug` |
| Claude Code | `/distill --source <path> --type <debug|specs>` | 同上 |
| CodeBuddy | `DISTILL: --source <path> --type <debug|specs>` | 同上 |
| Trae | `使用 distill skill 扫描 --source <path> --type <debug|specs>` | 同上 |

无参数时默认扫描 `.debug-records/` 的 debug 记录。命令触发后 Agent 读本 SKILL.md 执行完整蒸馏流程(扫描→聚类→提议→人工确认→写入)。

## 何时使用

- `.debug-records/` 攒够记录(建议 ≥10 条或每月一次)后手动蒸馏
- Sovei `learn` 阶段调用,扫描单个 Feature 的 `specs/<feature>/` 产物
- 批量蒸馏多个 Feature 的 specs 产物到 harness 知识库
- 用户说"蒸馏"、"提取知识"、"沉淀知识"、"整理 debug 记录"

## 核心约束

**提议不晋级**:本 skill 只生成候选(pending / rejected-patterns / learning-report),stable 规则晋级必须人工确认。这是宪法约束,不可绕过。

## 路径约定

解析 `<harness-root>`:中枢仓库存在 `harness/index.md` 时使用 `harness/`;产品工程存在 `.specify/index.md` 时使用 `.specify/`;同时存在时优先 `.specify/`。

输入源在工程根下,与 harness 根同级:
- `.debug-records/` — 缺陷修复记录(IDE 无关)
- `specs/` — Feature 产物

## 蒸馏流程

### Step 1: 扫描记录

用 `scripts/scan_records.py` 扫描指定目录,提取结构化字段:

```bash
python scripts/scan_records.py --source <path> --type <debug|specs>
```

- `--type debug`:扫描 `.debug-records/` 下的 markdown 记录,提取 F 类型、症状、根因、修复、相关文件
- `--type specs`:扫描 `specs/` 下的 Feature 产物,提取能力域、偏差、证据

脚本输出 JSON,每条记录包含原始字段 + 提取的结构化字段。

### Step 2: 聚类

按分类法聚类,识别重复出现的模式:

| 输入类型 | 分类法 | 聚类维度 |
|---|---|---|
| debug 记录 | F1-F8(见 `spec-harness/failure-taxonomy.md`) | F 类型 + 根因关键词 |
| specs 产物 | 业务能力/模块 | 能力域 + 偏差类型 |

聚类规则:
- 相同 F 类型 + 根因关键词重叠 -> 同一簇
- 不同 F 类型但相关文件重叠 -> 标注关联
- 单次出现的记录 -> 不进候选,归档

### Step 3: 生成提议报告

为每个 >=2 次出现的簇生成提议,填入下表:

| Observation | Classification | Evidence | Scope | Proposed Destination |
|---|---|---|---|---|
| [一句话描述模式] | F[1-8] 或能力域 | [引用具体记录日期+文件] | [影响范围] | [pending-rules / rejected-patterns / vue-pitfalls / design-decisions] |

报告底部标注 `Manual Review Required`。

### Step 4: 人工确认

将报告呈现给开发者。开发者逐条判断:
- **采纳**:按 Proposed Destination 写入对应 harness 文件(作为候选)
- **不采纳**:归档,不进 harness
- **调整落点**:改 Proposed Destination 后写入

### Step 5: 写入候选

确认后,将采纳的提议写入 harness 对应文件:

| 落点 | 文件 | 格式 |
|---|---|---|
| Vue 陷阱 | `<harness-root>/memory/vue-pitfalls.md` | 见 systematic-debugging.md 模板 |
| 违反规则 | `<harness-root>/spec-harness/implementation-rules.md` | 补充具体要求 |
| 架构模式问题 | `<harness-root>/spec-harness/rejected-patterns.md` | RP-XXX 模板 |
| 架构决策 | `<harness-root>/memory/design-decisions.md` | 新 ADR |
| 候选规则 | `<harness-root>/spec-harness/pending-rules.md` | P-XXX 模板 |

写入后执行关联检查:
- [ ] 新增 pitfall -> `implementation-rules.md` 是否需要同步新增规则
- [ ] 新增规则 -> `knowledge-loader` SKILL 关键词触发表是否需要补充
- [ ] 修改架构决策 -> `codegraph/*.md` 相关链路描述是否需要更新

## 与其他工作流的关系

| 调用方 | 输入源 | 分类法 | 触发时机 |
|---|---|---|---|
| debugging 蒸馏 | 工程根 `.debug-records/` | F1-F8 | 手动,>=10 条或每月 |
| Sovei `learn` | `specs/<feature>/` | Observation/Classification | Feature 结束时 |
| specs 蒸馏 | `specs/` 多个 Feature | 按业务能力/模块 | 手动,批量 |

三者共用本 skill,区别只在输入源和分类法参数。

## 资源

### scripts/scan_records.py

扫描指定目录的结构化记录,提取字段,输出 JSON。支持 `--type debug` 和 `--type specs` 两种模式。

### references/distill-formats.md

记录格式、聚类规则和提议报告模板的详细参考。