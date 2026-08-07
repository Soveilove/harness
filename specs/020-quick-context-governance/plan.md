# 实施计划：020-quick-context-governance

## 1. 实施原则

- 先建立可审计事实，再改变行为：第一阶段只记录完整上下文、影子候选上下文和选择解释，不切换标准流程的实际发送内容。
- Quick 是独立的运行契约，不新增普通 workflow stage，不修改 12 阶段顺序或现有 reducer。
- Agent 负责目标解释、确认、修改和测试声明；CLI/核心负责 baseline、风险硬规则、真实 diff、usage 事实和最终状态。
- 所有外部输入在边界校验；Git 命令使用参数数组调用，不拼接 shell 字符串；usage 事件按 schema 校验后追加。
- 现有模板、旧 workflow、旧 context build 和旧 usage 事件保持可读取；不得覆盖用户历史或自动回退源码。

## 2. 模块边界

### 2.1 QuickRun

新增独立 QuickRun 领域契约，至少包含：

- runId、channel、目标、排除项、声明路径/符号、baseline 摘要；
- `capture/check/confirm/implement/verify/report` 生命周期状态；
- stop/escalate/completed/failed/interrupted 结果；
- 风险命中、范围声明、实际 diff、测试声明和未验证项。

CLI 暴露 `sovei quick` 作为唯一权威入口。IDE slash 只负责把请求转发为相同参数/契约，不实现第二套逻辑。Quick 的状态保存在运行事实中，不写入普通 Feature 的 `workflow-events.jsonl`，除非用户明确升级并开始完整 Feature。

### 2.2 Context Policy

新增统一 Context Policy 选择层，由标准 `context build` 和 Quick 共同调用。它负责：

- 生成固定控制面；
- 按路径、符号、领域、阶段生成目标索引；
- 计算 required/indexed/expanded/unloaded 分层；
- 保留全局不变量和绝对红线；
- 输出命中红线、未加载候选、选择决策、扩展/升级/over-budget 状态；
- 生成 full 与 scoped/index+on-demand 的影子差异。

第一阶段保留现有 `ContextPack.required` 的实际内容，新增解释/影子字段；不得把候选结果误当成实际发送结果。现有 `buildContextPack` 的调用方通过兼容字段迁移，旧 JSON/Markdown 输出仍可读取。

### 2.3 Redline 与规则选择

- 将机器匹配所需的结构化路径、符号、领域、阶段字段纳入红线选择模型；自由文本 `scope` 仅作人读摘要。
- 全局不变量永远进入控制面；局部红线和 stable rules 先进入候选/影子计算。
- 相关性不确定时保留候选并自动扩展一次，仍不确定时返回升级/停止，不静默过滤。
- 现有 `ChangeControlRepository` 的红线 CRUD、重大变更校验和 append-only 事件保持兼容，不在本 Feature 重写变更控制流程。

### 2.4 Git Verifier

新增受限 Git 事实适配器，输入 workspace root、baseline 标识和声明范围，输出：

- baseline 是否可读取；
- 实际修改文件、文件级越界；
- 可供风险分析的 diff 摘要；
- 无法判断、非 Git 工作树或命令失败的明确状态。

使用 `execFile`/等价参数化调用，不接受用户拼接命令；不执行回退、checkout、reset 或其他写操作。Verify 只读真实状态。

### 2.5 Usage Recorder

新增 usage 事件 schema 和 append-only recorder：

- 事件：`run-start`、`context-selected`、`run-end`；
- 路径：`harness/project/usage.jsonl`；
- token 缺失使用 `status: unknown` 与数值 `null`；
- 每条事件带 `schemaVersion`，读取端按版本兼容；
- 使用 `writeIfAbsent` 初始化、`append` 追加，不覆盖已有文件；
- 原始 usage 默认加入项目 `.gitignore`，不实现 export/billing。

## 3. 数据流与状态转换

```text
CLI / IDE thin wrapper
  → create run + append run-start
  → capture baseline and request boundary
  → Context Policy full + scoped shadow result
  → append context-selected
  → hard-risk check
      ├─ blocked/uncertain → report escalation/stop + run-end
      └─ allowed → confirm boundary
                       → Agent implementation
                       → Git Verifier reads real diff
                           ├─ mismatch/overreach → stopped/escalated + run-end
                           └─ in-range → declared checks + report + run-end
```

- QuickRun 状态转换必须拒绝跳过 Check、Confirm 或 Verify 的成功结论。
- 进程崩溃或宿主中断时至少保留 `run-start`；读取统计将没有 `run-end` 的运行标识为 interrupted。
- usage 记录失败不能被伪造成成功或零 token；主流程的处理策略在任务阶段固定为“报告观测失败，避免改变源码交付事实”。
- 用户确认扩围后，不在同一 QuickRun 静默继续；输出进入完整 `workflow bootstrap` 或 change-control 的明确命令。

## 4. CLI 与兼容迁移

1. 新增 `quick` 命令及机器可读/人读报告输出；参数支持目标、排除项、路径/符号和声明测试，但不提供关闭风险检查的开关。
2. 扩展 `context build` 的 explain/shadow 输出能力；旧调用默认保持实际完整上下文行为。
3. 项目 `init`、`onboard`、`rescan` 初始化 usage 时只补缺；`--force` 不能覆盖 usage 历史。
4. 不新增本期 usage export、billing、费用或外部 telemetry 命令。
5. 在现有 CLI 根入口和 `--root` 语义下注册新命令，确保从仓库根目录和显式 `--root` 运行结果一致。
6. 公开必要领域类型/服务，使 CLI、测试和未来 IDE 薄封装复用同一契约；不暴露内部实现状态。

## 5. 实施顺序

### Phase A：契约与纯逻辑

- 定义 QuickRun、Context Policy、Usage Event、Git Verification 的 schema/type。
- 实现风险状态转换、上下文分层解释和 usage 事件校验的纯逻辑。
- 固定 schemaVersion、unknown/null token 语义和升级/中断状态。

### Phase B：事实适配器

- 实现 Filesystem/Memory Storage 下的 usage recorder。
- 实现只读 Git verifier 和临时仓库 baseline/diff 读取。
- 为 redline 增加结构化匹配字段的兼容解析；旧红线仍能加载。

### Phase C：统一 Context Policy

- 将 context command 和 builder 接入 Policy。
- 增加 full/scoped/index+on-demand 影子报告、选择理由和未加载候选。
- 保留现有 required 输出和现有 context 测试行为；新增影子结果断言。

### Phase D：Quick CLI

- 注册 `sovei quick`，串起六步生命周期和 usage 事件。
- 实现硬风险停止/升级、Confirm 边界、真实 diff Verify 和 Report。
- 保证越界不回退、不自动创建 Feature；只输出升级路径。

### Phase E：项目初始化与文档契约

- 初始化/升级项目时只补缺 usage 文件和 gitignore 条目。
- 更新项目声明中的稳定命令说明，但不覆盖用户已有非 Sovei 内容。
- 为 IDE 薄封装保留同一 QuickRun 调用契约；本 Feature 不实现宿主专属第二套流程。

## 6. 验证计划

### 单元验证

- QuickRun 状态不能跳步；硬风险、模糊目标、越界和不一致 diff 均转为 stop/escalate。
- Context Policy 保留全局不变量，正确分类 required/indexed/expanded/unloaded，并在不确定时保留候选。
- Usage schema 拒绝非法 token 零值替代 unknown/null；事件可追加且不覆盖历史。
- Git verifier 正确识别目标文件内修改、文件越界、无 Git、baseline 不存在和命令失败。

### CLI/集成验证

- `sovei quick` 成功、升级、越界、测试失败和中断场景。
- `context build --paths --json` 同时输出现有 full 包和影子差异，实际 required 行为不变。
- `project init --force`、onboard、rescan 和重复初始化均保留 usage 历史。
- 显式 `--root` 与默认仓库根目录运行结果一致。

### 真实运行验证

- 在临时 Git 仓库中完成一次单文件低风险 QuickRun，确认真实 diff 和 usage 事件。
- 在临时 Git 仓库中制造目标外文件修改，确认停止/升级且无自动回退。
- 运行现有完整 workflow/context 测试，确认标准流程和旧 context 行为无回归。
- 评测阶段仅检查 full/scoped/index+on-demand 可比性和记录完整性；不以本 Feature 宣称 Token 节省。

## 7. 完成门槛

- 所有 Quick/Context Policy/usage/Git verifier 关键路径有自动化测试。
- 旧 workflow、context build 和 redline/change-control 测试通过。
- usage 原始日志不包含完整用户原话、Prompt、源码、绝对路径或会话 ID。
- 第一阶段任何 over-budget 都不会静默截断或改变实际上下文。
- 规格中的非目标没有对应 CLI 入口或隐式副作用。


---

## 提示契约

## 权威规则

当前 revision：0。仅当前顶层 Feature 产物具有权威性；history/ 下的文件是已失效证据，不得视为当前需求。

# 阶段：plan

## 输入
有效的 Spec、Scope、Coverage Matrix、架构规则和决策。

## 操作
定义模块边界、状态/数据流、契约、迁移策略和验证方式。

## 输出
plan.md；不得修改实现文件。

## 停止条件
必需覆盖缺失时返回 scope；不得绕过未知项制定计划。

