# 功能规格：外部 Skills 运行时完成与治理层

> 由 Sovei 阶段生成：spec
> Feature：014-skills-runtime-completion
> 风险等级：S1

## 问题陈述

Feature 012 定义了外部 Skills 的配置层（类型契约、map/lock schema、CLI 命令、Agent 上下文渲染），Feature 013 扩展了适配器覆盖范围。但运行时层（stage 执行时实际读取外部 skill 内容注入 prompt）和治理层（安装器、版本升级 SOP、兼容性回放）完全未实现。

当前 12 个 stage 的 prompt 是硬编码在 `stages/index.ts` 中的。`skill-map.yaml` 虽然绑定了 stage → skill，但这个绑定信息没有进入 stage 执行逻辑。`skill-lock.yaml` 内容为 `skills: {}`，没有任何外部 skill 被锁定。

这导致 Sovei 拥有一个完整的 skills 基础设施容器，但里面装的是自己写的普通 prompt，而不是经过实际使用打磨的外部专业方法论。

## 目标

### 运行时层

1. 实现 `MarkdownSkillAdapter`：读取 vendored SKILL.md 文件，解析 YAML frontmatter + markdown body，返回 skill 指令内容。
2. 在 `WorkflowEngine.prepareStage` 中集成 SkillResolver：stage 执行前检查 skill-map 绑定，如果有已锁定的外部 skill，读取其内容注入 prompt。
3. Prompt 组合结构：权威规则 → 外部 Skill 指令 → Sovei 阶段契约。
4. 外部 skill 加载失败时回退原生 stage prompt，记录 `mode: fallback` 和原因。
5. `StageResult` 新增 `skillExecutionReport` 字段，CLI 展示实际使用的 skill 来源。

### Vendor 层

6. Vendor Matt Pocock 的 7 个 skill 到 `harness/vendor/mattpocock/skills/`。
7. 更新 `skill-map.yaml` 绑定 8 个阶段（grill/spec/tasks/implement/converge/verify/learn + spec 复用 domain-modeling）。
8. 更新 `skill-lock.yaml` 锁定所有 vendored skill 的 source/version/ref/commit/checksum/license。

### 治理层

9. 实现 `sovei skills install` 命令：从 git 仓库或本地路径拉取 skill 文件到 vendor 目录，计算 checksum，更新 lock。
10. 实现 `sovei skills upgrade <skill-id>` 命令：拉取上游最新版本，diff 对比，人工确认后更新 vendor 和 lock。
11. 实现 `sovei skills diff <skill-id>` 命令：展示当前 vendor 版本与上游最新版本的文件差异。

### 验证层

12. grill 和 spec 两个适配器的契约测试。
13. 用现有 specs/001 至 specs/011 中的至少一个 Feature 做回放，对比 native 与 adapter 结果。

## 非目标

- 不实现子代理运行时（agent runtime、调度、上下文隔离、结果聚合）。
- 不实现 MCP server。
- 不解析 skill 的附加文件（如 domain-modeling 的 CONTEXT-FORMAT.md）——本 Feature 只处理 SKILL.md 单文件注入。
- 不改变 12 个阶段的顺序、门禁和状态机逻辑。
- 不让外部 skill 直接修改 specs/、业务红线、事件事实源或知识库。
- 不自动跟随上游 latest，升级必须人工审查。

## 验收标准

### 功能验收

1. `sovei workflow grill <feature>` 执行时，如果 skill-map 中 grill 阶段绑定了 `mattpocock/grill-with-docs` 且 lock 中已启用，则返回的 prompt 包含 grill-with-docs 的 SKILL.md body 内容 + Sovei 原生阶段契约。
2. CLI 输出中显示 `使用 Skill：mattpocock/grill-with-docs v<version>` 或 `使用 Skill：native`。
3. 外部 skill 文件不存在、解析错误时，回退到原生 prompt，CLI 输出 `使用 Skill：native (fallback: <reason>)`。
4. `sovei skills install --git <url> --ref <ref>` 能拉取 skill 文件到 `harness/vendor/`，计算 sha256 checksum，更新 `skill-lock.yaml`。
5. `sovei skills install --path <local-dir>` 能从本地目录安装 skill。
6. `sovei skills upgrade <skill-id>` 能拉取上游最新版本并展示 diff。
7. `sovei skills diff <skill-id>` 能展示 vendor 当前版本与上游的差异。
8. `skill-map.yaml` 和 `skill-lock.yaml` 包含 7 个 Matt Pocock skill 的完整绑定和锁定信息。
9. `pnpm run check` 通过。
10. grill 和 spec 两个适配器的契约测试通过。
11. 至少一个历史 Feature 回放完成，对比 native vs adapter 结果有记录。

### 边界验收

12. 外部 skill 只能读取受控上下文（stage 的 prompt 和 artifact 内容），不能直接写入项目事实源。
13. 阶段完成事件仍然只能由 Sovei WorkflowEngine 产生。
14. 未配置外部 skill 时，所有 stage 正常使用原生 prompt 执行。

## 风险等级

S1：单模块改动为主（skills 模块 + workflow-engine 的 prepareStage），无跨模块契约破坏，无外部运行时依赖变更。

## Skill 映射

| Sovei 阶段 | Matt Pocock Skill | Vendor 路径 |
|---|---|---|
| grill | `grill-with-docs` | `harness/vendor/mattpocock/skills/engineering/grill-with-docs/SKILL.md` |
| spec | `domain-modeling` | `harness/vendor/mattpocock/skills/engineering/domain-modeling/SKILL.md` |
| spec（辅助） | `to-spec` | `harness/vendor/mattpocock/skills/engineering/to-spec/SKILL.md` |
| tasks | `to-tickets` | `harness/vendor/mattpocock/skills/engineering/to-tickets/SKILL.md` |
| implement | `implement` | `harness/vendor/mattpocock/skills/engineering/implement/SKILL.md` |
| converge | `code-review` | `harness/vendor/mattpocock/skills/engineering/code-review/SKILL.md` |
| verify | `code-review`（复用） | 同上 |
| learn | `handoff` | `harness/vendor/mattpocock/skills/productivity/handoff/SKILL.md` |

## 不验收（明确排除）

- 子代理运行时实现。
- MCP server 实现。
- skill 附加文件（CONTEXT-FORMAT.md 等）的解析和注入。
- 12 阶段顺序或门禁的变更。
- 外部 skill 对项目事实源的写入权限。
