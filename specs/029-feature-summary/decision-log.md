# decision-log.md — 029-feature-summary

> Feature：`sovei feature summary <id>` — 生成聚合人可读视图（P1-2）
> 阶段：grill（决策解决）

## 决策树

### D1: `summary.md` 应写入 Feature 目录顶层还是 `_archive/`？

- **类型:** 可推断决策
- **决策:** 写入 Feature 目录**顶层**，命名为 `summary.md`。
- **理由:** summary 是**跨阶段聚合的人可读产物**，不是某个阶段的中间过程产物。放顶层与 archive 白名单持久文件（decision-log / sync-report / load-summary / wayfinder）语义一致——它是"要长期保留给人看"的产物。放 `_archive/` 会违背"归档=过程产物"的语义，且被折叠后难以被 `context build` 感知。
- **被拒绝方案:** 写入 `_archive/`（混淆持久/过程产物边界）；写入 `docs/` 独立目录（引入 clone 后不可见的新问题，DEV_BACKLOG 已否决独立 docs 思路）。
- **状态:** ✅ 已决

### D2: 对 in_progress 或产物缺失的 Feature 应如何处理？

- **类型:** 可推断决策
- **决策:** **不要求状态为 completed**。对任何状态都生成 summary，但对缺失的阶段/产物做防御性降级：缺失的阶段显示为"未执行"，缺失的产物段显示为"无"。
- **理由:** summary 的价值在于"看懂一个 Feature 走到哪、做了什么"。对 in_progress 的 Feature，它能作为进度快照；对归档后的 Feature（过程产物在 `_archive/`），它能还原完整故事线。若强约束 completed 且产物齐全，会大幅缩小适用场景（很多 Feature 未走完）。
- **被拒绝方案:** 只允许 completed（过度约束，覆盖不到 in_progress 快照场景）；产物缺失直接报错（对 reopen/归档后场景不友好）。
- **状态:** ✅ 已决

### D3: 是否支持 `--json` 结构化输出？

- **类型:** 可推断决策
- **决策:** 支持 `--json`。默认输出 Markdown 的 `summary.md`；`--json` 时打印结构化 JSON（阶段事件、产物清单、任务、门禁覆盖、决策条目）。
- **理由:** 与 P2-1 `--json` 全覆盖方向一致，summary 是典型的"聚合视图"，脚本/CI 消费 JSON 有价值（如自动生成发布说明、Feature 索引）。成本低——summary 内部本就是结构化数据组装，渲染 Markdown 只是一层输出格式。
- **被拒绝方案:** 只输出 Markdown（放弃脚本消费能力）；`--json` 仅打印路径不打印内容（无实质价值）。
- **状态:** ✅ 已决

### D4: summary 应包含哪些内容维度？

- **类型:** 可推断决策
- **决策:** 按 DEV_BACKLOG P1-2 定义的"需求→决策→变更→验证→经验"故事线，从事件流 + 产物组装以下章节：
  1. **概览**：Feature ID、状态、风险等级、创建/更新时间、阶段进度。
  2. **需求**：从 spec.md / reconciliation.md 提取目标（若无则从 load-summary / sync-report 目标回退）。
  3. **关键决策**：从 decision-log.md 解析 `D<n>: <问题>` 条目（决策/理由/被拒绝方案）。
  4. **阶段进度**：从 workflow-events.jsonl 的时间线（每阶段 prepared→complete 及产物）。
  5. **变更**：从 change-manifest.md（改了什么文件）+ tasks.md（任务完成情况）。
  6. **验证**：从 evidence.md / verify 阶段 + OVERRIDE_CONFIRM 门禁覆盖记录。
  7. **经验**：从 learning-report.md / knowledge-delta.md 提炼观察。
  8. **同步结论**：从 sync-report.md 结论段。
- **理由:** 这 8 个维度恰好覆盖 P1-2 要求的完整故事线，且每个都能从现有结构化数据确定性提取，不引入主观推测。
- **被拒绝方案:** 直接拼接各阶段 .md 全文（信噪比低，DEV_BACKLOG 已指出阶段产物本身已是摘要，再蒸馏一层意义有限——但 summary 是**跨阶段聚合**而非再蒸馏，价值在于把分散的时间线/决策/产物收拢成一眼看完的视图）。
- **状态:** ✅ 已决

### D5: 归档后（过程产物在 `_archive/`）如何读取产物？

- **类型:** 可推断决策
- **决策:** 读取产物时按"顶层优先，`_archive/` 回退"策略：先读顶层 `specs/<id>/<file>`，若不存在则读 `specs/<id>/_archive/<file>`。
- **理由:** archive 会把 spec.md / change-manifest.md 等过程产物移入 `_archive/`。summary 要对归档后的 Feature 也能还原故事线，必须能读到这两处。顶层优先保证未归档（当前活跃）Feature 读顶层，归档后自动回退。
- **被拒绝方案:** 只读顶层（归档后 summary 大量缺章节，价值大打折扣）；只读 `_archive/`（未归档 Feature 读不到）。
- **状态:** ✅ 已决

## 未决项

- 无（5 项决策全部解决）

## 实施范围（初稿，plan 阶段细化）

| 文件 | 改动 |
|---|---|
| `src/cli/commands/feature.ts` | 新增 `feature summary <id>` 子命令 + `summaryFeature()` 核心函数 |
| `src/cli/index.ts` | 无改动（feature 命令已在 index.ts 注册，仅扩展子命令） |
| `test/feature-summary.test.mjs` | 新增测试（completed / in_progress / 归档后 / 产物缺失 / --json） |

## 待验证假设（plan/spec 阶段确认）

- `workflow-events.jsonl` 是 summary 时间线主数据源，其事件类型枚举（BOOTSTRAP/STAGE_PREPARED/STAGE_COMPLETE/TASK_COMPLETE/OVERRIDE_CONFIRM）需在实现时与源码确认一致。
- `workflow-state.yaml` 用轻量正则解析即可满足（`archiveFeature` 已有 `match(/^status:\s*(\S+)/m)` 先例）。
