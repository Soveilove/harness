# 实施计划

> 由 Sovei 阶段生成：plan
> Feature：004-artifact-version-guard

## 模块边界

### 新增：`src/config/artifact-version-guard.ts`

单一职责：产物版本一致性检查。不持有状态，纯函数 + storage I/O。

```ts
// 产物路径常量（与写入方一致）
export const ARTIFACT_FILES = {
  businessMap: 'harness/project/codegraph/business-map.json',
  redlineSeed: 'harness/project/governance/redlines-seed.json',
};

// 读产物 scannerVersion；不存在 / 损坏 / 无字段 → null
export async function readScannerVersion(
  storage: StorageBackend,
  path: string,
): Promise<string | null>;

// 读侧守卫：返回旧产物路径列表（scannerVersion 存在且 != VERSION）
export async function findStaleArtifacts(
  storage: StorageBackend,
  paths: string[],
): Promise<string[]>;

// 读侧守卫：若存在旧产物且未放行（force/refresh 均为 false），抛错阻断；
// 放行时打印放行提示。返回是否有旧产物。
export async function assertArtifactsCurrent(
  storage: StorageBackend,
  paths: string[],
  opts: { force: boolean; refresh: boolean },
): Promise<boolean>;

// 写侧守卫：返回旧产物版本号；无旧产物返回 null。供 onboard/rescan 打印刷新提示。
export async function getStaleArtifactVersion(
  storage: StorageBackend,
  path: string,
): Promise<string | null>;
```

### 修改：`src/cli/commands/project.ts`

- `map`：新增 `.option('--force')`、`.option('--refresh')`；action 开头调用 `assertArtifactsCurrent(storage, [businessMap])`。
- `status`：新增 `.option('--force')`、`.option('--refresh')`；action 开头调用守卫（聚合 businessMap + redlineSeed）。
- `onboard`：action 开头调用 `getStaleArtifactVersion(storage, businessMap)`，非 null 打印"检测到旧版产物（vX），本次将整体刷新为 vY"。
- 新增 `rescan` 子命令：描述"刷新旧产物并重新扫描"，复用 onboard 的 action 逻辑（抽取共享 handler 或直接调用同逻辑）。

### 修改：`src/cli/commands/governance.ts`

- `redline list`、`redline render`：新增 `--force`/`--refresh`；action 开头守卫 `[redlineSeed]`。

### 修改：`src/cli/commands/knowledge.ts`

- `knowledge list`：新增 `--force`/`--refresh`；action 开头守卫 `[redlineSeed, businessMap]`（间接——onboard 写入候选知识）。

## 状态 / 数据流

```
读侧：CLI 命令 → storage.read(产物JSON) → readScannerVersion → 与 VERSION 比较
      → 旧产物 & 未放行 → 打印警告 + throw（阻断）
      → 旧产物 & 放行   → 打印放行提示 → 继续执行
      → 新鲜/缺失      → 正常执行

写侧：onboard/rescan → getStaleArtifactVersion(businessMap)
      → 非 null → 打印刷新提示 → 扫描 → writeEvidenceFiles 覆盖写入（scannerVersion=VERSION）
```

## 契约

- 新增选项 `--force` 与 `--refresh` 为**别名**（commander `.option('--force, --refresh')`），布尔语义：放行旧产物读取。
- 新增子命令 `sovei project rescan`：与 `onboard` 等价，选项同 onboard。
- 版本比较：字符串精确相等（`scannerVersion !== VERSION` 视为旧）。
- 产物缺失 / 损坏：守卫静默跳过该路径（视为不旧），不阻断。
- 阻断行为：抛错导致非零退出码，与现有 `map` 的"文件损坏"抛错一致。

## 迁移策略

- 无 schemaVersion 变更，无数据迁移。
- 既有命令的既有调用（不带新选项）在新鲜产物下行为完全不变；仅在旧产物场景新增守卫行为。满足 `CLI_CONTRACT_STABILITY` 与 `NO_SILENT_DATA_LOSS`。

## 验证方式

- `test/artifact-version-guard.test.mjs`：新增，覆盖守卫模块各函数（新鲜/旧/缺失/损坏/放行/阻断）。
- `test/project.test.mjs`：补充 `map` 守卫阻断/放行、`onboard` 写侧提示、`rescan` 可用性场景。
- `test/redline-view.test.mjs`：补充 `redline render` 守卫场景。
- 运行 `pnpm run check`（tsc）与 `pnpm test`。
