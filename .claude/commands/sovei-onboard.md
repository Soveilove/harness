---
description: Sovei onboard — 已有项目接入（采集证据 + 按 CLI 指令包分析写回）
---

# Sovei onboard — 已有项目接入（采集证据 → agent 分析 → 写回）

> 用于把一个**已有代码库**接入 Sovei：CLI 采集机械证据（目录/import/正则命中），
> 你（agent）负责读代码、判断业务语义、把确认的红线与知识写回 CLI。

## 何时唤起

- 需要为一个还没接入 Sovei 的现有项目建立业务基线（业务能力地图 + 红线 + 知识）。
- 不用于：新项目初始化（用 `sovei project init`）；单个 Feature 开发（用 explore 入口）。

## 执行步骤

1. 若项目尚未初始化 Sovei（无 AGENTS.md / sovei-flow/），先初始化骨架：
   ```bash
   sovei project init . --force
   ```
2. 采集证据并获取指令包：
   运行：
   ```bash
   sovei project onboard --evidence-only
   ```
   CLI 会落盘三类证据文件（业务地图 / 红线候选 / 知识条目），并输出一段
   **AGENT ONBOARDING GUIDE 指令包**。
3. **读取并执行该指令包**——它是你本次要做的事的权威说明，不要只复制文字：
   - 读 `sovei-flow/project/codegraph/business-map.json`，对照真实源码逐项
     CONFIRM / REJECT / MERGE / SPLIT（测试文件、单字母名、无真实逻辑一律 REJECT）。
   - 读真实源码识别业务红线（认证 / 计费 / 数据完整性 / API 契约 / 合规）。
   - 通过 CLI 写回确认项：
     ```bash
     sovei governance redline add <ID> --title "..." --rule "..." --enforcement absolute --rationale "..."
     sovei knowledge add --type <type> --title "..." --content "..." --feature onboard
     ```
   - 精炼规则候选（读 `sovei-flow/project/rules/adapted.rules.json`）：
     ```bash
     sovei rules refine --reviewer <agent> --reason "<finding>" --discard <ID,逗号分隔>
     ```
   - 写 `sovei-flow/project/onboard-report.md` 与 `business-coverage.md`（业务视角，供 explore 阶段消费）。
4. 全部为候选，绝不自动激活；完成后交人工审核：
   ```bash
   sovei governance redline list
   sovei knowledge list --lifecycle candidate
   sovei rules list --lifecycle candidate
   ```

> 边界：CLI 只产机械证据与门禁，业务语义判断由你完成；激活由人工决定。
