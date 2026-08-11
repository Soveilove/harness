# Scope: P2-7-quick-overdefense-fix

## 涉及模块

| 模块 | 入口 | 改动 |
|---|---|---|
| `src/quick/run.ts` | `evaluateQuickRun()` | `needsEscalation` 逻辑重构，expanded 降级，添加冷启动引导 |
| `test/quick-cli.test.mjs` | quick CLI 集成测试 | 更新 escalated 无 `--paths` 测试断言（report 新增冷启动引导行） |

## 不涉及

- `src/context/policy.ts` — 语义不变
- `src/quick/types.ts` — 类型不变
- `src/quick/git-verifier.ts` — 逻辑不变
- `src/cli/commands/quick.ts` — CLI 接口不变
- `test/quick-policy-slim.test.mjs` — 不受影响（不检查 git 字段）

## 影响面

- 极低，仅修改 `run.ts` 中约 15 行逻辑
- 向后兼容：`--json` 输出格式不变，status 字段不变
- 现有 escalated 场景（无 `--paths`）行为不变