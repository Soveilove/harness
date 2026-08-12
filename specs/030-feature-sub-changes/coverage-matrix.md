# 覆盖矩阵

> 由 Sovei 阶段生成：scope
> Feature：030-feature-sub-changes

---

## 覆盖追踪

| 验收标准 | 涉及模块 | 入口 | 状态 | 参数 | 产物 | 事件 | 兼容 | 测试 |
|---|---|---|---|---|---|---|---|---|
| AC-1 拆分命令 | feature.ts | `feature split <feature>` | SubChangeState[] | spec+scope 读取 | sub-change-map.md + 脚手架 | SUBCHANGE_CREATED | 无子变更时不出 map | 新增 |
| AC-2 独立推进 | workflow.ts, workflow-engine.ts | `workflow <stage> --sub-change <id>` | 子变更 currentStage | subChangeId 可选 | sub-changes/<id>/*.md | SUBCHANGE_STAGE_PREPARE/COMPLETE | 无 --sub-change 时走顶层 | 新增 |
| AC-3 依赖约束 | workflow-engine.ts | prepareStage(plan) 检查 dependsOn | 子变更 status | dependsOn[] | 报错信息 | — | — | 新增 |
| AC-4 聚合门禁 | workflow-engine.ts | prepareStage(learn) 检查全 merged | 子变更 status='merged' | — | learning-report.md | SUBCHANGE_MERGED | 无子变更时跳过门禁 | 新增 |
| AC-5 上下文聚焦 | context/builder.ts | `context build --sub-change <id>` | — | subChangeId | 聚焦上下文包 | — | 无 --sub-change 退化为当前 | 新增 |
| AC-6 向后兼容 | event-store.ts, state-machine.ts | replay 旧事件 | subChanges=[] | subChangeId 缺失=null | — | 旧事件格式 | 旧状态文件无 subChanges | 现有 192 测试不破 |

---

## 证据状态

| 项 | 状态 | 说明 |
|---|---|---|
| SubChangeState schema | confirmed | reconciliation.md Solution A |
| 4 事件类型 | confirmed | wayfind D-002 |
| 聚合门禁 | confirmed | wayfind D-003 |
| sub-change-map schema | confirmed | wayfind D-004 |
| 上下文聚焦 | confirmed | wayfind D-005 |
| replay 兼容 | candidate | 需 implement 后测试验证 |
| canExecuteStage 子变更路由 | candidate | 需 implement 后测试验证 |
