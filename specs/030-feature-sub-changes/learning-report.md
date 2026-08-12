# 学习报告

> 由 Sovei 阶段生成：learn
> Feature：030-feature-sub-changes（Feature 拆分为多个子变更）

---

## 观察分类

### 1. 嵌入式子状态 vs 独立状态文件

**观察**：子变更状态嵌入 `WorkflowState.subChanges` 数组，与顶层状态同文件存储，而非为每个子变更创建独立的状态文件。

**原则**：Single Source of Truth（SSOT）+ KISS。所有工作流状态由单一事件流 replay 生成，子变更状态是事件流的派生投影。独立文件会引入"多文件一致性"问题。

**证据**：`event-store.ts` 的 `replay` 函数无需改动——reducer 按 `subChangeId` 路由，旧事件无 `subChangeId` 走顶层分支。YAML 往返测试验证序列化正确性。

**适用范围**：领域级——任何需要在单一实体下管理多个并行子状态的工作流系统。

### 2. 向后兼容的默认空数组模式

**观察**：`WorkflowState.subChanges` 默认 `[]`，所有子变更逻辑分支以 `subChanges.length > 0` 为前提。旧事件无 `subChangeId` 字段时，reducer 的 `default` 分支自然走顶层路径。

**原则**：Open/Closed Principle（OCP）——对扩展开放（新增子变更事件类型），对修改封闭（现有事件处理不变）。

**证据**：192 个原测试零破坏，旧事件 replay 测试验证向后兼容。

**适用范围**：领域级——事件溯源系统中新增事件类型时的兼容性模式。

### 3. 聚合门禁作为阶段前置条件

**观察**：父 Feature 进入 `learn` 阶段前，`prepareStage` 调用 `aggregationGate()` 检查所有子变更是否 merged。门禁逻辑独立于 reducer——reducer 只管状态转移，门禁在引擎层拦截。

**原则**：Separation of Concerns——状态转移（reducer）与阶段门禁（engine）分离。reducer 是纯函数，门禁是有副作用的校验。

**证据**：`aggregationGate` 是独立导出的纯函数，可单独测试；`prepareStage` 在调用 `canExecuteStage` 前先检查门禁。

**适用范围**：领域级——任何分叉-聚合工作流模式的门禁设计。

### 4. AI 自主拆分提示嵌入阶段提示契约

**观察**：P0-A 将"拆分评估"提示直接嵌入 scope 阶段的 `prompt` 末尾，而非创建独立的拆分阶段或独立的 agent 提示文件。AI 在完成 scope 产物后自然看到拆分信号。

**原则**：KISS——不新增工作流阶段（保持 12 阶段拓扑），不新增 agent 文件，而是在现有阶段提示中追加评估段。拆分是 scope 的可选产物，不是独立阶段。

**证据**：scope 阶段 prompt 新增"拆分评估"段；`feature split --json` 输出结构化提议契约供 AI 消费。

**适用范围**：领域级——在工作流阶段提示中嵌入可选评估，而非新增阶段。

---

## 知识提取

```yaml:knowledge-delta
observations:
  - title: "嵌入式子状态模式：子实体状态嵌入父实体状态同文件存储"
    type: architecture
    content: >
      当一个工作流实体（Feature）需要管理多个并行子实体（SubChange）的状态时，
      将子状态嵌入父状态的同文件（如 WorkflowState.subChanges 数组），
      而非为每个子实体创建独立状态文件。所有子状态由同一事件流 replay 生成——
      事件携带 subChangeId 字段路由到对应子状态，无 subChangeId 的旧事件自然走顶层路径。
      这避免了多文件一致性问题，且向后兼容（默认空数组）。
    tags: [event-sourcing, state-management, backward-compatibility, sub-change]
    category: candidate
    evidence: "Feature 030：WorkflowState.subChanges 嵌入式存储，4 个子变更事件类型携带 subChangeId 路由，192 个原测试零破坏"
    relatedEntryId: null

  - title: "聚合门禁独立于状态转移：门禁在引擎层拦截，reducer 保持纯函数"
    type: rule
    content: >
      分叉-聚合工作流中，聚合门禁（如"所有子变更 merged 后才能进入聚合阶段"）
      应作为引擎层 prepareStage 的前置校验，而非 reducer 的一部分。
      reducer 是纯函数只管状态转移；门禁是有副作用的校验，需抛错并报告阻塞项。
      门禁逻辑应导出为独立纯函数（如 aggregationGate），可单独测试。
    tags: [aggregation-gate, separation-of-concerns, workflow-engine]
    category: candidate
    evidence: "Feature 030：aggregationGate() 独立导出纯函数，prepareStage('learn') 调用检查全部 merged"
    relatedEntryId: null

  - title: "AI 自主评估嵌入阶段提示契约，而非新增工作流阶段"
    type: preference
    content: >
      当需要在某个工作流阶段后提供可选的 AI 评估能力（如"是否拆分 Feature"）时，
      优先将评估提示嵌入该阶段的 prompt 末尾，而非新增独立工作流阶段或独立 agent 文件。
      保持工作流阶段拓扑不变（如 12 阶段），评估是当前阶段的可选产物。
      配合结构化的 CLI 提议契约（如 --json 输出），AI 可自主触发后续操作。
    tags: [ai-prompt-design, workflow-topology, kiss]
    category: candidate
    evidence: "Feature 030：scope 阶段 prompt 新增'拆分评估'段，feature split --json 输出提议契约"
    relatedEntryId: null
```
