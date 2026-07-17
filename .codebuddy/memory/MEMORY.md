# 长期记忆

> 跨会话持久记忆，存放项目约定、技术决策、Harness 架构等稳定信息。

## Harness 架构

### 2026-07-16 从记忆分发系统重构为 Harness 架构
- **变更**：根级知识副本（constitution.md / user-preferences.md / vue-pitfalls.md 等）全部删除，`harness/memory/` 成为唯一源
- **CodeBuddy 适配**：旧 `memory-loader.md`（纯 .md）→ `core-constraints/RULE.mdc`（YAML frontmatter + alwaysApply: true）+ `knowledge-loader/SKILL.md`（指向 harness/ 路径）
- **三层机制**：Rules 强制加载约束 / Skills 按需加载知识 / Working Memory 自动注入上下文
- **Rules 与 Skills 分工**：Rules 只放约束（宪法红线、编码偏好），Skills 只放加载逻辑（何时触发、加载顺序、文件映射）
- **个人文档**：移至 `docs/` 目录（AI开发面临的核心问题.md、面试准备文档）
- **设计文档**：`design-docs/` 保持不动，新增 `harness-architecture-and-workflow.md` 完整架构图

### 2026-07-15 AI 辅助开发方案选型
- **结论**：轻量知识库 + 强约束 MD 优于自建编排 Agent（人力不足 + 业务迭代重场景）
- **核心论据**：事前约束替代事后验证；编排 Agent 验证准确率需 ground truth 最终靠人；Agent 自身也静默漂移（元问题递归）
- **编排 Agent 适用前提**：10+ 人专职团队、业务稳定、验证基础设施完善、6 个月见效周期
- **知识库是编排 Agent 的前置条件，不是替代品**
- 面试文档在 `docs/面试准备-AI辅助开发方案选型.md`

## 双层架构：Harness 与项目 Skills 分工

### 架构边界
- **harness 层**（`e:\memory` 仓库）：纯知识归档，负责约束 + 上下文注入（Rules + Skills + Working Memory）
- **项目层**（实际业务代码库）：安装第三方 Skills（Superpowers / OpenSpec / SpecKit），负责工作流编排（TDD、系统化调试、brainstorming 等）
- **分工原则**：harness 管"AI 做事时要知道什么"（知识），项目 Skills 管"AI 怎么做事"（流程），互补不替代

### 规则注入三层体系（2026-07-16）
1. **全局个人规则**（`~/.claude/CLAUDE.md` / `~/.codebuddy/rules/` 等）：跨所有项目通用
2. **项目级规则**（`CLAUDE.md` / `AGENTS.md` / `.codebuddy/rules/RULE.mdc`）：项目特定，由 harness 中枢分发
3. **知识库**（`.specify/`）：按需加载

### 跨 IDE 适配
- `harness/ide-adapters/CLAUDE.md` → 分发到项目根 `CLAUDE.md`（Claude Code 自动加载）
- `harness/ide-adapters/AGENTS.md` → 分发到项目根 `AGENTS.md`（通用 fallback）
- `.codebuddy/rules/RULE.mdc` → CodeBuddy 强制加载
- `sync-harness.sh` 已支持 IDE 适配文件分发（`IDE_ADAPTER_FILES` 数组）

### 2026-07-16 Skills 生态调研
- 掘金文章《我筛了 1400 个 Claude Code Skills，留下 5 个天天在用的》核心判断标准：好 Skill 改变 AI 工作流程而非只换 Prompt
- 文章推荐 5 个中，Superpowers / find-skills / Deep Research 已有等价或已在项目使用
- 唯一潜在缺口：UI 设计审美约束（Taste Skill 思路），但需与项目现有设计系统组件库对齐

## 技术方向决策

### CodeBuddy IDE 适配
- MCP 不需要（当前 20 个 MD 文件规模，Rules + Skills + Working Memory 三层够用）
- MCP 适合场景：100+ 文件需语义检索、需连接 Jira/Confluence/数据库、需运行时动态查询
- Rules 格式：`.codebuddy/rules/<rule-name>/RULE.mdc`（YAML frontmatter + alwaysApply 字段）
- Skills 三级加载：元数据（始终）→ SKILL.md（触发时）→ references/（按需）
- Working Memory：`.codebuddy/memory/MEMORY.md`（长期）+ `YYYY-MM-DD.md`（每日日志）
