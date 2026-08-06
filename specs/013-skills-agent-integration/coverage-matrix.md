# 覆盖矩阵

> 由 Sovei 阶段生成：scope
> Feature：013-skills-agent-integration

## 必需覆盖项 → 证据/状态

| 覆盖维度 | 处理方式 | 证据/位置 | 状态 |
|---|---|---|---|
| 入口/路由 | `sovei skills sync/clean/status` 命令 | `cli/commands/skills.ts` | 已有，扩展输出 |
| UI 状态 | CLI 终端输出 | `cli/commands/skills.ts` | 已有 |
| store/service | SkillManager（map/lock） | `skills/manager.ts` | 已有 |
| 参数 | `--adapter`/`--dry-run` | `skills/sync.ts`、`cli/commands/skills.ts` | 已有 |
| API | `adapterRegistry.list()/get()` | `adapters/registry.ts` | 已有，扩展 |
| 鉴权/计费 | 不适用（本地 CLI） | — | 排除 |
| 异步回调 | 无异步生命周期（纯文件写） | `skills/sync.ts` | 排除 |
| 成功/失败/清理 | sentinel upsert；`clean` 幂等 | `skills/sync.ts` | 已有 |
| 历史/详情/重试 | 幂等 sync，无状态存储 | `skills/sync.ts` | 已有 |
| 兼容入口 | 不覆盖用户已有上下文文件 | 011 约束、`skills/sync.ts` | 已有 |
| 测试/文档/运行时证据 | 临时项目实测 + `pnpm run check` | change-manifest | 实现阶段补充 |

## 新适配器覆盖

| 适配器 | 上下文文件 | 渲染风格 | 状态 |
|---|---|---|---|
| codex | AGENTS.md | CLI | 已有 |
| claude | CLAUDE.md | Claude | 已有 |
| codebuddy | AGENTS.md | CLI | 已有 |
| trae | .cursorrules | CLI | 已有 |
| gemini | GEMINI.md | CLI | 新增 |
| aider | .aiderrules | CLI | 新增 |
| windsurf | .windsurfrules | CLI | 新增 |

## candidate（缺证据）

- 无。影响面明确，全部维度有证据。
