# Verification Evidence

## Skill

- Skill Creator `quick_validate.py`：`Skill is valid!`
- 独立 Agent forward-test：只读恢复为 `S1 / implement / valid: true`，并正确停止为 `stage_not_implemented`。
- `policy.allow_implicit_invocation: false` 已写入 Codex UI metadata。

## Validator

- 一致状态：接受。
- 已完成阶段缺少 Artifact：拒绝并指出 `decision-log.md`。
- 非法 `load -> spec` 跃迁：拒绝。
- `max_stages` 大于 1：拒绝并指出必须单阶段调用。
- Skill Map 缺少或包含未知阶段：拒绝。
- 使用指引缺失：拒绝并指出 `missing usage guide`。
- 当前自举 Feature：`valid: true`。
- 当前版本：`0.2.0`；Validator 输出当前阶段的内部、实际第三方、候选和备选 Skill 清单。
- `@sovei/system` package：4 个 Node 测试通过；`pnpm run validate` 识别 12 个阶段、12 个 Skills 和 10 个第三方候选。
- `pnpm run skills -- load`：报告 `sovei-workflow`、`knowledge-loader`，实际第三方 Skill 为空。

## Machine Files And Scripts

- Workflow registry 与全部 JSON：解析通过。
- `skill-map.yaml` 覆盖全部 12 个阶段；Matt Pocock 10 个候选 Skill 固定到 commit `9603c1cc8118d08bc1b3bf34cf714f62178dea3b`，状态均为 `candidate_not_installed`。
- PowerShell sync script：语法解析通过。
- 缺失目标 Diff：包含 `.agents/skills/sovei-workflow/` 和 `.claude/commands/sovei/`，不包含 `.pyc`。
- `git diff --check`：通过。
- Bash：当前 Windows 环境没有可执行 Git Bash，完成静态审阅但未执行 `bash -n`。

## ABC Safety

- 只执行 `Status` 和对虚拟缺失目录的 `Diff`。
- 最终 Status：A 28 项差异，B/C 各 34 项差异。
- 未执行 `Pull`，未修改任何产品工程。
