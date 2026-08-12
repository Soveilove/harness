# 决策日志

> 由 Sovei 阶段生成：grill
> Feature：030-feature-sub-changes

---

## 一、事实核实（已决）

### F1 — 引擎当前不支持子变更
- **结论**：状态机单游标、单事件流、扁平产物、CLI 无拆分命令。详见 load-summary.md §2。
- **状态**：已决（事实）

### F2 — 现有 CHANGE_DECLARED/REOPEN 是回退重走，不是拆分
- **结论**：这两个事件把同一条工作流截断回退 + revision+1，不是派生并行子线。`assertNoPendingChanges` 在有 draft ChangeRequest 时冻结整个 Feature，与并行开发对立。
- **状态**：已决（事实）

### F3 — 项目自身已声明此缺口
- **结论**：TECH_SHARING_MATERIAL_POLISHED.md:326-359 明确"任务负责人和泳道状态不是一等数据"。
- **状态**：已决（事实）

### F4 — 零运行时依赖 + Node 14 兼容是硬约束
- **结论**：不能引第三方状态机库；不能用 `??=`/顶层 await。所有新增代码打进 `sovei.cjs`。
- **状态**：已决（事实）

### F5 — webplugin 的需求拆分模式（用户指定参考）
- **来源**：[prd-scope-analyzer.agent.md](file:///d:/project/harness/web-plugins/ec-web-ai-plugin/agents/prd-scope-analyzer.agent.md)、[change-execution-orchestrator.agent.md](file:///d:/project/harness/web-plugins/ec-web-ai-plugin/agents/change-execution-orchestrator.agent.md)
- **模式**：
  1. **AI 分析拆分**：`2-需求拆解` agent 读取 PRD → 按"功能内聚、可独立上线"原则自动划分为若干 change → 每个 change 含名称(kebab-case)、一句话目标、涉及需求条目、前置 change(依赖) → 检测循环依赖并自动合并。
  2. **用户确认**：通过交互工具展示分组 + 依赖 + 建议实施顺序，用户可合并/拆分/重命名/调整依赖，确认后落盘 `change划分.md`。
  3. **独立实现**：`4-spec编码` agent 一次会话只处理一个 change，检查前置 change 已完成后独立编码（服务→状态→视图分层）。
  4. **聚合**：落地审查 agent 汇总验收。
- **关键特征**：AI 驱动拆分 + 依赖图 + 多 agent 并行 + 聚合验收。
- **状态**：已决（事实）

---

## 二、可推断决策（已决，基于项目约定/既有模式）

### I1 — 子变更产物布局：`specs/<feature>/sub-changes/<id>/`
- **决策**：子变更产物存放在 `specs/<feature>/sub-changes/<id>/` 下。
- **理由**：遵循现有 `history/revision-N/`、`_archive/`、`change-requests/` 的子目录模式；与 Feature archive（白名单排除法）兼容。
- **被拒绝方案**：① 扁平 `sub-change-<id>-tasks.md` 前缀（命名混乱、难归档）；② 完全独立 `specs/<feature>-<subid>/`（破坏 Feature 归属）。
- **状态**：已决

### I2 — 向后兼容：无子变更的 Feature 自动走"隐式单管线"路径
- **决策**：现有 Feature（001-029）和新建但未 split 的 Feature 行为完全不变；子变更能力是可选增强，不 split 就退化成当前模型。
- **理由**：遵循项目"降级而非破坏"的既有模式（如 skills 未绑定时走 native）；保护 192 个现有测试。
- **被拒绝方案**：强制所有 Feature 都创建一个默认子变更（无谓开销 + 破坏现有产物契约）。
- **状态**：已决

### I3 — 事件流模型：单 Feature 单事件流 + 事件增加 `subChangeId` 可选字段
- **决策**：保持每 Feature 一条 `workflow-events.jsonl`，新增事件类型带 `subChangeId` 字段（顶层事件 `subChangeId = null`）。replay 时按 subChangeId 分桶还原各子变更状态。
- **理由**：避免文件 proliferation（N 个子变更 = N 个事件文件，难管理）；单流保留全局时序；replay 分桶逻辑可控。
- **被拒绝方案**：每子变更独立事件流 `workflow-events.<subId>.jsonl`（文件爆炸 + 跨子变更时序丢失）。
- **状态**：已决

### I4 — CLI 命令形态：`--sub-change <id>` 选项 + `feature split`/`feature sub-change` 子命令
- **决策**：现有 12 阶段命令加 `--sub-change <id>` 选项定位到子变更；新增 `feature split <feature> --into <name>` 创建子变更；`feature sub-change list/merge` 管理生命周期。
- **理由**：遵循现有 `--root`、`--adapters` 等 flag 模式；不新增顶层命令族，降低认知成本。
- **被拒绝方案**：全新 `subchange <stage>` 命令族（与 workflow 命令重复、割裂）。
- **状态**：已决

### I5 — 子变更标识：`SC-<feature>-<NN>` 序号
- **决策**：子变更 ID 形如 `SC-030-01`、`SC-030-02`，序号在 Feature 内递增。
- **理由**：遵循现有 `TASK-xxx` 命名约定；可读、可排序、不冲突。
- **状态**：已决

---

## 三、范围性决策

### Q1 — 子变更的粒度模型（已决，用户确认）

**用户回复**：参照 OpenSpec/SpecKit + webplugin 的需求拆分模式——AI 分析出多少就同步实现多少，然后聚合，类似大 feature 多 agents 架构。

**决策**：方案 B（共享前段 + 分叉后段），并吸收 webplugin 模式增强：
- 父 Feature 跑 load→grill→wayfind→spec→scope（共享理解与范围）
- **AI 驱动拆分**：scope 后 AI 分析并提议子变更划分 + 依赖图（用户确认）
- 子变更各自跑 plan→tasks→implement→converge→verify（独立开发与验证，可并行）
- 父 Feature 跑 learn→sync（聚合经验与同步）

**理由**：用户 7 项大需求共享同一上下文，不需各自 load/spec；但每项需独立 plan→verify 才能可控并行开发。webplugin 模式（F5）已验证此模式可行。
**状态**：已决

---

### Q2 — 子变更的状态独立性（已决，由 Q1 推断）

**决策**：子变更在 plan→verify 段各自有独立的 currentStage 游标。
**理由**：用户要"同步实现多"（并行），并行要求各子变更能处于不同阶段（一个 implement、另一个 verify）。单游标无法支持并行。
**被拒绝方案**：共享游标（所有子变更同进同退，退回串行，违背并行诉求）。
**状态**：已决（可推断）

---

### Q3 — 子变更的并行性（已决，由 Q1+Q2 推断）

**决策**：子变更可并行开发，但受依赖图约束（无依赖的子变更可并行，有前置依赖的须等前置完成）。
**理由**：用户明确"同步实现多"+"多 agents 架构"；webplugin 模式（F5）正是依赖图驱动的并行——每个 change 检查前置 change 完成后独立编码。
**被拒绝方案**：① 完全并行无依赖管理（顺序失控、冲突）；② 纯串行（违背并行诉求）。
**状态**：已决（可推断）

---

### Q4 — 子变更与 change-control 的关系（已决，由语义推断）

**决策**：新建一等实体 `SubChange`（独立 schema），不复用 `ChangeRequest`。
**理由**：`ChangeRequest` 语义是"回退重走"（targetStage + 截断 + revision+1），与"派生并行子线"语义完全不同。子变更需要自己的生命周期（created→planning→implementing→verifying→merged），不是回退。可复用 change-control 的治理模式（红线审查、失效归档），但不复用实体。
**被拒绝方案**：扩展 ChangeRequest 加 `parentFeatureId`/`lane` 字段（语义混淆——同一个实体既是"回退请求"又是"并行子线"，调用方难判断）。
**状态**：已决（可推断）

---

### Q5 — AI 驱动拆分在工作流中的位置（已决，自主决策）

**用户授权**：自主决策，走 wayfind 多角度分析后推荐。

**决策**：方案 A（scope 阶段产出 `sub-change-map.md`）。
**理由**：① 不破坏 12 阶段拓扑（向后兼容 I2 硬约束，保护 192 个测试）；② scope 阶段本就是"定义范围"，拆分是范围定义的自然延伸；③ scope 产物加一个 `sub-change-map.md`，plan 阶段读它定位到具体子变更；④ 方案 B 改拓扑代价过大，方案 C 让 plan 职责过重。
**状态**：已决（自主决策）

---

### 设计树总结（grill 收敛）

所有决策已决，设计树遍历完毕：

```
Feature 拆分能力
├── 粒度模型 (Q1=方案B): 共享 load→scope + 分叉 plan→verify + 聚合 learn→sync
├── 状态独立性 (Q2=独立游标): 子变更各有 currentStage
├── 并行性 (Q3=依赖图并行): 无依赖可并行，有依赖须等前置
├── 实体模型 (Q4=新建 SubChange): 不复用 ChangeRequest
├── 拆分位置 (Q5=scope 产物): scope 阶段产出 sub-change-map.md
├── 产物布局 (I1): specs/<feature>/sub-changes/<id>/
├── 向后兼容 (I2): 不 split 退化为单管线
├── 事件流 (I3): 单流 + subChangeId 字段
├── CLI (I4): --sub-change 选项 + feature split/sub-change 命令
└── 标识 (I5): SC-<feature>-<NN>
```

---

## 未决项清单

| # | 决策 | 依赖 | 状态 |
|---|---|---|---|
| Q1 | 子变更粒度模型 | 无 | 已决（方案 B + webplugin 增强） |
| Q2 | 状态独立性 | Q1 | 已决（独立游标） |
| Q3 | 并行性 | Q1、Q2 | 已决（依赖图并行） |
| Q4 | 与 change-control 关系 | Q1 | 已决（新建 SubChange 实体） |
| Q5 | AI 拆分在工作流中的位置 | Q1 | 已决（scope 阶段产物） |

**所有决策已收敛，frontier 为空。grill 阶段完成。**
