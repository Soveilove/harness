# Plan — 029-feature-summary

> Feature：`sovei feature summary <id>`（P1-2）
> 阶段：plan（模块边界 / 数据流 / 契约）

## 模块边界

改动集中在 `src/cli/commands/feature.ts`，不新增模块文件。复用既有基础设施：

| 复用点 | 来源 |
|---|---|
| `StorageBackend`（read/write/list/exists） | `src/storage/types.ts`，经 `container` 注入 |
| `getFeaturePath(config, id)` | `src/config/loader.ts` |
| `getStorage()` / `getConfig()` | feature.ts 既有内部函数 |
| CLI 注册模式 | `registerFeatureCommands` 既有 |

## 数据流

```
sovei feature summary <id> [--json]
  │
  ├─ featurePath = getFeaturePath(config, id)
  ├─ state  = read workflow-state.yaml   （正则解析）
  ├─ events = read workflow-events.jsonl （逐行 JSON.parse）
  │
  ├─ 组装 SummaryData：
  │    ├─ overview    ← state (featureId/status/riskLevel/completedStages)
  │    ├─ timeline    ← events (BOOTSTRAP/STAGE_PREPARED/STAGE_COMPLETE/TASK_COMPLETE/OVERRIDE_CONFIRM)
  │    ├─ requirements← readArtifact('spec.md'|'reconciliation.md') 段落提取
  │    ├─ decisions   ← readArtifact('decision-log.md')  D<n> 正则提取
  │    ├─ changes     ← readArtifact('change-manifest.md'|'tasks.md')
  │    ├─ verification← readArtifact('evidence.md') + events OVERRIDE_CONFIRM
  │    ├─ learnings   ← readArtifact('learning-report.md'|'knowledge-delta.md')
  │    └─ conclusion  ← readArtifact('sync-report.md') 结论段
  │
  ├─ --json ? 打印 JSON（不写文件）
  └─ 否则 renderSummaryMarkdown(SummaryData) → storage.write(featurePath + '/summary.md')
```

`readArtifact(storage, featurePath, filename)`：**顶层优先，`_archive/` 回退**（D5 决策）：
```ts
async function readArtifact(storage, featurePath, file) {
  const top = await storage.read(`${featurePath}/${file}`);
  if (top !== null) return top;
  return storage.read(`${featurePath}/_archive/${file}`);
}
```

## 契约（SummaryData 结构）

```ts
interface StageInfo {
  stage: string;
  preparedAt?: string;
  completedAt?: string;
  artifacts: string[];
}
interface SummaryData {
  featureId: string;
  status: string;
  riskLevel?: string;
  stages: StageInfo[];        // 按工作流顺序
  decisions: { label: string; decision: string; reason: string; rejected?: string }[];
  tasks: { taskId: string; artifact?: string }[];
  overrides: { stage: string; role: string; reason: string }[];
  artifacts: string[];        // 顶层 + _archive 全部产物清单
}
```

## 迁移策略

- **无破坏性迁移**：新增命令，不改既有命令行为。
- **archive 白名单补充**：`feature.ts` 的 `PERSISTENT_FILES` 加入 `'summary.md'`（reconciliation Q2 决策），使 `feature archive` 不折叠 summary。此项需在 implement 一并改。
- **零运行时依赖**：yaml 正则、jsonl 逐行 parse、markdown 字符串拼接，均为 Node 原生。

## 段落提取规则（确定性，无 AI 改写）

- 需求：取 `spec.md` 的 `## 目标` 段（或 `reconciliation.md` 的 `## 1. 需求翻译` 后 `**技术理解**` 首行）；回退取 `load-summary.md` 标题下首段。
- 决策：`decision-log.md` 按 `/^### D\d+:\s*(.+)$/m` 分组，组内提取 `**决策:**`、`**理由:**`、`**被拒绝方案:**`。
- 变更：`change-manifest.md` 的 `## 目标` 段（若有）；回退从 `tasks.md` 提取任务标题。
- 结论：`sync-report.md` 的 `## 结论` 段。

## 风险与缓解

- 产物格式多样 → 全部用"提取失败则显示无"的防御性降级，不崩溃（D2）。
- yaml 解析脆弱 → 只解析已知键（status/riskLevel/completedStages/featureId），未知键忽略。
