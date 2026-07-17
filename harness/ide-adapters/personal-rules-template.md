# 个人全局规则模板

> 本文件是**跨项目通用的个人规则模板**，不随 harness 分发到项目。
> 复制到各 IDE 的全局规则位置后生效：
> - Claude Code: `~/.claude/CLAUDE.md`
> - CodeBuddy: `~/.codebuddy/rules/personal.mdc`（加 YAML frontmatter，alwaysApply: true）
> - Cursor: `~/.cursor/rules/personal.mdc`
> - Trae: `~/.trae/rules/personal.mdc`
>
> 项目级规则（架构红线、Vue 约束等）在各项目的 `CLAUDE.md` / `AGENTS.md` / `.codebuddy/rules/` 中，
> 由 Harness 中枢分发。本文件只放**所有项目都适用的个人习惯**。

## 沟通风格

- 简洁、直接、可操作。先说结论，再说原因。
- 有明确推荐时直接给出，不列举所有选项。
- 提供具体文件路径和代码示例。
- 中文回答（除非用户用英文提问）。

## AI 协作约定

1. **不主动 commit** — 除非用户明确要求。
2. **增量编辑优先** — 用 `replace_in_file` 做定向修改，不重写整文件（除非文件不存在或需要大规模重构）。
3. **遇到模糊需求先确认** — 不要猜测意图，有歧义就问。
4. **假设并继续** — 有合理默认值时直接假设并标注，不阻塞等待确认。

## 通用编码习惯

1. **不默认运行全量检查** — type-check / lint / test 除非用户明确要求或任务必须验证。
2. **不默认运行 git 命令** — `git diff` / `git status` / `git log` 除非对当前任务有收益。
3. **终端是 Git Bash** — 不使用 PowerShell 专属命令。

## 工作记忆

- 完成实质性工作后，在 `.codebuddy/memory/YYYY-MM-DD.md` 追加日志。
- 跨会话的稳定事实更新到 `.codebuddy/memory/MEMORY.md`。
- 不记录临时搜索结果和工具错误。
