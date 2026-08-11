# Plan: 026-feature-archive

## 模块边界

### 新建：`cli/commands/feature.ts`

```
feature.ts
  └── registerFeatureCommands(program: Command): void
        └── feature (command group)
              └── archive <id> (子命令)
                    └── archiveFeature(storage, config, featureId): Promise<ArchiveResult>
```

### 修改：`cli/index.ts`
- 添加 `import { registerFeatureCommands } from './commands/feature.js';`
- 添加 `registerFeatureCommands(program);`

## 状态/数据流

```
用户执行 sovei feature archive <id>
  │
  ├─ 1. 解析 Feature ID → getFeaturePath(config, featureId) → featurePath
  │
  ├─ 2. 检查 featurePath 存在
  │     └─ 不存在 → 报错退出
  │
  ├─ 3. 读 workflow-state.yaml → 检查 status === 'completed'
  │     └─ 非 completed → 报错退出
  │
  ├─ 4. storage.list(featurePath) → 获取顶层文件列表
  │
  ├─ 5. 过滤：只保留 .md 文件，排除持久文件白名单
  │
  ├─ 6. 对每个可归档文件：
  │     ├─ 检查 _archive/ 是否已有同名 → 跳过
  │     ├─ storage.read(featurePath/file) → content
  │     ├─ storage.write(featurePath/_archive/file, content)
  │     └─ storage.delete(featurePath/file)
  │
  └─ 7. 输出归档清单（中文）
```

## 契约

### 函数签名

```typescript
/** 持久文件白名单——这些文件留在顶层不归档 */
const PERSISTENT_FILES = new Set([
  'decision-log.md',
  'sync-report.md',
  'load-summary.md',
  'wayfinder.md',
]);

interface ArchiveResult {
  archived: string[];   // 已归档的文件名
  skipped: string[];    // 跳过的文件名（已在 _archive/ 或非 .md）
  retained: string[];   // 保留在顶层的文件名
}

async function archiveFeature(
  storage: StorageBackend,
  featurePath: string,
  featureId: string,
): Promise<ArchiveResult>
```

### 错误处理

- Feature 目录不存在 → `Error: Feature 目录不存在: ${featurePath}`
- workflow-state.yaml 不存在 → `Error: 无法读取工作流状态`
- status !== 'completed' → `Error: 只能归档已完成的 Feature（当前状态: ${status}）`

## 验证方式

- 单元测试用 `MemoryStorage`，覆盖 coverage-matrix.md 中 7 个场景
- tsc 类型检查通过
- 现有 179 个测试不回归
