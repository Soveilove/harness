# 验证证据

> Feature: 020-quick-context-governance
> 阶段: verify

## 需求符合性验证

覆盖 TASK-001 ~ TASK-006 对应的规格验收场景，以自动化测试作为证据。

| 验收点 | 验证命令 | 结果 | 证据位置 |
|---|---|---|---|
| QuickRun 六阶段状态机拒绝跳步 | `node --test test/quick-contract.test.mjs` | pass（3 tests） | `test/quick-contract.test.mjs` |
| 升级后不可继续；中断保留 unverified 原因 | 同上 | pass | 同上 |
| usage append-only + interrupted 识别 + unknown/null token | `node --test test/usage-git.test.mjs` | pass（3 tests） | `test/usage-git.test.mjs` |
| Git verifier 真实 diff in-scope/out-of-scope/non-repo/unreadable | 同上 | pass（临时 Git 仓库） | 同上 |
| Context Policy 保留 full actual + scoped 影子保留全局红线 | `node --test test/context-policy.test.mjs` | pass（2 tests） | `test/context-policy.test.mjs` |
| `sovei quick` CLI escalate/completed/stopped 三态 | `node --test test/quick-cli.test.mjs` | pass（4 tests） | `test/quick-cli.test.mjs` |
| project init 保留 usage 历史 + gitignore + quick 声明 | 同上 | pass | 同上 |
| 全量回归 | `pnpm check` + `pnpm test` | pass：121 tests / 0 failures | 见下 |

### 全量回归证据

```
> pnpm check
> tsc --noEmit          # 通过，无输出

> pnpm test
> pnpm run build && node --test test/*.test.mjs
# tests 121
# pass 121
# fail 0
```

其中 020 相关 4 个测试文件（quick-contract / usage-git / context-policy / quick-cli）共 12 个用例单独运行全绿。

## 工程质量验证

- **TypeScript 严格编译**：`tsc --noEmit` 通过，无类型错误。
- **构建产物**：`pnpm run build`（clean-dist + tsc + build-release）成功生成 `dist/`。
- **并发/写纪律**：usage 追加经 `storage.withLock` 串行化；Git 参数经 `execFile`（不 shell 拼接），规避注入。
- **副作用隔离**：Quick 仅写 `harness/project/usage.jsonl`，不写普通 workflow events（由 `quick-cli.test.mjs` 断言 `usage.jsonl` 不含 workflow-events）。

## 已知限制

- CLI 只负责基线、真实 diff、硬风险与验证事实；**声明测试（`--test`）仍须宿主 Agent 实际执行并回报**，CLI 不代为运行。
- 标准 workflow 的 shadow 观测不改变实际上下文（actual=full），scoped/index+on-demand 仅作为测量影子。
- 本验证在 Windows PowerShell 环境执行；`.profile.ps1` / `cmd /c` 透传不影响命令正确性。

## 结论

需求符合性与工程质量均满足规格，无未关闭的高严重度发现，verify 阶段可完成。
