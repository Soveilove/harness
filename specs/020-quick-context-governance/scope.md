# 影响范围：020-quick-context-governance

## 1. 范围结论

本 Feature 影响 Sovei CLI 与核心引擎的本地工作流，不涉及被管理项目的业务运行时。主要影响面是：

1. QuickRun 用户入口与轻量闭环；
2. 统一 Context Policy 的选择、解释和审计元数据；
3. `context build --paths` 的影子候选计算与兼容性报告；
4. `harness/project/usage.jsonl` 的只追加事实记录；
5. 基于真实 Git baseline/diff 的 Quick Verify；
6. CLI、核心服务、Filesystem/Memory Storage 和测试覆盖。

## 2. 真实入口与状态

| 入口/模块 | 当前证据 | 本 Feature 影响 |
|---|---|---|
| CLI 根入口 | `packages/sovei-core/src/cli/index.ts:21-49` 注册 Commander、读取 `--root`、执行 bootstrap | 新增 `quick` 命令注册；保持 `--root` 和现有命令兼容 |
| 工作流命令 | `packages/sovei-core/src/cli/commands/workflow.ts:60-147` 注册 bootstrap/status/12 阶段 | 不改变标准 12 阶段顺序；Quick 不伪装成普通 stage |
| 工作流状态 | `packages/sovei-core/src/engine/state-machine.ts` + `workflow-engine.ts:78-99` 使用 append-only events replay | Quick 使用独立运行事实/状态，不污染 Feature stage state；升级完整流程时通过明确结果交接 |
| Context 命令 | `packages/sovei-core/src/cli/commands/context.ts:22-103` 读取 knowledge/redlines/rules/artifacts 并构建 pack | 复用统一 Context Policy；保留旧完整发送行为，增加解释/影子结果 |
| Context Builder | `packages/sovei-core/src/context/builder.ts:120-181` 无条件注入 active redlines 和 stable rules | 增加选择策略抽象或适配层；第一阶段不得静默裁剪 |
| 变更控制 | `packages/sovei-core/src/change-control/repository.ts:39-289` 管理红线、评估和重大变更 | Quick Check/Verify 复用红线事实和结构化命中结果；不削弱完整变更控制校验 |
| 项目初始化 | `packages/sovei-core/src/cli/commands/project.ts:163-298` 创建 harness 目录、知识、红线和规则文件 | 创建 usage 文件时只补缺；`--force`、onboard、rescan 不覆盖历史 |
| 存储 | `packages/sovei-core/src/storage/types.ts:6-41` 提供 read/write/writeIfAbsent/append/lock | usage 使用 append；初始化使用 writeIfAbsent 或等价只补缺语义；Filesystem/Memory 都需覆盖 |
| Git 事实 | 当前源码仅在 Skill upgrader/architecture analyzer 使用 child_process，未发现 Quick diff 服务 | 新增受限、可审计的 Git baseline/diff 读取能力；不把 Agent 自述当事实 |

## 3. QuickRun 生命周期

```text
入口（sovei quick / IDE 薄封装）
  → Capture：目标、排除项、baseline、run-start
  → Check：Context Policy + 风险硬规则 + 必要扩展
  → Confirm：目标/排除项/风险依据
  → Implement：Agent 修改目标范围
  → Verify：真实 Git diff + 风险信号 + 测试结果
  → Report：完成、停止、升级或未验证项
```

### 成功路径

- 明确、低风险、局部目标；Check 没有硬触发风险；Confirm 后修改未越界；Verify 真实 diff 与声明一致；测试/检查通过或明确记录未运行。

### 失败/恢复路径

- Check 发现高风险或不确定：停止 Quick，输出升级原因，不创建完整 Feature。
- Verify 发现越界：停止交付，不自动回退；用户确认扩围后另行进入 `workflow bootstrap` 或变更控制。
- 进程中断：至少保留 `run-start`；缺失 `run-end` 的运行可被标记为 interrupted。
- usage 写入失败：不得伪造成功或 token 零值；主流程是否阻断需在 plan 阶段明确，默认不让观测日志改变业务修改结果，但必须报告记录失败。

## 4. 参数与 I/O 边界

### 输入

- 用户目标与排除项；
- 可选目标路径/符号/领域；
- 当前工作树和 Git baseline；
- active redlines、project rules、knowledge snapshot；
- Agent 声明的测试/检查命令；
- 宿主提供的模型、Skill 和 token 使用信息（可选）。

### 输出

- QuickRun 机器可读结果和人类报告；
- Context Policy 选择/解释结果；
- `harness/project/usage.jsonl` 追加事件；
- 不自动修改标准 workflow state、完整 Feature artifacts 或用户源码之外的历史记录。

### 不在范围

- UI 状态管理、HTTP API、鉴权、计费、外部 telemetry；
- usage 导出、脱敏共享和账单；
- 未经评测批准的真实上下文裁剪；
- 自动回退越界修改；
- 强制所有 IDE Agent 进入 Sovei。

## 5. 兼容与迁移

- 现有 `workflow <stage>`、`context build` 和 Wayfinder 命令继续可用。
- 旧 `context build --paths` 调用继续返回现有完整上下文；第一阶段额外报告候选 scoped 结果和差异。
- 没有 `usage.jsonl` 的项目启动时创建；已有文件原样保留并只追加新 schema 事件。
- 旧 usage 事件通过 `schemaVersion` 读取兼容，不重写历史。
- CLI `--root` 必须继续决定 workspace root；不能依赖当前执行目录隐式切换。

## 6. 模块职责与压力

| 模块 | 职责 | 现有压力/风险 | scope 判断 |
|---|---|---|---|
| CLI commands | 参数解析和用户反馈 | 命令注册集中但可扩展；错误由顶层统一捕获 | 可接受，新增 quick/usage 入口需保持薄 |
| Context Policy | 统一选择和解释 | 当前选择逻辑分散在 command + builder；required 过宽 | 需要独立职责，避免继续堆在 builder |
| Git verifier | 事实 diff 与范围检查 | 当前无统一 Git 读取抽象；跨平台命令差异 | 作为边界适配器，先限定本地 Git 仓库 |
| Usage recorder | 追加事实日志 | 并发追加、崩溃半事件、宿主 token 缺失 | 需 schema 校验和 append-only 语义 |
| Workflow Engine | 完整流程编排 | 事件状态和 stage 契约已有稳定边界 | Quick 不应直接修改现有 stage reducer |
| Tests | CLI、context、storage、workflow 已有分层测试 | 当前没有 Quick/usage/Git verifier 覆盖 | 新增单元 + CLI + 真实临时 Git 验证 |

## 7. 证据限制

- 当前源码没有 QuickRun、usage recorder 或统一 Git diff verifier；这些边界标为实现候选，需在 plan/tasks 阶段定接口。
- 当前 `context build` 的实际行为已由 `context.test.mjs` 锁定为 active redlines/stable rules required；第一阶段应新增影子断言，不直接删除旧断言。
- UI、API、鉴权和计费路径在本地仓库未发现，标记为不适用而非遗漏。


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

