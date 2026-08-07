# 决策地图：020-quick-context-governance

## 目标

形成可实施的快速通道、统一 Context Policy 与 usage 观测方案，并明确进入 spec 前的边界。

## 决策结构

```text
D-001 快速通道权威入口
  └─ D-002 快速通道最小上下文
       └─ D-005 标准阶段预算观测
D-003 usage 脱敏导出边界
D-004 context build --paths 语义范围
```

## 已完成决策

- [D-001 快速通道权威入口](decision-tickets/D-001.json)：`sovei quick` 是唯一权威实现入口；IDE `/sovei-quick` 只能是薄封装；二者共用同一 QuickRun 契约。用户显式调用允许进入 quick，Agent 只能建议且需先展示目标/排除项；CLI 硬风险规则不可关闭，高风险必须停止或升级。
- [D-002 快速通道最小上下文](decision-tickets/D-002.json)：采用固定控制面 + 目标索引 + 按需展开三层；不加载完整标准 Feature 产物。跨步骤保持 Context Policy 版本、baseline revision、红线命中、选择决策、未加载候选和升级状态；Verify 额外加载真实 Git baseline/diff、实际修改文件、风险信号和测试结果。
- [D-003 usage 脱敏导出边界](decision-tickets/D-003.json)：本 Feature 不实现 `usage export --redacted`、billing 或费用命令；只实现 `harness/project/usage.jsonl` 使用事实记录、unknown/null token 语义、只补缺不覆盖和默认 gitignore。导出另立 Feature。
- [D-004 context paths 语义范围](decision-tickets/D-004.json)：纳入统一 Context Policy 基础范围；第一阶段只做候选计算、解释和兼容性报告，不改变实际发送的完整上下文；第二阶段受控实验再切换 scoped 选择。全局不变量始终保留，无法安全判定时进入候选/升级，不静默过滤。
- [D-005 标准阶段预算观测](decision-tickets/D-005.json)：先只测量和影子计算，不预设预算阈值、不改变现有行为。记录策略版本、基线、上下文分层计数/大小、红线、未加载候选、over-budget、token（未知为 null/unknown）、延迟、状态和质量/安全指标；固定任务集与环境可比且安全/质量不劣化后，才进入受控实验。

## 尚未明确

（无）

## 范围外

- usage 脱敏导出、账单和费用计算。
- 评测数据产生前的预算阈值拍定。
- 未经受控实验批准的上下文裁剪或静默截断。

## 完成判定

- 5 张决策票据全部 resolved。
- 决策前沿为空，fog 为空。
- 下一阶段为 spec：把上述决策翻译成用户可见行为、契约、边界和验收场景；本阶段不实施代码。

