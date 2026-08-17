# Spec：002-workflow-v3-state-core Workflow v3 状态核心

## 范围

本 Feature 重建单 Feature 工作流的持久化状态核心，不拆 Sub-change。

## 验收标准

### AC-1：唯一事实源

- 新 Feature 只使用 `workflow-state.json` 保存和读取当前工作流状态。
- 不创建、不读取 `workflow-events.jsonl` 或 `workflow-state.yaml`。
- Markdown 仅作为阶段产物或可重建视图，不能驱动状态恢复或推进。
- 状态文件包含当前 `schemaVersion`，未知版本明确拒绝读取。

### AC-2：合法阶段转移

- 状态更新只能完成当前 `currentStage`，并推进到下一个合法阶段。
- 重复完成当前已完成阶段、越级完成未来阶段、未知阶段均失败。
- 失败不修改 `workflow-state.json`。
- 不允许静默补齐中间阶段或通过伪造阶段事件跳跃。

### AC-3：审计与版本

- 每次成功状态变更递增 `revision`，并更新 `updatedAt`。
- `history` 记录变更类型、revision、时间、actor、来源阶段及必要原因。
- `history` 只用于审计展示，不参与恢复、推导或推进。
- 新状态写入包含 schema 版本和完整结构化状态。

### AC-4：安全持久化

- 状态写入采用同目录临时文件后原子替换。
- 读改写操作在 `StorageBackend.withLock` 内完成。
- 提供基于 revision 的陈旧写入拒绝；陈旧调用不能覆盖较新的状态。
- 损坏 JSON、缺失必填字段或未知 schema 明确失败，不回退读取旧 YAML、事件或 Markdown。

### AC-5：CLI 与引擎行为

- `bootstrap/status/prepare/complete/confirm/override-confirm/reopen` 使用 v3 状态。
- `replay` 不再回放事件，改为从状态和阶段产物重建/诊断 Markdown 视图。
- 单 Feature 的 12 阶段、确认门、reopen、任务完成行为保持可用。

## 非目标

- 不实现 `mode: split`、SC merge、父层聚合或重复 `learn` 修复；这些属于后续 R1.2。
- 不实现 Explore→Quick 路由或修改 Quick 执行语义；属于后续 R1.3。
- 不迁移、回放或兼容 v2 Feature、旧事件、旧 YAML fixture。
- 不实现 rescan 真增量、知识阈值或架构治理注入。

## 非功能约束

- Node.js CommonJS 发布产物和现有零运行时依赖约束保持不变。
- TypeScript 类型检查通过。
- 既有单 Feature 相关测试迁移为 v3 契约测试并通过。
- Windows 文件系统路径和原子替换行为必须有测试覆盖。
