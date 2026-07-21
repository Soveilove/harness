# Scope

## 入口

- Codex：`.agents/skills/sovei-workflow/SKILL.md`
- Claude：`.claude/commands/sovei/*.md` 生成副本；稳定源位于 `harness/ide-adapters/claude/commands/sovei/`
- 状态校验：Skill 的 `scripts/validate_workflow.py`

## 稳定源

- `.agents/skills/sovei-workflow/`：跨 IDE 核心流程协议和校验器
- `harness/workflows/sovei/workflow.yaml`：阶段图与 Artifact 契约
- `harness/templates/sovei/`：Feature Artifact 模板
- `harness/ide-adapters/claude/commands/sovei/`：Claude 薄适配
- `harness/scripts/*/sync-harness.*`：向 ABC 分发适配文件

## 消费者与状态

- 中枢仓库通过根 `.agents/skills` 直接发现 Skill。
- 产品工程通过同步脚本接收 `.agents/skills/sovei-workflow` 和 `.claude/commands/sovei`。
- Feature 自己拥有 `specs/<feature>/workflow-state.yaml`，同步脚本不得读写。

## 风险表面

- 复制的 Adapter 与核心 Skill 漂移。
- YAML 校验器只做结构检查却未验证实际 Artifact。
- load 在冲突时仍推测或自动修复状态。
- 设计文档和注册表过早宣称 Phase 2 能力。
- 同步脚本意外覆盖项目自身 Skills 或 Commands。

## 验证表面

- Skill frontmatter 与 `agents/openai.yaml` 校验。
- workflow.yaml、workflow-state.yaml 解析。
- 正常、缺失 Artifact、非法后继三类 fixture 回放。
- PowerShell 同步脚本语法和只读 Diff/Status。
- 引用扫描与 `git diff --check`。
