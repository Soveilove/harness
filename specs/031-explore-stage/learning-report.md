# 学习报告

> Feature：031-explore-stage
> 阶段：learn

---

## 关键学习

### 1. 需求侧与代码侧职责正交

explore 阶段（需求侧：读 PRD + 业务覆盖面 → 需求理解 + 拆分提议）与 load 阶段（代码侧：读源码 → 现状探索 + 风险识别）职责正交，避免了重复读代码的上下文浪费。这是本次设计的核心洞察——工作流的第 1 阶段应该先理解"要做什么"，再理解"现状如何"。

### 2. 入口命令兼任模式

`workflow explore` 命令兼任 Feature 入口（--prd/--brief），将原本需要两步（bootstrap + explore）的操作合并为一条指令。这种模式降低了用户使用门槛，符合"一条指令搞定"的体验预期。关键实现：explore 命令内部调用 engine.bootstrap()，并根据参数复制 PRD 或写入 brief.md。

### 3. 向后兼容的 skippedStages 模式

新增阶段时，老 Feature 的事件流不含新阶段事件。通过 state-machine.ts 的 skippedStages 逻辑（计算 currentIndex 到 eventIndex 之间的阶段为"跳过"），实现了无缝兼容。这个模式可复用于未来新增阶段。

### 4. 两层拆分评估互补

explore 做首次拆分（基于需求功能域），scope 做二次修正（基于代码影响面）。两层互补而非冲突——explore 的拆分提议是草稿，scope 可基于代码实际情况调整。feature split 的前置条件从"需 spec.md + scope.md"放宽到"需 exploration.md"，让拆分决策可以更早发生。

### 5. 业务覆盖面报告作为共享上下文

business-coverage.md 在 onboard 时生成一次，供所有 Feature 的 explore 阶段共享。这避免了每个 Feature 都重新扫描业务边界，同时保持业务理解的新鲜度（每次 onboard 覆盖更新）。

## 可复用模式

- **阶段新增 checklist**：① 定义 stage ② 更新 stageOrder ③ 状态机兼容 ④ CLI 命令 ⑤ IDE 适配器 ⑥ 测试
- **命令兼任入口**：通过 --prd/--brief 参数让阶段命令同时承担 Feature 创建职责
- **前置条件放宽**：优先检查新条件，回退到旧条件，保证向后兼容

## 教训

- 测试中需要 `skipExplore` 辅助函数模拟跳过 explore 阶段，否则所有依赖 load+ 阶段的测试都会因 explore 未完成而失败
- YAML 序列化字符串带引号（`currentStage: "explore"`），测试断言正则需兼容引号
- implement 阶段的 --task --complete 流程不设置 stage prepared 标志，需先用 --task 准备再 --complete 完成阶段
