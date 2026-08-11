# 任务清单：024-stale-aware-l1

> 由 Sovei 阶段生成：tasks
> Feature：过期感知 L1

- [ ] TASK-001: 新增 `getGitBranch()` 导出到 git-verifier.ts
- [ ] TASK-002: 新增 `stale-detector.ts` 模块（checkStale 核心逻辑）
- [ ] TASK-003: sync 阶段完成时写入仓库级基线文件
- [ ] TASK-004: `context build` 输出插入 stale 提示（Markdown 警告 + --json stale 字段）
- [ ] TASK-005: `quick` 输出插入 stale 提示（人类警告行 + --json stale 字段）
- [ ] TASK-006: 单元测试（stale-detector.test.mjs + sync 写入用例）

---

## TASK-001: 新增 getGitBranch() 导出

**What to build**: git-verifier.ts 新增导出 `getGitBranch(workspaceRoot)`，返回当前分支名（`git rev-parse --abbrev-ref HEAD`），失败返回 null。复用现有私有 `git()` 函数。

**Blocked by**: None — can start immediately

**Acceptance criteria**:
- [ ] 导出 `getGitBranch(workspaceRoot: string): Promise<string | null>`
- [ ] git 命令失败 / 非仓库时返回 null，不抛异常

## TASK-002: 新增 stale-detector.ts 模块

**What to build**: 新增 `src/stale/stale-detector.ts`，导出 `checkStale(storage, rootPath)` 返回 `StaleStatus`。读基线文件 → 取当前 HEAD + 分支 → 判定是否过期。全分支规则见 plan.md 契约。

**Blocked by**: TASK-001

**Acceptance criteria**:
- [ ] 导出 `StaleStatus` 接口与 `checkStale(storage, rootPath)`
- [ ] 无基线文件 → `isStale: false`
- [ ] HEAD 读取失败 → `isStale: false`
- [ ] 分支不同 → `isStale: false`
- [ ] 同分支且 HEAD !== 基线 → `isStale: true`
- [ ] 同分支且 HEAD === 基线 → `isStale: false`

## TASK-003: sync 阶段完成时写入基线文件

**What to build**: `workflow-engine.ts` 的 `completeStage` 在 stageName === 'sync' 时，调用 `getGitBaseline(rootPath)` + `getGitBranch(rootPath)`，若非 null 则写入 `harness/project/governance/sync-baseline.json`（`{ schemaVersion: 1, branch, head, recordedAt }`）。

**Blocked by**: TASK-001

**Acceptance criteria**:
- [ ] sync complete 后基线文件写入 branch/head/recordedAt
- [ ] 非 sync 阶段不写基线
- [ ] HEAD 读取失败时静默跳过（不写、不报错）

## TASK-004: context build 插入 stale 提示

**What to build**: `cli/commands/context.ts` build 命令 import `checkStale`，在 `pack.policy` 计算后、输出前调用；Markdown 模式在顶部输出「⚠ 治理资产可能已过期」警告段（含 baseline/currentHead/recordedAt），`--json` 模式给 `pack` 附加 `stale` 字段。

**Blocked by**: TASK-002

**Acceptance criteria**:
- [ ] `context build`（Markdown）stale 时顶部显示警告段
- [ ] `context build --json` stale 时输出含 `stale.isStale: true`
- [ ] 非 stale 时不显示警告（`--json` 的 `stale.isStale: false`）

## TASK-005: quick 插入 stale 提示

**What to build**: `cli/commands/quick.ts` import `checkStale`；人类输出加「⚠ 治理资产可能已过期」警告行，`--json` 给 result 顶层附加 `stale` 字段（不污染 QuickRunState schema）。

**Blocked by**: TASK-002

**Acceptance criteria**:
- [ ] `quick` 人类输出 stale 时显示警告行
- [ ] `quick --json` stale 时输出含 `stale.isStale: true`
- [ ] 不改动 QuickRunState schema（QuickRunStateSchema 版本不变）

## TASK-006: 单元测试

**What to build**: 新增 `stale/stale-detector.test.mjs` 覆盖 checkStale 全分支 + `quick/git-verifier` 的 getGitBranch；`workflow-engine` 新增 sync 写入基线用例。

**Blocked by**: TASK-002, TASK-003

**Acceptance criteria**:
- [ ] stale-detector 全分支测试通过
- [ ] sync 写入基线测试通过
- [ ] 全量测试通过（164 + 新增）
