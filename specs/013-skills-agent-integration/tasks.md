# 任务清单

> 由 Sovei 阶段生成：tasks
> Feature：013-skills-agent-integration

## 依赖顺序

TASK-001 → TASK-002 → TASK-003 → TASK-004。每个任务独立可验证，依赖前一任务完成。

- [x] TASK-001: 新增 gemini / aider / windsurf 适配器并注册进 adapterRegistry
  - 文件/契约范围：`packages/sovei-core/src/adapters/registry.ts`
  - 验收：三个适配器可被 `adapterRegistry.get()`/`list()` 取到；各自声明 `contextFile`（GEMINI.md / .aiderrules / .windsurfrules）与 `renderSkillDirectives`；能力画像含 `mcp` 维度。
  - 验证：临时脚本调用 `adapterRegistry.list()` 断言含 7 个适配器。

- [x] TASK-002: 确认 skills sync 默认覆盖全部已注册适配器
  - 文件/契约范围：`packages/sovei-core/src/skills/sync.ts`（依赖 registry.list()，逻辑无需改，验证覆盖）
  - 验收：`sovei skills sync` 渲染出 AGENTS.md / CLAUDE.md / .cursorrules / GEMINI.md / .aiderrules / .windsurfrules 六种文件；每个文件仅一段 sentinel；重复 sync 幂等。
  - 验证：临时项目 init → sync → 断言六文件存在且 sentinel 唯一；再 sync 不重复。

- [x] TASK-003: skills status 展示已注册适配器清单
  - 文件/契约范围：`packages/sovei-core/src/cli/commands/skills.ts`、`skills/manager.ts`
  - 验收：`sovei skills status` 输出含 7 个适配器及其上下文文件。
  - 验证：运行 `sovei skills status`，人工/断言确认列出全部适配器。

- [x] TASK-004: project init 的 AGENTS.md 补充 skills sync / clean 声明
  - 文件/契约范围：`packages/sovei-core/src/cli/commands/project.ts`
  - 验收：新初始化项目的 AGENTS.md 含 `sovei skills sync` 与 `sovei skills clean` 的说明。
  - 验证：临时项目 init → 断言 AGENTS.md 含 sync/clean 命令。

## 验证方式

- 每个任务后运行 `pnpm run check` 类型检查。
- 最终在临时项目跑完整链路：init → use → bind --enable → sync → 六文件生成、幂等 → clean 恢复。
