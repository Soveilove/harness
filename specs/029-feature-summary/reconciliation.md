# Reconciliation — 029-feature-summary

> Feature：`sovei feature summary <id>`（P1-2）
> 阶段：spec（对齐确认）

## 1. 需求翻译

**PM 原话（DEV_BACKLOG P1-2）**：从 Feature 的事件流 + 各阶段产物中生成一个聚合的人可读视图（`summary.md`），包含需求 → 决策 → 变更 → 验证 → 经验的完整故事线。替代原"独立 docs 系统"思路——先做 CLI 生成静态 .md，零运行时依赖。

**技术理解**：
- "事件流" = `workflow-events.jsonl`（追加式 JSONL，含 BOOTSTRAP/STAGE_PREPARED/STAGE_COMPLETE/TASK_COMPLETE/OVERRIDE_CONFIRM）。
- "各阶段产物" = `specs/<id>/` 下（含 `_archive/`）的 `.md` 文件，每种阶段对应特定文件名。
- "聚合人可读视图" = 一条命令把分散的时间线/决策/产物收拢成单个 `summary.md`。
- "零运行时依赖" = 只用 Node 原生能力（正则解析 yaml、逐行 JSON.parse 解析 jsonl、String 操作），不引第三方库。

## 2. 现状还原（代码为什么是这样）

- **feature.ts 只有 archive 子命令**（Feature 026）：`archiveFeature(storage, featurePath, featureId)` 把过程产物折叠到 `_archive/`。它确立了"顶层持久白名单 + 其余 .md 归档"模式。
- **为什么需要 summary**：archive 之后，过程产物（spec/change-manifest/evidence 等）进了 `_archive/`，想还原一个 Feature 的完整故事线变得更难——必须知道去 `_archive/` 找。summary 是对 archive 的互补：archive 负责"收"，summary 负责"聚"。
- **现有读取范式**：`archiveFeature` 已示范 `storage.read` + `match(/^status:\s*(\S+)/m)` 解析 yaml、`storage.list` 列文件、`storage.exists` 检查。summary 完全复用这套，不新造轮子。

## 3. 方案与代价

| 方案 | 说明 | 代价/风险 |
|---|---|---|
| **A（选定）**：新增 `feature summary` 子命令，读事件流 + 产物，确定性组装 `summary.md` + `--json` | 复用 feature.ts 既有模式，零依赖，符合 DEV_BACKLOG | 需写 yaml/jsonl 轻量解析；需处理归档回退；工作量约 1 Feature |
| B：独立 docs 系统（git 外生成报告） | DEV_BACKLOG 已否决（clone 后不可见） | 高，方向被否 |
| C：summary 内容做 AI 二次蒸馏 | 引入模型改写，增加不确定性与依赖 | 违背"确定性组装"，过度工程 |

**选定 A**。理由：最低成本实现"聚合人可读视图"，且完全符合 P1-2 定义与零依赖约束。

## 4. 疑问提取

### [tech] Q1：`--json` 是否写入文件？

- **推荐**：`--json` 只打印到 stdout，不写文件；默认（无 `--json`）写 `summary.md`。
- **理由**：JSON 面向脚本消费，打 stdout 可管道；`summary.md` 是面向人的持久产物。
- **选项**：a) 打印 + 也写 `summary.json`；b) 只打印不写文件（**推荐**）。

### [tech] Q2：summary.md 是否加入 archive 持久白名单？

- **推荐**：是。summary 是跨阶段聚合产物，语义上属于"要长期保留给人看"的持久文件，不应被 archive 折叠。
- **理由**：若不加入，下次 `feature archive` 会把 `summary.md` 误当成过程产物折叠。
- **选项**：a) 加入白名单（**推荐**，需在实现时同步改 `feature.ts` 的 `PERSISTENT_FILES`）；b) 不加入（summary 可能被 archive 折叠，语义混乱）。

## 5. 验收确认

AC1-AC7 已定义在 `spec.md`。核心可测点：真实样例（027）生成正确、归档回退、--json 合法、in_progress 不崩、不存在报错、StorageBackend 写入、零回归。

## 结论

方案 A 可行，无阻塞性疑问。Q1/Q2 按推荐方案执行（`--json` 只打印；summary.md 加入 archive 白名单）。可进入 scope 阶段。
