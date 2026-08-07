# 探索记录：快速通道 + 上下文治理 + usage 记录

> Feature：020-quick-context-governance
> 来源：IDE Code Agent（Claude Code）会话讨论（`5cadfac5-…`），因上下文溢出转存为本文件。
> 性质：**大型、高不确定性**探索议题 → 本文件作为 load / grill / wayfind / spec 阶段的输入。
> 状态：探索已完成第一轮收敛，未开始写代码。

---

## 1. 背景与动机：三个场景问题

Sovei 建立在 IDE Code Agent（Trae / Claude Code 等）之上。当开发者在对话里用**自然语言**表达一个小需求（如"帮我改一下这个按钮"），现有工作流暴露出三个问题：

### 场景一（Agent 自由修改）：IDE Agent 不一定会主动进入 Sovei
- 在 Trae 里说"改一个东西"，Code Agent 可能直接搜索、修改代码。
- 当前 Trae 适配器只是向 `.cursorrules` 写入"可以调用 Sovei CLI"的提示（`For each workflow stage, invoke the bound skill via the Sovei CLI`），**不能强制 Agent 调用**。
- Trae 的 `toolExecution` 为 `false`，只能通过自然语言提示 Agent 调 CLI。
- 代码位置：`registry.ts:100-116`、`sync.ts:52-89`。

### 场景二（小需求进入场景）：一旦进入 Sovei，流程太重
- 当前所有 Feature 默认从 `S1` 开始，固定进入完整 12 阶段链。
- 类型里虽有 `S0`，但没有需求分类、风险计算或 S0 执行入口。
- 小需求在 `grill` 阶段就**强制要求生成 `decision-log.md`**，否则无法继续。
- `wayfinder skip` 只跳过 **Wayfinder 决策地图本身**，不能跳过前面的 `load → grill`。
- 即"一行文案修改"和"跨模块功能开发"实际走同一套流程 → **Token 消耗过大**。
- 代码位置：`state-machine.ts:15-30`、`workflow-engine.ts:45-52`、`stages/index.ts:62-110`。

### 场景三（轻量交付验证）：改完后无法证明"只改了目标，其他没变"
- 当前 `change-manifest.md` 主要依赖 Agent 自己填写，属**声明**而非基于真实 Git diff 的确定性证明。
- 引擎只验证 change-manifest 存在 + 包含当前任务 ID，不核对真实 diff。
- 需要证明两个层面：
  - **3.1 文件范围不越界**：只允许改目标文件，能自动报告意外修改的文件。
  - **3.2 行为范围不越界**：即使只改一个文件，也要检查共享接口、权限、数据结构、异步流程、业务红线是否受影响。
- 代码位置：`workflow-engine.ts:329-345`、`stages/index.ts:418-490`。

---

## 2. 第一轮收敛：方向性判断（用户已确认）

三个问题不是同一个修复点，方向**不是**"让所有 IDE Agent 先强制跑完整工作流"，而是围绕现有 **Wayfinder** 增加一层**前置需求分流与风险判定**：

```text
用户自然语言请求
    ↓
这是普通 IDE 修改，还是需要 Sovei 介入？
    ↓
低风险、明确、局部修改 → 直接处理（快速通道）
    ↓
高风险 / 不确定 / 跨模块 → 进入完整 Sovei / Wayfinder
```

已确认的第一轮三条边界（用户回答 Q1/Q2/Q3 均为推荐项）：

| 决策 | 结论 |
|---|---|
| 什么请求必须进入 Sovei | **A. 低风险修改默认直接执行**，高风险/不确定才进入（涉及多模块、共享契约、数据、权限、异步、红线、需求不清） |
| 小需求进入后最低保留什么 | **A. 轻量闭环**：需求确认 → 修改 → 真实 diff 检查 → 测试/检查 → 输出结果；不创建完整 Feature，不生成完整 decision-log/spec/plan/tasks/learn/sync |
| "其他没变"证明到哪一层 | **分层**：低风险默认文件范围证明（A）；触发风险信号升级行为范围（B）；完整 Feature 用基线状态证明（C） |

---

## 3. 快速通道（Quick Channel）方案

用户灵感：给 IDE Agent 一个**快速通道指令/Skill**，让开发每次做小需求就调用，轻量注入上下文，按已确认规则走，发现风险再升级，而不是默认启动完整工作流。

### 3.1 触发方式
- **用户显式入口为主**（`/sovei-quick` 或 `sovei quick`），Agent 可在自然语言场景下**建议**调用。
- Agent 不能自行把高风险需求降级为 quick；CLI 硬触发规则兜底。
- 权限边界：用户显式调用 → 允许；Agent 建议 → 可，但需先输出目标和排除项；CLI 发现硬触发风险 → 必须停止或升级；Agent 不能通过参数关闭风险检查。

### 3.2 最小运行契约：六步闭环
```text
Capture  →  Check  →  Confirm  →  Implement  →  Verify  →  Report
```
1. **Capture**：记录用户原话、目标、排除项、修改前基线。
2. **Check**：读取最小上下文，执行风险硬规则。
3. **Confirm**：Agent 用一句话复述"我将改 X，不改 Y"。
4. **Implement**：Agent 执行修改。
5. **Verify**：CLI 读取真实 diff，检查文件范围、风险信号，运行 Agent 声明的测试/检查。
6. **Report**：输出改了什么、没改什么、验证结果和未验证项。

**必须升级到完整 Sovei 的情况**：目标或排除项不清；修改超过声明范围；触及多个模块；命中共享契约、权限、数据、异步或红线；需要用户做范围选择；测试失败且原因不明确；真实 diff 与 Agent 语义说明不一致；Agent 无法证明"其他没变"。

### 3.3 分工：Agent 做语义，CLI 做事实
- **IDE Agent**：解释请求、提取目标/排除项、改代码、选测试、语义说明。
- **Sovei CLI**：记录基线、读真实 Git diff、查实际修改文件、查硬触发风险、记录验证命令和结果、输出机器可读轻量报告。

### 3.4 越界处理
发现范围越界（用户只说改按钮文案，Agent 改了 3 个文件或碰到共享配置）时：
- **立即停止交付，不自动回退，不自动创建完整 Feature。**
- 输出越界原因与建议，把"是否扩大需求范围"交给用户确认；用户确认后再用 `workflow bootstrap` 或变更控制进入完整流程。

---

## 4. 拷问中发现的 CLI 核心问题：上下文膨胀

对快速通道是否省上下文的拷问，暴露出一个**比快速通道更核心的 CLI 问题**——现有 `context build` 的上下文策略会随红线/规则增长而线性膨胀，且 `--paths` 语义误导。

### 4.1 已确认的事实（本地产物实测）
对单个目标路径执行 `sovei context build … --paths packages/sovei-core/src/adapters/registry.ts`，结果仍包含：
- 25 个 required 上下文项；
- 9 条 active redlines；
- 2 条 stable rules；
- 约 8116 个字符的 required 内容（**字符数，非 Token**）。

### 4.2 根因（代码位置）
- `context.ts:40-47`：无条件加载全部知识和全部红线。
- `context.ts:49-55`：`--paths` 只用于过滤**项目规范**，不过滤红线与 stable rules。
- `builder.ts:123-137`：把**所有** active redlines 和 stable rules 放进 required。
- `change-control/schemas.ts:10-12`：红线 `scope` 是**自由文本**，无法可靠做路径匹配。

**结论**：红线越多，required 上下文线性膨胀；`--paths` 给人"已按路径过滤"的错觉，实际只过滤项目规范。标准流程比快速通道更严重（还会叠加 Feature 产物、跨 Feature decision log、第三方 Skill、知识库等）。

---

## 5. 核心方向升级：统一 Context Policy 层 + 效果评测

问题从"快速通道怎么省上下文"升级为 **Sovei 全部入口的上下文治理与效果评估**。核心原则：

```text
上下文少 ≠ 上下文好
```
要寻找的是：**质量底线不下降 + 红线不漏检 + 需求理解不变差 + 越界修改率不升高 + 总 Token/延迟/成本下降**。

### 5.1 建立统一 Context Policy 层（用户确认 Q1）
Quick、标准工作流、Wayfinder、`context build` 共用同一层决定：
- 哪些内容 required / 只进 index / 按需展开；
- 当前阶段预算；
- 超预算后摘要 / 延迟加载 / 升级；
- 最终实际加载了什么（可审计）。

避免各入口各自实现一套筛选逻辑（否则会出现 quick 认为红线适用、implement 认为不适用、verify 又重新全量加载的断裂）。

### 5.2 红线三层分级（用户确认 Q3）
1. **全局不变量**（数量极少，始终注入）：如禁止路径穿越、事件事实源不可篡改、不得静默删除用户数据。
2. **结构化局部红线**（按字段匹配命中才加载全文）：
   ```json
   { "paths": ["src/billing/**"], "symbols": ["refund"], "domains": ["billing"], "stages": ["quick","implement","verify"] }
   ```
3. **候选/索引红线**（只提供 id + title + domain + scope summary）：无法判断是否相关时，不得静默忽略，应扩大检索或升级。

自由文本 `scope` 保留给人读，但不能继续作为唯一机器匹配依据。

### 5.3 阶段预算（用户确认 Q4）
标准流程按阶段职责分配预算（grill/wayfind 偏决策证据、implement 偏目标路径规则、verify 偏验收与真实 diff 等），但跨阶段保持一组**不变的基线**：
```text
Context Policy 版本 / baseline revision / 已命中红线 ID / 上下文选择决策 / 未加载候选项
```
否则不同阶段上下文不同，无法解释 implement 与 verify 为何结论不同。

### 5.4 预算计量单位（用户确认 Q4）
**双层预算**：
- 本地硬上限：用字符数/字节数做安全阀（CLI 无 API 凭据也可运行），但报告须标注"本地近似"。
- 模型真实 Token：有 API 时用 `count_tokens`，运行时记录真实 input_tokens / 缓存读写 Token，不同模型分别计量。

### 5.5 超预算与漏检处理（用户确认 Q5/Q6）
- 超预算：分级压缩（先移除低优先级建议项 → 全文换结构化摘要 → 按路径语义展开命中项 → 仍无法安全判断则升级/停止），**禁止静默截断**。绝对红线不能因预算不足被摘要后当作已充分检查。
- 红线漏检：**先自动扩展一次**，扩展后仍不确定再升级（不能全升级，否则 quick 退化成完整工作流；也不能允许继续，否则"没看到红线"被误当"没红线"）。

---

## 6. 效果评测：量化 Token 与实现效果（用户确认）

用户指出：量化 token 与实现效果的关系更有价值，且标准流程同样会出现上下文包问题。预算阈值**先不开发**，先收集数据再调整。

### 6.1 三步走（用户确认问题 5，推荐 A → B → C）
1. **只测量，不改变现有行为**：标准流程继续用完整上下文，同时记录真实 Token 基线（输入/输出/缓存读写/延迟/质量）。不裁剪、不截断、不升级。
2. **影子计算候选上下文**：CLI 同时计算 full / scoped / index+on-demand 三种结果，但只把当前完整上下文交给 Agent，报告中比较"当前发送多少 / 若裁剪多少 / 裁掉了什么 / 命中哪些红线 / 哪些不确定"。
3. **再做受控实验**：选代表性任务（小需求/单模块/跨模块/涉红线/需求不清/标准各阶段），根据质量底线决定预算和策略。

**关键**：在评测前最安全行为是"超过临时观测预算 → 标记 over-budget → 不改变现有上下文 → 报告候选裁剪结果 → 等评测后再决定"，避免同时改变上下文选择和执行质量导致无法归因。

### 6.2 评测指标
**成本**：输入 Token、缓存写入/读取 Token、输出 Token、模型调用次数、延迟、估算成本。
**效果**：任务完成率、测试通过率、红线召回率、红线误报率、越界 diff 率、升级率、人工修正次数、重开流程次数。

**放行门槛**：安全指标不劣化 + 质量指标不劣化 + 成本指标有明确改善；看 **Pareto 前沿**而非追求最少 Token。
```text
少 30% Token 但红线漏检上升 → 不接受
少 10% Token 质量不变 → 接受
多 5% Token 但少一次返工 → 可能更便宜
```

### 6.3 可比性约束
三种策略（A full / B scoped / C index+on-demand）对照时固定：同一任务描述、同一代码 commit、同一模型/配置、同一 Sovei/Skill 版本、同一红线知识快照、同一测试环境。
- 离线评测（同一任务跑三种策略）：测红线识别/需求理解/方案判断。
- 真实开发观测（只记录不强制切换）：测实际 Token/延迟/升级率/返工率/用户接受度。
- 两者分开；不把离线 Agent 结果当真实生产效果，也不只依赖真实数据（任务分布会变）。

---

## 7. usage 记录方案（已收敛）

用户提议：计费数据可补充进 harness，命中流程（快速通道/标准流程等）都记一条，初始化时添加专门文件，老项目升级/重开时保留不覆盖。

### 7.1 范围收敛（用户确认）
用户意识到"计费系统"会让 CLI 过于复杂。最终收敛为：
```text
Sovei 核心只记录使用事实，不负责账单计算
不要求用户配置价格，不默认输出金额
```
- 第一版只增加一个日志文件：`harness/project/usage.jsonl`。
- **不做**：billing.json、summary.json、价格换算、币种处理、费用命令、外部 telemetry。
- 用户若关心账单，可自行用脚本读 usage.jsonl 或未来加可选 billing 插件。

### 7.2 记录内容（轻量事实，不存敏感）
记录：入口和阶段、开始/结束时间、上下文条目数与大小、模型与 Skill 信息（若能获得）、Token usage（若宿主提供）、成功/失败/升级/中断状态。
**不记录**：完整用户原话、完整 Prompt、完整上下文、源代码、账单金额。
- 真实 Token 由 IDE/宿主尽力回传；不能回传时记录 `"status":"unknown", "inputTokens":null`，**不能把未知写成 0**。

### 7.3 事件粒度（第一版三类事件）
```jsonl
{"schemaVersion":1,"event":"run-start","runId":"...","channel":"quick"}
{"schemaVersion":1,"event":"context-selected","runId":"...","required":5,"indexed":12,"expanded":2,"characters":4200}
{"schemaVersion":1,"event":"run-end","runId":"...","status":"completed","escalated":false,"testsPassed":true}
```
进程崩溃时至少留下 start；缺失 run-end 可标记为 `interrupted`，不能假设成功或零成本。

### 7.4 归属路径（用户确认 Q1）
放 **`harness/project/usage.jsonl`**，默认加入 `.gitignore`（与 knowledge/governance/codegraph 结构一致，FilesystemStorage 可直接复用）。不采用 `.sovei/`（当前无统一约定）也不两份都写（重复事实、不一致、并发冲突）。

### 7.5 老项目升级与保留（用户确认 Q2）
采用"只补缺、不覆盖"：
```text
新项目：创建 usage.jsonl
已有项目：文件不存在 → 创建；文件存在 → 完全保留
init --force / onboard / rescan → 仍然保留（绝不覆盖使用量历史）
```
事件自带 `schemaVersion`，未来 schema 变化时新事件写新版本、读取端兼容旧版本、不重写旧历史。

### 7.6 共享与清理（用户确认 Q3）
- 原始 usage.jsonl 默认不进 Git；未来提供显式脱敏导出 `sovei usage export --redacted`（只保留入口/阶段/策略版本/条目数/升级/完成/测试结果/脱敏 Token/时间桶；删除用户原话、Prompt、源码、会话 ID、绝对路径）。
- **不自动清理**，提供显式命令：`usage status` / `usage export --redacted` / `usage clear --before <date>`；不提供无参数全量清理。

---

## 8. 其他已确认事实 / 澄清

- 仓库中**没有 `widfer`**，正确模块是 **`wayfinder`**（Wayfinder），已有 `wayfinder skip <feature> --reason "…"` 命令（`wayfinder.ts:41-51`、`selectors.ts:18-28`）。但 `wayfinder skip` 语义是"该 Feature 不需要决策地图"，**不是**"该需求不需要完整 Sovei 工作流"，两者当前被混在一起。
- 当前实际安装的第三方 Skill 是 **`mattpocock/grilling v1.0.0`**（不是 `grill-me`），已在 `harness/vendor/.../grilling/SKILL.md`，`skill-map.yaml` 绑定 `grill → mattpocock/grilling`，`workflow grill` 确实注入其"持续拷问/设计树/分轮/frontier"内容。运行位置：`bootstrap.ts:34-96`、`workflow-engine.ts:150-250`。
  - 曾误判为"初始化 Bug"，实为测试时用了 `project init --blank` 的临时项目（无 vendor 三方文件）导致回退 native；正确环境（复制 harness/）下正常注入。**非 Bug**。
- `skills status` 显示当前连接：grill/spec/wayfind → sovei/native；third-party 在实际仓库中为 `mattpocock/grilling`。文档中推荐的 `grilling/wayfinder/domain-modeling/code-review/handoff` 多数是设计推荐或原生阶段提示，非独立第三方 Skill。

---

## 9. 未决项与下一步

### 未决项
| # | 未决项 | 说明 | 处置 |
|---|---|---|---|
| U1 | 快速通道是否统一用 `sovei quick` 还是 `/sovei-quick` 指令 | 需定 CLI 命令形态与 IDE 侧触发方式 | spec 阶段定 |
| U2 | 快速通道最小上下文的确切构成 | "固定控制面 + 目标索引"，是否需新增 `context build --explain` 输出候选裁剪结果 | 结合 Context Policy 层设计 |
| U3 | usage.jsonl 默认 gitignore 后如何团队评测共享 | 需 `usage export --redacted` 的具体脱敏字段与命令 | 后续迭代 |
| U4 | `context build --paths` 语义修正（过滤红线/stable rules）是否与快速通道一起做 | 属共同基础设施问题，影响面较大 | 建议单独立项或与本次一并排期 |
| U5 | 标准流程各阶段的上下文预算值 | 先观测再定，不预先拍阈值 | 等评测数据 |

### 建议的后续工作流推进
1. **load**：加载本 Feature 状态与相关知识。
2. **grill**：用 grilling 对 U1/U2/U3/U4 等未决项逐一拷问定清。
3. **wayfind**：本议题为高不确定性，应建立决策地图（decision tickets / fog / frontier），而非 `wayfinder skip`。
4. **spec**：定义快速通道的用户可见行为、边界与验收场景，输出 reconciliation.md。

> 注：bootstrap 时出现 `workflow.version mismatch: project declares "3.0.0", engine expects "2.0.0"` 警告，与记忆"当前稳定版需核对"相关；若影响后续阶段推进需先对齐。
