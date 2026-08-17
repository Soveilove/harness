# Scope：002-workflow-v3-state-core

## 影响范围结论

单一强耦合状态核心，保持 `no-split`。影响模块虽超过三个，但所有模块围绕同一 `workflow-state.json` 契约，无法独立交付。

## 纳入范围

| 模块 | 影响 | 处理 |
|---|---|---|
| `engine/types.ts` | WorkflowState/Event 类型 | 移除 v2 event-store 类型，增加 schema/history/CAS 相关状态契约 |
| `engine/state-machine.ts` | 阶段合法性与状态转换 | 保留单 Feature 主链，严格禁止重复/越级；split 行为留 R1.2 |
| `engine/event-store.ts` | 当前事实源与 YAML 解析 | 重写为 JSON StateStore，或删除并由新存储替代；不保留旧解析器 |
| `engine/workflow-engine.ts` | 所有状态读写入口 | 改为锁内快照读改写，统一 revision/history |
| `cli/commands/workflow.ts` | status/replay 等 CLI | 读取 v3；replay 改为状态/产物投影诊断 |
| `storage/*` | 原子替换与锁 | 补充同目录临时文件 rename 能力；复用现有 `withLock` |
| `test/*` | 运行时证据 | 重写状态/engine fixture 为 v3，增加损坏、schema、CAS、原子失败测试 |

## 排除范围

- Wayfinder 自身事件地图，不纳入 Workflow v3 状态源重构。
- `feature split`、SC merge、父层 aggregation，留 R1.2。
- Explore 路由、Quick 执行和升级，留 R1.3。
- 旧 Feature 数据迁移、旧事件回放和 YAML 兼容解析。
- rescan、knowledge、architecture、adapter 等无关模块。

## 关键路径

```text
CLI / WorkflowEngine
        ↓
WorkflowStateStore (JSON schema + lock + CAS + atomic replace)
        ↓
WorkflowState / strict transition reducer
        ↓
Markdown projection / status diagnostics
```

## 验证边界

- 正常 bootstrap → prepare → complete → status。
- 重复 complete、越级 complete、损坏 JSON、未知 schema、陈旧 revision。
- confirm、override、reopen、task complete 和单 Feature 12 阶段。
- Windows 路径、临时文件清理、失败写入不污染原状态。
