# 实施计划：024-stale-aware-l1

> 由 Sovei 阶段生成：plan
> Feature：过期感知 L1

## 模块边界

```
src/
├── stale/
│   └── stale-detector.ts        # 新增：过期检测核心（读基线 + 取 HEAD + 判 stale）
│   └── stale-detector.test.mjs  # 新增：单元测试
├── quick/
│   └── git-verifier.ts          # 增强：新增导出 getGitBranch()
├── engine/
│   └── workflow-engine.ts       # 增强：sync complete 时写基线
├── cli/commands/
│   ├── context.ts               # 增强：build 输出前插入 stale 提示
│   └── quick.ts                 # 增强：输出加 stale 警告/字段
```

## 数据流

```
写入（sync 完成）：
  completeStage('sync') → getGitBaseline(rootPath) + getGitBranch()
    → storage.write('harness/project/governance/sync-baseline.json',
       { branch, head, recordedAt })

读取（context build / quick）：
  checkStale(storage, rootPath)
    → 读 sync-baseline.json（无则 isStale=false）
    → getGitBaseline(rootPath)（null 则 isStale=false）
    → getGitBranch()（当前分支）
    → head !== baseline.head ? { isStale: true, ... } : { isStale: false, ... }
```

## 契约

### `stale-detector.ts` 导出

```ts
export interface StaleStatus {
  isStale: boolean;
  baselineRevision: string | null;  // sync 基线记录的 HEAD
  currentHead: string | null;       // 当前 HEAD
  recordedAt: string | null;        // 基线记录时间
  branch: string | null;            // 基线记录的分支
}

export async function checkStale(storage: StorageBackend, rootPath: string): Promise<StaleStatus>;
```

**判定规则**：
- 无基线文件 / HEAD 读取失败 / 分支不同 / HEAD===基线 → `isStale: false`
- 存在基线且同分支且 HEAD!==基线 → `isStale: true`
- 分支不同视为「未知」，不提示（跨分支场景由 P0-1 处理，L1 不覆盖）

### `git-verifier.ts` 新增导出

```ts
export async function getGitBranch(workspaceRoot: string): Promise<string | null>;
// git rev-parse --abbrev-ref HEAD，失败返回 null
```

### 基线文件 schema

```json
{ "schemaVersion": 1, "branch": "main", "head": "<sha>", "recordedAt": "<iso>" }
```

### `context build` 集成
- import `checkStale`，在 `pack.policy` 计算后、输出前调用。
- Markdown：`renderContextPackMarkdown` 之前，若 `stale.isStale` 则 `console.log` 警告段到 stdout 顶部。
- `--json`：`pack.stale = status`（`pack` 是动态对象，新增字段无类型破坏）。

### `quick` 集成
- import `checkStale`，`evaluateQuickRun` 返回的 result 顶层新增 `stale` 字段（在 `quick.ts` CLI 层附加，不改 `QuickEvaluationResult` 核心，避免污染 run 状态机）。
- 人类输出：在「状态/风险/基线」后加一行「⚠ 治理资产可能已过期」。
- `--json`：result 增加 `stale` 字段。

## 迁移策略

- 基线文件是运行时生成的新文件，不涉及既有数据 schema 变更，无迁移负担。
- `sync-baseline.json` 放入 `.gitignore`（个人运行时数据，非治理资产提交物），或按用户偏好提交——默认不提交（避免每个开发者 HEAD 不同造成 git 噪音）。

## 验证方式

- `pnpm run test` 全量通过（164 + 新增）。
- 手动验证：
  1. 新建基线 → 改代码提交 → `sovei context build` 显示警告 / `--json` 有 `stale.isStale: true`。
  2. 未 sync → `--json` 的 `stale.isStale: false`。
  3. sync 后 HEAD 相同 → 不提示。

## 不修改的实现文件（确认边界）

- `quick/run.ts` 核心状态机——stale 在 CLI 层附加，不改 QuickRunState schema（避免 schemaVersion 破坏）。
- `context/builder.ts`、`context/policy.ts`——不改核心打包逻辑，stale 是 CLI 输出层附加。
