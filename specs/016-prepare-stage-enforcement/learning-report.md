# Feature 016 — Learning Report

## 核心发现

### 1. 外部 skill 绕过的根本原因

`completeStage` 不检查 `prepareStage` 是否被调用过。AI 可以直接写产物文件然后 `--complete`，完全跳过 skill 注入。这不是 skill 本身的问题，而是工作流引擎缺少 preparation 强制检查。

### 2. 事件溯源模式的优势

用 `STAGE_PREPARED` 事件追踪 preparation 状态，完全符合 Sovei 的事件溯源架构：
- 状态是 `fold(events)` 的结果
- 新事件类型是 additive 的，旧事件日志不受影响
- 不需要副作用文件或额外的状态存储

### 3. 测试需要跟随行为变更

新增强制检查后，6 个现有测试因为跳过了 prepare 步骤而失败。这正好验证了问题确实存在 — 这些测试本身就在"作弊"。

### 4. 吃自己的狗粮

Feature 016 本身走完了 12 阶段工作流，每个阶段都先 prepare 再 complete。外部 skill 在 grill（grilling）、spec（domain-modeling）、tasks（to-tickets）、implement（implement）、converge（code-review）、verify（code-review）阶段都被成功注入。这验证了修复有效。
