# 变更清单

> Feature：014-skills-runtime-completion
> 日期：2026-08-06

## 变更概要

完成外部 Skills 的运行时层和治理层实现。012/013 已建设配置层（map/lock/CLI/渲染），本 Feature 补全：
1. 运行时层：stage 执行时读取外部 skill 的 SKILL.md 内容，注入到 prompt 中
2. Vendor 层：7 个 Matt Pocock skill 已 vendor 到 harness/vendor/mattpocock/skills/
3. 治理层：skill 安装器（git/path）、版本升级器（check/diff/upgrade）
4. 验证层：9 个契约测试（adapter 解析 + prompt 注入 + fallback + 结构顺序）

## TASK 完成情况

| TASK | 描述 | 状态 |
|---|---|---|
| TASK-001 | Vendor Matt Pocock skills 到本地 | ✅ |
| TASK-002 | 实现 MarkdownSkillAdapter | ✅ |
| TASK-003 | WorkflowEngine 集成 prompt 注入 | ✅ |
| TASK-004 | Bootstrap 注册 adapter | ✅ |
| TASK-005 | 更新 skill-map 和 skill-lock | ✅ |
| TASK-006 | CLI 展示 skill 执行报告 | ✅ |
| TASK-007 | 实现 SkillInstaller | ✅ |
| TASK-008 | 实现 SkillUpgrader | ✅ |
| TASK-009 | 契约测试 | ✅ |
| TASK-010 | 类型检查和回放验证 | ✅ |

## 新增文件

| 文件 | 说明 |
|---|---|
| `packages/sovei-core/src/skills/adapter.ts` | MarkdownSkillAdapter + parseSkillFile |
| `packages/sovei-core/src/skills/installer.ts` | SkillInstaller（git/path 安装） |
| `packages/sovei-core/src/skills/upgrader.ts` | SkillUpgrader（check/diff/upgrade） |
| `packages/sovei-core/test/skill-adapter.test.mjs` | adapter 契约测试（5 个） |
| `packages/sovei-core/test/skill-runtime.test.mjs` | prompt 注入测试（4 个） |
| `harness/vendor/mattpocock/skills/productivity/grilling/SKILL.md` | Matt Pocock grilling skill |
| `harness/vendor/mattpocock/skills/productivity/handoff/SKILL.md` | Matt Pocock handoff skill |
| `harness/vendor/mattpocock/skills/engineering/domain-modeling/SKILL.md` | Matt Pocock domain-modeling skill |
| `harness/vendor/mattpocock/skills/engineering/to-spec/SKILL.md` | Matt Pocock to-spec skill |
| `harness/vendor/mattpocock/skills/engineering/to-tickets/SKILL.md` | Matt Pocock to-tickets skill |
| `harness/vendor/mattpocock/skills/engineering/implement/SKILL.md` | Matt Pocock implement skill |
| `harness/vendor/mattpocock/skills/engineering/code-review/SKILL.md` | Matt Pocock code-review skill |
| `harness/vendor/mattpocock/skills/engineering/grill-with-docs/SKILL.md` | Matt Pocock grill-with-docs skill（候选，未绑定） |

## 修改文件

| 文件 | 变更 |
|---|---|
| `packages/sovei-core/src/stages/define-stage.ts` | StageResult 新增 skillExecutionReport 字段 |
| `packages/sovei-core/src/engine/workflow-engine.ts` | prepareStage 中注入外部 skill 内容到 prompt；构造函数新增 skillResolver 参数 |
| `packages/sovei-core/src/providers/bootstrap.ts` | 同步读取 lock 并创建/注册 MarkdownSkillAdapter；传递 skillResolver 给 WorkflowEngine |
| `packages/sovei-core/src/cli/commands/workflow.ts` | stage 执行输出显示 skill 来源 |
| `packages/sovei-core/src/cli/commands/skills.ts` | 新增 install/upgrade/diff 命令 |
| `packages/sovei-core/src/skills/index.ts` | 导出 adapter/installer/upgrader |
| `harness/skills/skill-map.yaml` | 8 个阶段绑定（7 external + 1 native） |
| `harness/skills/skill-lock.yaml` | 6 个 skill 锁定条目 |

## 验证结果

- `tsc --noEmit`：通过
- 全部 89 个测试通过（含新增 9 个）
- 端到端验证：`sovei workflow grill test-skill-injection` 返回的 prompt 包含：
  - `## 权威规则`（authority notice）
  - `## 外部 Skill 指令`（grilling skill body：design tree、frontier、interview relentlessly）
  - `来源：mattpocock/grilling v1.0.0`
  - Sovei 阶段契约（输入/操作/输出/停止条件）
  - CLI 输出 `使用 Skill：mattpocock/grilling v1.0.0`

## Prompt 结构

```
## 权威规则
（revision + 变更上下文 + 产物权威性声明）

## 外部 Skill 指令
（Matt Pocock SKILL.md body 内容）
来源：mattpocock/grilling v1.0.0

# 阶段：grill
（Sovei 原生：输入/操作/输出/停止条件）
```

## Skill 映射

| Sovei 阶段 | Matt Pocock Skill | 状态 |
|---|---|---|
| grill | mattpocock/grilling | enabled |
| wayfind | sovei/native/wayfind | enabled (native) |
| spec | mattpocock/domain-modeling | enabled |
| tasks | mattpocock/to-tickets | enabled |
| implement | mattpocock/implement | enabled |
| converge | mattpocock/code-review | enabled |
| verify | mattpocock/code-review | enabled (复用) |
| learn | mattpocock/handoff | enabled |

## 治理层命令

| 命令 | 说明 |
|---|---|
| `sovei skills install --git <url> --ref <ref> --paths <paths> --ids <ids>` | 从 git 仓库安装 skill |
| `sovei skills install --path <dir> --id <id>` | 从本地目录安装 skill |
| `sovei skills upgrade <skill-id>` | 升级 skill 到上游最新版本 |
| `sovei skills diff <skill-id>` | 展示 vendor 与上游差异 |

## 不在范围内

- 子代理运行时（agent runtime）
- MCP server
- skill 附加文件（CONTEXT-FORMAT.md 等）的解析
- 12 阶段顺序或门禁的变更
- 外部 skill 对项目事实源的写入权限
