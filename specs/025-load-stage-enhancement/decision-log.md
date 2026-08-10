# 决策日志

> 由 Sovei 阶段生成：grill
> Feature：025-load-stage-enhancement

---

## 1. 事实核实

### F1：TASK_TYPE_MAP['general'] 缺失 code-map 和 rule

**结论**：设计文档 §6.1 明确要求 load 阶段「只按任务域加载 Business Map、Code Map、规则和 Baseline」，但实现中 `TASK_TYPE_MAP['general']` = `['constitution', 'preference', 'architecture']`（`knowledge/store.ts:26`），缺失 `code-map` 和 `rule`。属于 bug 级差距。

**证据**：
- 设计文档 `design-docs/SOVEI_HARNESS_WORKFLOW_DESIGN.md` §6.1 第 160 行：「只按任务域加载 Business Map、Code Map、规则和 Baseline」
- 实现 `packages/sovei-core/src/knowledge/store.ts:26`：`'general': ['constitution', 'preference', 'architecture']`
- 对比其他 task type：`'specification': ['decision', 'architecture', 'code-map']`、`'planning': ['architecture', 'decision', 'rule']` 均包含 code-map/rule

**状态**：已决

### F2：load 是唯一不产出文件的阶段

**结论**：`producesArtifacts: []`，全工作流 12 个阶段中唯一不产出任何文件。grill prompt 写「## 输入：有效的 load 结果」，但 load 不产出任何文件供 grill 引用。

**证据**：
- `stages/index.ts:24`：`producesArtifacts: []`
- grill prompt（`stages/index.ts:86-87`）：`## 输入\n有效的 load 结果和当前请求。` — 无文件引用

**状态**：已决

### F3：load 是唯一没有 postExecute 的阶段

**结论**：全工作流 12 个阶段中唯一没有 `postExecute` 钩子。其他阶段（grill/wayfind/spec 等）均在 postExecute 中校验产物存在性。

**证据**：
- `stages/index.ts:19-58`：loadStage 定义无 postExecute
- `stages/index.ts:108-112`：grillStage 有 postExecute 校验 decision-log.md 存在
- `stages/index.ts:156-159`：wayfindStage 有 postExecute 校验 wayfinder.md 存在

**状态**：已决

### F4：load 无 skill 绑定

**结论**：8 个阶段有外部 skill 绑定（grill→grilling, spec→domain-modeling, tasks→to-tickets, implement→implement, converge/verify→code-review, learn→lesson-learned），load/wayfind/scope/plan 4 个阶段用 native prompt。

**证据**：grill 准备时输出「使用 Skill：mattpocock/grilling v1.0.0」，load 准备时输出「使用 Skill：native」

**状态**：已决

### F5：completeStage 对空 producesArtifacts 不做校验

**结论**：`completeStage` 调用 `validateProduced(stageDef.contract.producesArtifacts)`，空数组时 `validation.missing` 和 `validation.placeholders` 均为空，直接通过。意味着 load 阶段完成后无任何产物校验。

**证据**：`engine/workflow-engine.ts:294-301`

**状态**：已决

---

## 2. 可推断决策

### D1：TASK_TYPE_MAP['general'] 增加 code-map 和 rule

**决策**：在 `TASK_TYPE_MAP['general']` 中增加 `code-map` 和 `rule`，使其变为 `['constitution', 'preference', 'architecture', 'code-map', 'rule']`。

**理由**：设计文档 §6.1 明确要求，当前实现是遗漏。code-map 帮助 AI 理解代码结构，rule 确保从 load 阶段起就感知项目规范。现有 code-map 和 rule 知识条目较少（candidate 级），不会显著增加上下文体积。

**被拒绝方案**：
- 新建独立 task type `'load-exploration'` — 过度设计，load 就是 general 任务
- 在 preExecute 中直接 `loadByTaskType('specification')` — 规格阶段才需要 decision+code-map，load 需要 constitution+code-map+rule 更合适

**状态**：已决

### D2：增加 postExecute 校验

**决策**：为 loadStage 增加 postExecute，校验 workflow-state.yaml 的一致性（currentStage === 'load' 且 revision ≥ 0）。

**理由**：其他所有阶段都有 postExecute 做产物校验，load 不产出文件但也应校验状态一致性。如果状态文件被篡改或损坏，load 阶段应能发现。

**被拒绝方案**：
- 不加 postExecute — 与其他阶段不一致，且无状态校验
- postExecute 中做 code-map 加载校验 — 过度耦合，知识加载由 preExecute 负责

**状态**：已决

### D3：不绑定外部 Skill（P3 延后）

**决策**：本 Feature 不为 load 绑定外部 skill。

**理由**：①需先有 load-summary.md 产出（方向二）才有探索方法论可注入；②网络约束（github.com 不通）限制可用 skill 选择；③当前 native prompt 增强即可覆盖探索指导。

**状态**：已决

### D4：load-summary.md 由 AI agent 产出，postExecute 校验存在性

**决策**：load-summary.md 由 AI agent 根据 prompt 指导生成（类似 decision-log.md），postExecute 校验文件存在且非模板占位符。

**理由**：与 grill/wayfind/spec 产物模式一致——execute 返回 prompt，AI 写文件，postExecute 校验。

**状态**：已决

---

## 3. 范围性决策

### Q1：本 Feature 是否包含方向二（load-summary.md + grill requiredArtifacts 联动）？

**背景**：DEV_BACKLOG §3.5 将增强分为三个方向：
- P1 方向一：补齐知识加载 + postExecute（bug 级，小改动）
- P2 方向二：增加主动探索产出 load-summary.md + grill requiredArtifacts 联动 + prompt 探索方法论
- P3 方向三：绑定外部 skill（已决策 D3 延后）

方向一改动极小（几行代码），单独做一个 Feature 过于轻量。方向二是核心价值——解决 load→grill 信息断层。

➡️ **推荐**：包含方向一 + 方向二，合并为一个 Feature。方向一是 bugfix 性质的前置，方向二是实质性增强，二者自然耦合。

**状态**：已决（用户确认：包含方向一 + 方向二）

---

## 未决项清单

（无未决项，所有决议已确认）
