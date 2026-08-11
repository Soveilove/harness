# 任务清单

> 由 Sovei 阶段生成：tasks
> Feature：014-skills-runtime-completion

## TASK-001: Vendor Matt Pocock skills 到本地

**Blocked by**: 无
**文件范围**: `harness/vendor/mattpocock/skills/`（新增）
**验收标准**: 7 个 SKILL.md 文件存在于正确路径
**验证方式**: 文件存在性检查

- [x] TASK-001: Vendor Matt Pocock 的 7 个 skill 到 harness/vendor/mattpocock/skills/

## TASK-002: 实现 MarkdownSkillAdapter

**Blocked by**: TASK-001
**文件范围**: `packages/sovei-core/src/skills/adapter.ts`（新增）, `packages/sovei-core/src/skills/types.ts`（修改）, `packages/sovei-core/src/skills/index.ts`（修改）
**验收标准**: 实现 SkillAdapter 接口，能解析 SKILL.md 的 frontmatter + body
**验证方式**: 单元测试

- [x] TASK-002: 实现 MarkdownSkillAdapter，解析 SKILL.md frontmatter + body

## TASK-003: WorkflowEngine 集成 prompt 注入

**Blocked by**: TASK-002
**文件范围**: `packages/sovei-core/src/engine/workflow-engine.ts`（修改）, `packages/sovei-core/src/stages/define-stage.ts`（修改）
**验收标准**: prepareStage 返回的 prompt 包含外部 skill 内容 + Sovei 契约；skillExecutionReport 正确填充
**验证方式**: 集成测试

- [x] TASK-003: 在 prepareStage 中集成 SkillResolver，实现 prompt 注入和 fallback

## TASK-004: Bootstrap 注册 adapter

**Blocked by**: TASK-002
**文件范围**: `packages/sovei-core/src/providers/bootstrap.ts`（修改）
**验收标准**: 启动时为每个已锁定 skill 创建 MarkdownSkillAdapter 并注册
**验证方式**: skills status 显示 adapter 已注册

- [x] TASK-004: bootstrap 读取 lock 并注册 MarkdownSkillAdapter

## TASK-005: 更新 skill-map 和 skill-lock

**Blocked by**: TASK-001
**文件范围**: `harness/skills/skill-map.yaml`（修改）, `harness/skills/skill-lock.yaml`（修改）
**验收标准**: 7 个外部 skill 绑定和锁定信息完整
**验证方式**: sovei skills status 显示有效

- [x] TASK-005: 更新 skill-map.yaml 和 skill-lock.yaml 绑定 7 个 Matt Pocock skill

## TASK-006: CLI 展示 skill 执行报告

**Blocked by**: TASK-003
**文件范围**: `packages/sovei-core/src/cli/commands/workflow.ts`（修改）
**验收标准**: stage 执行输出中显示 skill 来源
**验证方式**: 手动执行查看输出

- [x] TASK-006: CLI 输出显示 skillExecutionReport

## TASK-007: 实现 SkillInstaller

**Blocked by**: TASK-002
**文件范围**: `packages/sovei-core/src/skills/installer.ts`（新增）, `packages/sovei-core/src/cli/commands/skills.ts`（修改）
**验收标准**: install --git 和 install --path 都能工作
**验证方式**: 手动安装测试

- [x] TASK-007: 实现 SkillInstaller 和 skills install CLI 命令

## TASK-008: 实现 SkillUpgrader

**Blocked by**: TASK-007
**文件范围**: `packages/sovei-core/src/skills/upgrader.ts`（新增）, `packages/sovei-core/src/cli/commands/skills.ts`（修改）
**验收标准**: upgrade 和 diff 命令能工作
**验证方式**: 手动升级测试

- [x] TASK-008: 实现 SkillUpgrader 和 skills upgrade/diff CLI 命令

## TASK-009: 契约测试

**Blocked by**: TASK-003, TASK-004
**文件范围**: `packages/sovei-core/test/skill-adapter.test.mjs`（新增）, `packages/sovei-core/test/skill-runtime.test.mjs`（新增）
**验收标准**: grill 和 spec 适配器测试通过；fallback 测试通过
**验证方式**: node --test

- [x] TASK-009: grill + spec 适配器契约测试 + fallback 测试

## TASK-010: 类型检查和回放验证

**Blocked by**: TASK-006, TASK-008, TASK-009
**文件范围**: 无新文件
**验收标准**: pnpm run check 通过；至少一个历史 Feature 回放对比
**验证方式**: tsc --noEmit + 手动回放

- [x] TASK-010: pnpm run check 通过 + 历史 Feature 回放
