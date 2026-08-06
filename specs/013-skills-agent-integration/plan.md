# 实施计划

> 由 Sovei 阶段生成：plan
> Feature：013-skills-agent-integration

## 模块边界

1. **adapters/registry.ts**：新增 `gemini`/`aider`/`windsurf` 适配器；保留 `IDEAdapter` 接口与 `renderSkillDirectives` 契约；`mcp` 能力字段作为未来 MCP 扩展边界。
2. **skills/sync.ts**：`SkillAgentSync.sync()` 遍历 `adapterRegistry.list()` 渲染，覆盖随注册自动扩展；sentinel upsert / 幂等 / 去重 / clean / dry-run 逻辑不变。
3. **cli/commands/skills.ts**：`status` 增加已注册适配器清单；`sync`/`clean` 输出随覆盖数更新。
4. **cli/commands/project.ts**：init 生成的 AGENTS.md 补充 `skills sync` / `skills clean` 声明。

## 数据流

```
skill-map.yaml ──parse──> bindings ──adapterRegistry.list()──> per-adapter render
                                                                    │
                                                                    v
GEMINI.md / .aiderrules / .windsurfrules / AGENTS.md / CLAUDE.md / .cursorrules
（sentinel 段落 upsert，幂等，可 clean）
```

## 契约

- `IDEAdapter` 新增字段仅要求实现 `contextFile` + `renderSkillDirectives`（已有），新增适配器复用 `renderCliSkillDirectives`。
- 渲染保持只读信息注入：不改 Skill 执行/锁定/校验/回退。
- 共享上下文文件（AGENTS.md 被 codex+codebuddy 使用）去重，仅写一次。

## 迁移策略

- 无数据迁移。新增适配器注册后，下次 `sovei skills sync` 即生成对应文件；已有文件通过 sentinel upsert 增量更新，不破坏既有内容。

## 验证方式

- 临时项目实测：init → use → bind --enable → sync → 六种上下文文件生成且幂等 → clean 恢复。
- `pnpm run check` 类型检查通过。
- 确认新适配器默认被覆盖、`--adapter` 过滤生效、未接入 external skill 时 sync 正常。

## 不做（明确排除）

- MCP server 实现（仅预留 `mcp` 边界）。
- 斜杠命令注入。
- 覆盖用户已有上下文文件内容。
