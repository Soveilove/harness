# 需求探索

> 由 Sovei 阶段生成：explore
> AI 代理：请依据下方提示契约，将本模板替换为真实内容。

## 1. 需求理解

### 真实意图

重建工作流状态核心，消除事件流、YAML 缓存和 Markdown 流程输入并存造成的状态漂移；为后续 split 聚合和 Explore→Quick 路由提供稳定、可校验的状态底座。

### 本 Feature 目标

- 使用版本化 `workflow-state.json` 作为唯一事实源。
- 状态更新具备原子写入和 revision/CAS 保护。
- 阶段只能从当前阶段合法推进，禁止重复完成、越级完成和静默补齐。
- 在状态文件内保留只读审计 `history`，不支持事件回放。
- Markdown 只作为人类/阶段产物投影，不能反向决定当前状态。
- 旧 `workflow-events.jsonl`、`workflow-state.yaml` 及其解析/回放兼容逻辑不进入 v3。

### 非目标

- 本 Feature 不实现 `mode: split` 的聚合协议、SC merge 或父层 `learn` 聚合。
- 本 Feature 不实现 Explore→Quick 路由、Quick 受控执行和升级路径。
- 本 Feature 不实现 rescan 真增量、知识阈值或架构治理注入。
- 不迁移、回放或兼容已有 v2 Feature 数据；旧历史数据在 v3 切换时归档或删除。

## 2. 当前代码现状

| 区域 | 当前实现 | 问题 |
|---|---|---|
| `src/engine/event-store.ts` | `workflow-events.jsonl` 事件追加、事件 replay、`workflow-state.yaml` 序列化/解析 | 一个模块同时承担事实源、投影和恢复；旧数据格式复杂且容易漂移 |
| `src/engine/workflow-engine.ts` | 多数操作 append event 后 replay，再持久化 YAML | 所有状态变更依赖旧事件模型；需要改为读写 v3 JSON |
| `src/engine/state-machine.ts` | reducer、阶段合法性、Sub-change 与聚合逻辑混在一起 | 允许的历史兼容和 split 逻辑会污染 R1.1；本轮应保持单 Feature 主链并移除前向跳过 |
| `src/engine/types.ts` | `WorkflowState` 缺少 schema/history/明确执行范围 | 当前状态不能表达 v3 版本、审计和 CAS 语义 |
| `src/cli/commands/workflow.ts` | status 直接展示 YAML/replay 还原状态；`replay` 语义是重放事件 | CLI 需迁移到 JSON 状态并将 replay 改为投影重建/诊断 |

## 3. 依赖与风险

- 这是核心状态层改动，影响 workflow engine、CLI、阶段产物和大部分 engine 测试。
- 旧 fixture 不能作为 v3 行为依据；测试应重写为新 schema，不保留 v2 migration 断言。
- 原子 rename 在 Windows 上需要处理目标文件替换行为；必须覆盖损坏 JSON、未知 schema 和陈旧 revision。
- `history` 只能审计，任何恢复/推进逻辑不得读取历史推导当前状态。
- 现有 `split` 测试属于后续 R1.2；R1.1 只需明确不破坏编译与单 Feature 基础能力，不能顺手实现 split。

## 4. 需求拷问结论

经过多轮 grill-me 反问，保留以下决策：

1. **为什么不是继续修 event sourcing？** 当前需求优先级是可验证的状态正确性，不需要任意历史重放；旧事件语义已包含伪阶段完成和兼容推断，重建比修补更安全。
2. **审计是否需要独立事件文件？** 不需要。`history` 记录操作、revision、时间和原因即可；它不可驱动恢复，避免第二事实源。
3. **状态文件损坏怎么办？** 拒绝读取并明确报错，不从旧 YAML、事件或 Markdown 猜测恢复；由人工删除/重新 bootstrap。
4. **并发怎么处理？** 单目录原子替换 + revision/CAS；陈旧写入拒绝，不能后写覆盖先写。
5. **R1.1 为什么不顺带做 split/Quick？** 它们依赖稳定的状态语义，且各自是独立需求；本轮保持单一目标、单一验收面。

## 5. 结论

本 Feature 为单 Feature、`no-split`、高风险核心重构。实现前必须先通过 `grill`、`wayfind`、`spec`、`scope` 的正式门禁；代码只在 `implement` 阶段修改。

---

## 提示契约

## 权威规则

当前 revision：0。仅当前顶层 Feature 产物具有权威性；history/ 下的文件是已失效证据，不得视为当前需求。

# 阶段：explore（工作流唯一入口）

explore 是整个工作流的起点，也是最需要“想清楚”的阶段。它不是一个把 Feature ID
翻译成目录的登记步骤——它是让 AI code agent **带着上下文（宪法/偏好/架构/代码地图/规则）
和业务红线，去读懂一段自然需求、探索代码现状、厘清关系、判定要做的变更**。

## 输入（任意一种自然形态，不要求预先命名 Feature）
- 一句话需求 / 一个模糊问题 / 一次提了多个问题
- 一段 PRD 文本，或 specs/<feature>/prd.md、specs/<feature>/brief.md
- 一份 md 文档或需求链接
- 辅助上下文：业务覆盖面（sovei-flow/project/business-coverage.md）、
  能力依赖图（sovei-flow/project/business-map.json，可选）、已加载的知识库

## 操作

### 1. 读懂需求（理解，而非登记）
提炼需求的**真实意图**、核心目标、显式与隐含的功能项、非功能约束。
如果输入里“一口气提了多个问题”，逐个列出每个诉求，先不急着合并或拆分。

### 2. 探索代码现状（吸收自原 load 能力）
主动读取代码库关键文件，建立“现状地图”：
- 项目结构概览（主要目录/包/模块、入口点、技术栈）
- 与本需求相关的已有实现（哪些已经存在、在哪、怎么组织）
- 模块边界与依赖关系

### 3. 厘清关系与风险（吸收自原 load 能力）
基于现状，标注：
- **业务关联**：范围内（已有业务实体覆盖）/ 全新业务域（需扩展覆盖面）/ 外部依赖（涉及其他系统）
- **风险点**：潜在耦合与副作用、必须遵守的红线与规范、已知技术债或踩坑

### 4. 判定变更拆分（依赖图驱动的智能拆分）
一个需求对应**一个 Feature**，Feature 内部是一组可并行的 change（子变更）。
用依赖关系图来判定如何拆分——这是主流 spec 工作流的做法，先单 agent 基线分析，
只有在子问题**确实独立且不重叠**时才考虑并行加速：

1. **画依赖图**：把第 1 步列出的每个诉求作为节点，标注它们之间的依赖/耦合边
   （共享数据模型、调用关系、同一模块改动 = 耦合）。
2. **按耦合分组**：强耦合的诉求归入同一个 change；无耦合的可拆为独立 change。
3. **判定拆分形态**：
   - 图为**单点或强连通**（诉求彼此紧密耦合）→ 不拆分，sub-change-map.md 写 "no-split"。
   - 图呈**多个互不相连的子图**（诉求分属独立功能域）→ 拆为多个 change，标注 dependsOn。
   - 图为**有向链/树**（存在先后依赖）→ 拆分但用 dependsOn 表达执行顺序。
4. **可选的分析加速**：当分组彼此**完全独立、无交叉引用**时，可开启多个子 agent
   分别深入探查各分组以加速；否则单 agent 顺序探查即可——过度拆分会显著抬高成本且易出错。
   拆分是为“可独立验证的功能域”，不是为“看起来任务多”。

### 5. Feature 命名规范（AI 自行判定，但格式必须遵守）
AI 根据需求意图自行命名 Feature，但**必须**遵守以下格式约束：
- 目录/ID 格式：`NNN-<slug>`，其中 NNN 是 CLI 扫描 specs/ 得到的下一个三位序号（如 032），
  slug 是 2-4 个词的 kebab-case（小写字母、数字、连字符），概括需求主题。
- 正则：`^[0-9]{3}-[a-z0-9]+(-[a-z0-9]+)*$`。
- 禁止：空格、中文、大写、下划线、超过 4 个词。
- 命名由 `sovei explore "<自然语言需求>"` 触发时，CLI 负责分配 NNN 并校验 slug 格式；
  AI 只需给出符合规范的 slug。

## 输出
exploration.md，包含：
- 需求理解（真实意图 + 核心目标 + 功能项清单 + 非功能约束）
- 代码现状摘要（关键模块/入口/架构/技术栈）
- 相关已有实现与模块关系
- 业务关联分析（范围内 / 全新域 / 外部依赖）
- 风险点清单（耦合/红线/技术债）
- 变更拆分理由（依赖图分析 + 分组结论）

sub-change-map.md，包含：
- 拆分提议表（SC-ID / 名称 / 目标 / dependsOn），或 "no-split"
- 用户确认后运行 `sovei feature split <feature> --json` 执行拆分

## 停止条件
需求输入完全缺失且无法从上下文推断；或无任何代码/业务上下文可供探索。

