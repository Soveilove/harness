# 覆盖矩阵：020-quick-context-governance

| 需求/行为 | 入口 | 状态/生命周期 | 参数与 I/O | 风险/边界 | 验证证据 | 覆盖状态 |
|---|---|---|---|---|---|---|
| Quick 权威入口 | `sovei quick`；IDE `/sovei-quick` 薄封装 | QuickRun 独立运行，不推进普通 stage | 目标、排除项、可选路径/符号 | slash 不得有第二套语义 | CLI command test + contract test | 已实现并验证 |
| Capture | QuickRun | run-start 必须先落事实 | baseline 摘要、策略版本、runId | 不记录完整原话/Prompt/源码 | usage event test + interruption test | 已实现并验证 |
| Check | QuickRun + Context Policy | 检查通过/停止/升级 | 目标索引、规则、红线、候选 | 硬风险不能关闭；不确定先扩展一次 | risk matrix tests + policy tests | 已实现并验证 |
| Confirm | QuickRun 报告 | Implement 前必须确认目标/排除项 | 语义说明和风险依据 | 目标不清不得实施 | contract/CLI output test | 已实现并验证 |
| Implement | Agent 通过 QuickRun | 仅在 Check/Confirm 后执行 | 目标范围 | 不自动扩大、不自动回退 | integration harness test | 已实现并验证 |
| Verify 文件范围 | Git verifier | stopped/escalated/completed | baseline 与真实 diff | 目标外文件即越界 | 临时 Git 仓库测试 | 已实现并验证 |
| Verify 行为风险 | Git verifier + Context Policy | 触发升级或完成 | 共享契约、权限、数据、异步、红线信号 | 不能只凭文件范围通过 | risk signal tests + review evidence | 已实现并验证（风险信号由声明/策略结果记录，复杂行为仍升级） |
| Report | QuickRun | completed/failed/escalated/interrupted | 修改、未修改、测试、未验证 | 不得声称未验证项已通过 | report schema test | 已实现并验证 |
| 固定控制面 | Context Policy | 跨入口/阶段稳定 | policy version、baseline、命中红线、候选、选择决策 | 缺失时不可解释阶段差异 | context policy test | 已实现并验证 |
| 目标索引/按需展开 | Context Policy | Check/Implement/Verify 按需 | path/symbol/domain/stage | 无法判定保留候选，不能静默过滤 | selection test | 已实现并验证 |
| `context build --paths` 影子报告 | context command | 第一阶段实际发送行为不变 | full/scoped/index+on-demand 对照 | over-budget 不改变行为 | CLI context test + snapshot | 已实现并验证 |
| 全局不变量 | Context Policy | 始终保留 | absolute redline IDs | 不得因预算摘要而消失 | redline policy test | 已实现并验证 |
| usage run-start | usage recorder | 崩溃前至少存在 | schemaVersion、runId、channel、stage、start | 缺 run-end 识别 interrupted | filesystem append test | 已实现并验证 |
| usage context-selected | usage recorder | 每次选择后追加 | required/indexed/expanded/unloaded、大小、候选 | token unknown/null 语义 | event schema test | 已实现并验证 |
| usage run-end | usage recorder | 正常结束追加 | status、escalated、testsPassed、end | 不得伪造成功/零 token | end event test | 已实现并验证 |
| usage 保留 | project init/onboard/rescan/reopen | 文件只补缺、只追加 | `harness/project/usage.jsonl` | force 不覆盖历史 | project CLI test | 已实现并验证 |
| usage 非目标 | 无 export/billing 入口 | 不适用 | 不生成金额/脱敏导出 | 后续 Feature | negative CLI test | 已确认排除 |
| 标准阶段观测 | workflow/context | 现有行为保持 | full/scoped/index+on-demand 影子数据 | 阈值未定前不切换 | workflow/context integration test | 已定位，待实现 |
| 受控实验门槛 | evaluation harness | 后续实验阶段 | 固定任务、commit、模型、配置、知识快照、环境 | 安全/质量不劣化 | evaluation checklist/report | 规格已定，非本阶段实现 |
| UI/API/鉴权/计费 | 不适用 | 不适用 | 本地仓库无对应入口 | 不扩大范围 | repository search evidence | 已确认不适用 |

## 关键生命周期覆盖

- **成功**：低风险目标 → Check 通过 → Confirm → 修改 → 真实 diff 一致 → Report completed。
- **风险升级**：硬触发风险/不确定性 → Check stopped/escalated；不执行交付。
- **越界**：声明一个文件、真实 diff 多文件 → Verify stopped/escalated；不自动回退。
- **失败**：测试失败或语义与 diff 不一致 → Report failed/未验证项；不声称完成。
- **中断**：已写 run-start、未写 run-end → 后续读取识别 interrupted。
- **兼容**：旧 workflow/context 命令继续工作；旧 usage 事件按 schemaVersion 读取；已有 usage 不被 init/onboard/rescan/force 覆盖。


---

## 提示契约

## 权威规则

当前 revision：0。仅当前顶层 Feature 产物具有权威性；history/ 下的文件是已失效证据，不得视为当前需求。

# 阶段：scope

## 输入
有效的 Spec、当前源码树，以及存在时的最新架构健康快照。

## 操作
追踪真实入口、状态、参数、I/O、异步生命周期、消费者、恢复路径、兼容路径和验证面。
记录每个涉及模块的既有架构压力。不得仅因模块较大扩大 Feature；只有体积、churn、耦合、复杂度、
职责等多个信号叠加时才升级治理要求。

## 输出
scope.md 和 coverage-matrix.md；缺少证据的判断标记为 candidate。

## 停止条件
必需行为缺少证据，或影响面无法确定边界。

## 必需覆盖
入口/路由 → UI 状态 → store/service → 参数 → API → 鉴权/计费 → 异步回调 →
成功/失败/清理 → 历史/详情/重试 → 兼容入口 → 测试/文档/运行时证据。

