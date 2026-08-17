# 变更清单

> 由 Sovei 阶段生成：implement
> AI 代理：请依据下方提示契约，将本模板替换为真实内容。

## TASK-001：WorkflowState v3 schema

### 修改文件

- `packages/sovei-core/src/engine/state-v3.ts`
- `packages/sovei-core/src/engine/index.ts`
- `packages/sovei-core/src/index.ts`
- `packages/sovei-core/test/workflow-state-v3.test.mjs`

### 行为

- 增加版本化 `schemaVersion: 3` 状态契约。
- 增加严格的 history、阶段游标、阶段前缀、prepared/reopened 和 status 不变量校验。
- `parseWorkflowStateV3` 要求提供 `stageOrder`，先做结构 schema 校验，再做工作流语义校验。
- 从包根导出 v3 schema、类型和构造/解析 API。

### 验证

- 构建通过。
- `workflow-state-v3.test.mjs`：11/11 通过。
- `tsc --noEmit` 通过。

### TASK-002：JSON StateStore

### 修改文件

- `packages/sovei-core/src/engine/state-store.ts`
- `packages/sovei-core/src/storage/filesystem.ts`
- `packages/sovei-core/src/storage/types.ts`
- `packages/sovei-core/src/engine/index.ts`
- `packages/sovei-core/src/index.ts`
- `packages/sovei-core/test/workflow-state-store-v3.test.mjs`

### 行为

- 使用版本化 `workflow-state.json` 读取和校验 v3 状态。
- 使用 revision/CAS 拒绝陈旧写入。
- 使用同目录随机临时文件 + 原子提交，避免目标文件暴露半写内容。
- 使用临时 owner 文件 + 原子创建实现锁；锁超时不自动删除活动锁。
- updater、schema、提交失败时保持原状态不变，并清理临时文件/锁。

### 验证

- 构建通过。
- StateStore 定向测试：`11/11` 通过。
- 包完整测试：`246/246` 通过。
- `tsc --noEmit` 通过。
- 双重代码审查通过。

### 剩余工作

- 单 Feature 状态转移：TASK-003。
- Engine 迁移：TASK-004。
- CLI 迁移：TASK-005。
- v2 EventStore/YAML 删除：TASK-006。

### TASK-003：单 Feature v3 状态转移

### 修改文件

- `packages/sovei-core/src/engine/transitions-v3.ts`
- `packages/sovei-core/src/engine/state-v3.ts`
- `packages/sovei-core/src/index.ts`
- `packages/sovei-core/test/workflow-transitions-v3.test.mjs`

### 行为

- `prepare` 幂等记录当前阶段。
- `complete` 必须先 prepare，只推进一个阶段，拒绝重复/越级。
- `reopen` 仅允许已完成阶段，并保持 v3 schema 可 round-trip。
- 所有成功转移递增 revision、写入 history；失败不修改输入状态。

### 验证

- 构建、类型检查通过。
- 定向转移测试：`8/8` 通过。
- 包完整测试：`254/254` 通过。
- 双重代码审查通过。

### 剩余工作

- Engine 迁移：TASK-004。
- CLI 迁移：TASK-005。
- v2 EventStore/YAML 删除：TASK-006。

---

## 提示契约

## 权威规则

当前 revision：0。仅当前顶层 Feature 产物具有权威性；history/ 下的文件是已失效证据，不得视为当前需求。

# 阶段：implement

## 输入
一个已就绪任务、Spec、Scope、Plan、规则和当前基线。

## 操作
只实施选定任务，保留无关改动，并按风险运行聚焦验证。

## 输出
产品/工具改动，以及记录任务、文件、行为、测试和剩余工作的 change-manifest.md。

## 完成条件
还有就绪任务时停留在 implement。所有必需任务完成或明确延期后，才能将 implement 标记完成。

## 停止条件
实施发现新决策、范围或设计约束时，重新打开最早失效阶段；不得静默扩大任务。

