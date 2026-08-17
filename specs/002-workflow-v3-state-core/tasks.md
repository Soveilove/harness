# Tasks：002-workflow-v3-state-core

> 这些是同一 Feature 内串行执行的 TDD 任务，不是 Sub-change。

- [x] TASK-001: 建立 `WorkflowState` v3 schema、history 类型和初始状态契约
  - 依赖：无
  - 范围：`engine/types.ts`、新 state schema/store 测试
  - 验收：schemaVersion、必填字段、history 和非法状态均有失败测试；旧 event 类型不再作为事实源
  - 验证：定向 state/schema 测试、`tsc --noEmit`

- [x] TASK-002: 实现 JSON StateStore 的读取、校验、锁和原子提交
  - 依赖：TASK-001
  - 范围：`engine/state-store.ts`、`storage` 原子写接口及测试
  - 验收：临时文件 rename、损坏 JSON/未知 schema 拒绝、revision/CAS 拒绝陈旧写入、失败不污染原文件
  - 验证：storage/state-store 定向测试（Windows）

- [x] TASK-003: 迁移单 Feature 状态机到 v3 命令转移
  - 依赖：TASK-001/002
  - 范围：`engine/state-machine.ts`、状态转移测试
  - 验收：bootstrap、prepare、complete、重复/越级拒绝、history/revision 更新；不实现 split 聚合
  - 验证：state-machine 定向测试

- [ ] TASK-004: 迁移 `WorkflowEngine` 核心读写入口
  - 依赖：TASK-003
  - 范围：`engine/workflow-engine.ts`、engine 测试
  - 验收：bootstrap/status/prepare/complete 使用 JSON Store；confirm/override/reopen/task 保持单 Feature 行为
  - 验证：workflow engine 定向测试

- [ ] TASK-005: 迁移 CLI 状态展示与 replay 诊断语义
  - 依赖：TASK-004
  - 范围：`cli/commands/workflow.ts`、CLI 测试/文档
  - 验收：status 读取 v3；replay 不读取旧事件/YAML，改为状态投影/诊断；旧文件不存在时正常工作
  - 验证：CLI 集成测试

- [ ] TASK-006: 删除 v2 事件/YAML 实现与旧 fixture，补齐回归
  - 依赖：TASK-005
  - 范围：删除 `engine/event-store.ts` 旧实现、旧 fixture，更新 imports/tests
  - 验收：源码无 Workflow v2 运行时读写；单 Feature 12 阶段、确认门、reopen、任务完成测试通过；Wayfinder/Quick/split 不回归
  - 验证：`check`、完整 `test`、diff 范围检查
