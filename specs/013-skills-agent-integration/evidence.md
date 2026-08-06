# 验证证据

> 由 Sovei 阶段生成：verify
> Feature：013-skills-agent-integration

## 工程质量

| 命令 | 结果 | 证据 |
|---|---|---|
| `pnpm run sovei:check` | 通过 | `tsc --noEmit` 无错误 |
| `node --test`（完整套件） | 80/80 通过 | 无回归；`agent.test.mjs` 更新为 7 适配器断言 |

## 需求符合性（临时项目实测）

完整链路：`project init` → `skills use --global` → `skills bind --enable` → `skills sync` → `skills status` → `skills clean`

| 验收项 | 命令/观察 | 结果 |
|---|---|---|
| 7 适配器注册 | `sovei skills status` | 列出 codex/claude/codebuddy/trae/gemini/aider/windsurf 及其上下文文件 |
| sync 覆盖全部适配器 | `sovei skills sync` | 渲染 6 个唯一文件：AGENTS.md/CLAUDE.md/.cursorrules/GEMINI.md/.aiderrules/.windsurfrules |
| 幂等 | 重复 `sync` | GEMINI.md 仍 1 start/1 end sentinel |
| clean 可逆 | `sovei skills clean` | 移除全部 6 文件段落，保留其余内容 |
| 渲染正确 | 读 GEMINI.md/.windsurfrules | `grill: sync-grill [ENABLED]` + `sovei workflow grill <feature>` 提示 |
| init AGENTS.md | 读新项目 AGENTS.md | 含 `sovei skills sync`/`clean` 声明 |

## 限制

- 未做真实 Agent（如 Claude Code CLI）端到端调用验证；渲染文件为文本指令，Agent 读取行为依赖各 Agent 自身，本次只验证文件生成正确性与幂等。
- MCP server 未实现（spec 明确排除，仅预留边界）。

## 结论

需求符合性与工程质量均通过。验收标准 1-9 全部满足，无未关闭发现。可进入 learn。
