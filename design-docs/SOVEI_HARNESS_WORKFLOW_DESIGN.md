# Sovei 个人开发 Harness 与任务编排范式

> 状态：Sovei Workflow 1.1 Active
> 文档版本：1.1.0
> 创建日期：2026-07-21
> 所属中枢：`E:\memory`
> 目标用户：个人开发者，在 Codex、Claude Code、CodeBuddy、Trae、Cursor 等环境中复用同一套开发纪律

## 1. 结论

本文件定义目标架构，不是运行时能力清单。任何命令、状态机、外部 Skill、Baseline 或协调机制，只有在实现文件、验证证据和发布版本均存在时才可被 Agent 调用；设计文字本身不产生系统能力。

当前真实能力：`sovei-workflow` 1.1.0 已实现 `load`、`grill`、`wayfind`、`spec`、`scope`、`plan`、`tasks`、`implement`、`converge`、`verify`、`learn`、`sync` 十二个阶段，以及确定性的 `reopen` 返工控制和 `completed` 终态。系统具有文件状态校验、Artifact 模板、Codex Skill、Claude/CodeBuddy/Trae 薄适配和机器可读 Skill Map；每次正常调用仍只允许执行一个阶段。

中枢开发工具以私有 package `packages/sovei-system` 独立迭代。它拥有自己的 `package.json`、`pnpm-lock.yaml` 和本地 `node_modules`，用于配置校验、Skill 依赖审计和后续安装器；该 package 不分发到 A/B/C，产品侧 Harness 不能依赖其中的 Node 运行时。

Sovei Harness 不重新实现一个完整 IDE Agent，也不复制 OpenSpec、SpecKit、Matt Pocock Skills 等项目的全部能力。

采用以下组合：

1. 使用成熟 Spec 方案管理需求、设计、计划、任务和实现产物。
2. 使用小型可组合 Skills 提供访谈、领域建模、调试、测试、审查和交接纪律。
3. 使用 Sovei 自有的业务地图、代码地图、Baseline、影响面覆盖和长期记忆约束业务语义。
4. 使用固定 SOP 和阶段门禁约束模型，不依赖某个 IDE、模型或单次聊天上下文。
5. 外部 Skills 固定到明确版本，人工定期审查更新；Sovei 包装层保持稳定。

一句话原则：

> 外部 Skills 提供持续输入，Memory 随开发快速进化，Sovei SOP 只在重复证据证明流程有缺陷时缓慢升级。

## 2. 目标与非目标

### 2.1 目标

- 同一需求切换 IDE 或模型后，仍能从文件状态继续。
- 较弱模型也必须按阶段、输入、输出和停止条件执行。
- 长周期功能能够持续发现未知决策和遗漏影响面。
- 业务规则、代码结构、失败经验和验证证据可以持续沉淀。
- A/B/C 等不同工程、分支和目录可以共享稳定 Harness，同时保留各自 Feature 状态。
- 外部优秀 Skills 可以低成本复用、固定版本、审查升级和局部吸收。

### 2.2 非目标

- 不在第一阶段开发中心化 Agent 服务或复杂 LLM 调度平台。
- 不追求自动覆盖所有 IDE 私有能力。
- 不把全部项目源码和全部 Memory 一次性塞入上下文。
- 不让模型自行决定是否跳过关键门禁。
- 不自动将单次观察升级为稳定规则或 Baseline。

## 3. 三种演进速度

| 层 | 更新速度 | 主要内容 | 更新门槛 |
|---|---|---|---|
| Sovei SOP | 慢 | 阶段顺序、Artifact 契约、门禁、状态机 | 重复出现流程级失败并经人工确认 |
| Skills 能力 | 中 | 访谈、领域建模、调试、TDD、Review、Handoff | 上游更新审查和历史需求回放通过 |
| Memory / Baseline | 快 | 业务规则、代码地图、踩坑、证据、项目事实 | 每次 Feature 结束后按证据沉淀 |

三层必须分别版本化。外部 Skill 升级不应自动改变 Sovei SOP，Memory 更新也不应直接重写工作流。

## 4. 总体架构

```text
用户入口层
  /sovei-* 稳定命令
        |
        v
Sovei 编排层
  状态机 + 阶段门禁 + Artifact DAG + 风险分级
        |
        +-------------------+
        |                   |
        v                   v
能力层                  知识层
本地 Skills             Business Map
固定版本外部 Skills      Code Map
验证器和审查器           Baseline / Contracts
                        Memory / Rules
        |                   |
        +---------+---------+
                  v
Feature 实例层
  spec / scope / plan / tasks / evidence / state
                  |
                  v
IDE 适配层
  AGENTS.md / CLAUDE.md / .codebuddy / Trae / Cursor / Codex metadata
```

### 4.1 所有权边界

| 内容 | 所有者 | 是否允许直接修改 |
|---|---|---|
| `vendor/` 外部 Skills | 上游项目 | 否，只通过版本升级替换 |
| `.agents/skills/sovei-workflow/` | Sovei | 是，跨 IDE 核心协议 |
| `packages/sovei-system/` | Sovei 中枢 | 是，中枢开发工具；不跨项目分发 |
| Claude `sovei/*` Commands | Sovei Adapter | 是，只做调用转换 |
| `harness/` 稳定知识和模板 | 中枢 | 是，经同步分发 |
| `specs/<feature>/` | 项目实例 | 是，不跨项目覆盖 |
| `.baseline-map/` | 项目与固定 commit | 是，必须保留证据状态 |

## 5. 固定开发 SOP

```text
/sovei-load
  -> /sovei-grill
  -> /sovei-wayfind       # 大型或高不确定需求；其他需求明确标记 N/A
  -> /sovei-spec
  -> /sovei-scope
  -> /sovei-plan
  -> /sovei-tasks
  -> /sovei-implement
  -> /sovei-converge
  -> /sovei-verify
  -> /sovei-learn
  -> /sovei-sync
```

所有需求都经过同一逻辑状态机，但 Artifact 深度按风险调整。阶段可以为 `N/A`，但必须记录原因，模型不能静默跳过。

命令名是跨 IDE 概念协议。Codex 使用显式 `$sovei-workflow` Skill 并指定阶段；Claude 使用 `/sovei/<stage>` 薄命令。Codex 自定义 prompts 已弃用，不作为仓库共享入口。

每次用户调用必须只执行一个阶段并停止。即使用户一次写了多个阶段或要求“全部跑完”，Agent 也只能执行当前合法阶段，然后报告下一条命令，由用户在新的调用和上下文中继续。这是长上下文控制和人工门禁，不允许被“显式请求多个阶段”绕过。

### 5.1 阶段 Skill 依赖

机器真相位于 `harness/workflows/sovei/skill-map.yaml`。下表中的“当前实际第三方”为空，表示目前没有安装或执行任何第三方 Skill；候选项仅用于后续评估和替换。

| 阶段 | 当前实际内部 Skills | 当前实际第三方 | 候选/替换第三方 Skills |
|---|---|---|---|
| `load` | `sovei-workflow`, `knowledge-loader` | 无 | 无 |
| `grill` | `sovei-workflow`, `knowledge-loader` | 无 | `mattpocock/grilling`; 备选 `grill-me`, `grill-with-docs` |
| `wayfind` | `sovei-workflow`, `knowledge-loader` | 无 | `mattpocock/wayfinder` |
| `spec` | `sovei-workflow`, `knowledge-loader` | 无 | `mattpocock/domain-modeling`, `mattpocock/to-spec` |
| `scope` | `sovei-workflow`, `knowledge-loader` | 无 | `mattpocock/domain-modeling` |
| `plan` | `sovei-workflow`, `knowledge-loader` | 无 | `mattpocock/domain-modeling` |
| `tasks` | `sovei-workflow`, `knowledge-loader` | 无 | `mattpocock/to-tickets` |
| `implement` | `sovei-workflow`, `knowledge-loader` | 无 | `mattpocock/implement` |
| `converge` | `sovei-workflow`, `knowledge-loader` | 无 | `mattpocock/code-review` |
| `verify` | `sovei-workflow`, `knowledge-loader` | 无 | `mattpocock/code-review` |
| `learn` | `sovei-workflow`, `knowledge-loader` | 无 | `mattpocock/handoff` |
| `sync` | `sovei-workflow`, `knowledge-loader` | 无 | 无 |

以第一个命令为例：执行 `$sovei-workflow load FEATURE=<path>` 时，实际加载 `sovei-workflow` 和 `knowledge-loader`，第三方 Skill 为零。输出必须同时声明这三部分，不能只报告工作流阶段。

### 5.1 任务等级

| 等级 | 场景 | 必要阶段 |
|---|---|---|
| S0 | 文案、单点配置、小型明确修复 | load、grill-lite、spec-lite、implement、verify、learn |
| S1 | 普通 Feature、单模块业务改动 | 完整 SOP，wayfind 可为 N/A |
| S2 | 跨模块、异步链路、权限计费、长周期功能 | 完整 SOP + wayfinder + coverage matrix + 多轮 converge |

风险等级由确定性规则计算，例如涉及模块数量、共享契约、异步状态、数据迁移、权限计费和预计会话数量。模型给出建议，最终等级写入 Feature 状态文件。

## 6. 命令契约

### 6.1 `/sovei-load`

- 读取 Harness 入口、当前 Feature 指针、用户偏好、宪法和相关知识索引。
- 只按任务域加载 Business Map、Code Map、规则和 Baseline。
- 输出本次使用的知识来源、当前阶段和下一条合法命令。
- 不修改业务代码。

### 6.2 `/sovei-grill`

- 用户显式触发，不允许模型擅自调用。
- 调用可复用的 `grilling` 底层 Skill。
- 一次只问一个决策问题，并提供推荐答案。
- 能从代码、文档和环境查到的事实必须自行查找，不询问用户。
- 未形成共同理解前不得实现。
- 输出 `decision-log.md` 或更新当前 Feature 的决策区域。

### 6.3 `/sovei-wayfind`

- 面向一个会话无法容纳的大型工作。
- 先确定 Destination，再建立决策地图。
- 区分当前可回答的 decision tickets、阻塞关系、frontier、未知区和 out of scope。
- 一次会话只解决一张决策票；独立 research 可并行。
- 目标是消除规划前的未知决策，不直接完成最终实现。

### 6.4 `/sovei-spec`

- 描述问题、用户行为、业务边界、验收场景和明确排除项。
- 引用 Business Map、Baseline 和已确认决策。
- 不写易过期的具体代码路径。
- 输出 `spec.md` 和必要的 `baseline-impact.md`。

### 6.5 `/sovei-scope`

- 沿真实代码链路发现影响面。
- 输出 `scope.md` 与 `coverage-matrix.md`。
- 必须覆盖入口、状态、参数、API、权限计费、异步回调、结果展示、错误恢复、兼容入口和验证表面。
- 无证据的判断标记为 `candidate`，不能当作稳定事实。

### 6.6 `/sovei-plan`

- 基于 Spec 和 Scope 生成技术方案。
- 记录模块边界、数据流、状态机、契约映射、迁移策略和验证方案。
- 发现 Scope 不完整时返回 `/sovei-scope`，不得自行忽略。
- 不实现代码。

### 6.7 `/sovei-tasks`

- 将方案拆成单个新上下文可完成的纵向 tracer-bullet 任务。
- 每个任务声明阻塞关系、验收标准和验证方式。
- 大范围机械变更使用 expand -> migrate -> contract，不强行伪装成纵向切片。

### 6.8 `/sovei-implement`

- 只执行当前 frontier 中已就绪的任务。
- 每次开始前重载对应 Spec、Scope、任务和知识。
- 按预先确认的测试 seam 验证。
- 发现新影响面时更新 Scope/Matrix，并暂停越界实现。

### 6.9 `/sovei-converge`

- 对照 Spec、Scope、Plan、Tasks、Baseline 和当前代码检查缺口。
- 将 `missing`、`partial`、`contradicts`、`unrequested` 分类为发现项。
- 只追加收敛任务，不篡改历史任务。
- S2 Feature 在每个里程碑和最终完成前至少执行一次。

### 6.10 `/sovei-verify`

- 验证需求符合度与工程质量，两个维度分开报告。
- 使用针对性测试、静态检查、真实用户旅程、截图、请求记录或日志证据。
- 异步和视觉业务不能只凭单元测试宣称完成。

### 6.11 `/sovei-learn`

- 将本次偏差、踩坑、业务知识、代码地图变化和验证经验分类沉淀。
- 单次发现进入 candidate/pending。
- 重复有效且无严重误报后，人工升级为 stable rule。
- 更新必须记录来源 Feature、证据和适用范围。

### 6.12 `/sovei-sync`

- 项目实例知识先合并到中央 Harness，再由中央分发。
- 保护项目的 `feature.json`、`specs/` 和实例 Baseline。
- 同步后检查 A/B/C 工作空间中的契约冲突和代码表面重叠。

## 7. 长周期功能的完整性模型

长周期功能需要分别解决三种完整性，不能只增加上下文长度。

| 完整性 | 解决的问题 | 主要机制 |
|---|---|---|
| 决策完整性 | 还有什么没有想清楚 | wayfinder、decision tickets、fog of war |
| 影响面完整性 | 还有哪些入口、消费者和契约没找到 | scope、代码追踪、coverage matrix |
| 实现完整性 | 代码是否真正满足 Spec | converge、双轴 review、验证证据 |

### 7.1 必查链路

```text
入口/路由
  -> UI 状态与用户角色
  -> store/composable/domain service
  -> 参数转换和数据校验
  -> API / shared contract
  -> 权益、额度、计费和埋点
  -> 异步轮询、回调或订阅
  -> 成功、失败、取消和清理
  -> 历史记录、详情与再次操作
  -> 恢复、重试和兼容入口
  -> 测试、文档与运行时证据
```

### 7.2 Coverage Matrix 状态

每条需求、验收场景和边界条件必须处于以下状态之一：

- `discovered`：已定位业务和代码表面。
- `planned`：已有技术方案和任务。
- `implemented`：已有实现证据。
- `verified`：已有验收证据。
- `excluded`：明确排除，并记录授权人与原因。
- `candidate`：怀疑相关但证据不足，不能静默忽略。

完成门禁：所有必须项为 `verified`，其余项必须是有理由的 `excluded` 或待后续处理的 `candidate`。

## 8. 外部 Skills 集成

### 8.1 当前优先研究来源

- Matt Pocock Skills：小型可组合 Skill、用户/模型调用分离、grilling、wayfinder、domain modeling、tracer tickets、双轴 review。
- OpenSpec：Artifact DAG、可迭代更新、delta spec、archive/store。
- SpecKit：constitution、clarify、analyze、checklist、converge、extension/preset/bundle。
- GSD Core：长任务分阶段、新上下文执行、STATE/CONTEXT、阶段验证。
- Superpowers：自动纪律 Skill、系统化调试、证据优先和两阶段 Review。
- BMAD：按任务复杂度调整流程深度。

### 8.2 Matt Pocock Skills 研究快照

- 仓库：`https://github.com/mattpocock/skills`
- 研究 commit：`9603c1cc8118d08bc1b3bf34cf714f62178dea3b`
- 研究日期：2026-07-21
- 重点 Skills：`grill-me`、`grilling`、`grill-with-docs`、`domain-modeling`、`wayfinder`、`to-spec`、`to-tickets`、`implement`、`code-review`、`handoff`

### 8.3 调用权限

用户入口 Skill 与底层纪律 Skill 分离：

- 用户入口：只能由用户显式触发；Codex 使用 `$sovei-workflow`，Claude 使用 `/sovei/<stage>`。
- 底层纪律：允许模型按场景自动调用，例如 `scope-discovery`、`domain-modeling`、`coverage-audit`。
- Claude Code 使用 `disable-model-invocation: true`。
- Codex 使用 `policy.allow_implicit_invocation: false`。
- 其他 IDE 由 Adapter 转换为其支持的命令或规则格式。

## 9. 版本管理

建议新增中央发布清单：

```yaml
schema_version: 1
harness_version: 0.1.0
workflow_version: 1.1.0

vendors:
  mattpocock/skills:
    ref: 9603c1cc8118d08bc1b3bf34cf714f62178dea3b
    skills:
      - grilling
      - grill-with-docs
      - domain-modeling
      - wayfinder
      - to-spec
      - to-tickets
      - code-review
      - handoff

adapters:
  codex: pending
  claude-code: pending
  codebuddy: pending
  trae: pending
  cursor: pending
```

### 9.1 SemVer 规则

- Major：阶段顺序、状态机或 Artifact 契约出现不兼容变化。
- Minor：增加可选阶段、Skill、模板或 Adapter。
- Patch：提示词修正、兼容性调整和文档修复。
- Vendor ref 单独变化，不必自动提升 workflow major/minor。

### 9.2 外部 Skill 更新 SOP

1. 拉取上游新版本到临时区域。
2. 阅读 changelog、Skill diff、metadata 和依赖变化。
3. 区分原样升级、局部吸收、拒绝升级。
4. 使用至少三个历史 Feature 回放：小修复、普通 Feature、长周期跨模块 Feature。
5. 检查用户调用权限、停止条件、写入范围和跨 IDE 行为。
6. 人工批准后更新 vendor ref。
7. 记录吸收的思想、拒绝项和兼容说明。

不得自动跟随上游 latest，不得在 vendor 目录直接打本地补丁。

## 10. 建议目录

以下是分阶段目标目录，不是当前已启用目录。特别是 `commands/`、`vendor/`、`baselines/` 和 `coordination/`，在对应 Phase 完成并验证前不得创建运行时依赖。

```text
E:\memory
├── design-docs/
│   └── SOVEI_HARNESS_WORKFLOW_DESIGN.md
├── harness/
│   ├── commands/                 # /sovei-* 稳定用户入口
│   ├── skills/                   # Sovei 自有底层 Skills
│   ├── vendor/                   # 固定版本外部 Skills 或安装缓存
│   ├── workflows/                # 状态机与 Artifact DAG
│   ├── templates/                # spec/scope/coverage/tasks/evidence
│   ├── memory/
│   ├── codegraph/
│   ├── spec-harness/
│   ├── ide-adapters/
│   └── harness-release.yaml
├── baselines/                    # 按项目/分支/commit 备份基线
├── coordination/                 # A/B/C 工作空间协调
└── specs/                        # 不在中枢跨项目复制，由项目实例持有
```

最终目录是否保存 vendor 完整副本，还是只保存 lock 并由安装器拉取固定 commit，留到实施阶段根据许可证、离线需求和升级成本决定。

## 11. Feature 状态恢复

每个 Feature 应有一个机器可读状态文件，作为新会话恢复依据：

```yaml
schema_version: 1
feature: specs/<feature>
risk_level: S1
current_stage: scope
status: in_progress
workflow_version: 1.1.0
baseline_commit: <commit>
completed_stages:
  - load
  - grill
wayfinder: not_required
next_command: /sovei-scope
open_decisions: []
blocked_by: []
updated_at: <ISO-8601>
```

`/sovei-load` 必须以状态文件和实际 Artifact 为准，并在两者冲突时停止并报告，不根据聊天记忆猜测进度。

## 12. 新会话恢复入口

新会话继续本方案时，优先读取：

1. `E:\memory\design-docs\SOVEI_HARNESS_WORKFLOW_DESIGN.md`
2. `E:\memory\harness\index.md`
3. `E:\memory\harness\memory\MEMORY.md`
4. `E:\memory\harness\workflows\workflow-registry.json`
5. `E:\memory\SYNC.md`

建议新会话提示：

```text
继续设计或实施 Sovei 个人 Harness。先读取
E:\memory\design-docs\SOVEI_HARNESS_WORKFLOW_DESIGN.md，
再按其中“新会话恢复入口”加载现有 Harness。
以文档中的“已确定事项”为约束，从“待决事项和实施路线”继续；
不要直接修改外部 vendor Skills，不要覆盖项目实例的 feature.json 和 specs/。
```

## 13. 已确定事项

1. 采用固定 SOP，而不是让模型自由选择下一步。
2. 每个阶段有明确输入、输出、停止条件和下一条合法命令。
3. 所有需求走同一状态机，但支持按风险裁剪 Artifact 深度。
4. 长周期功能使用 wayfinder + scope coverage + converge 三层完整性机制。
5. 外部 Skills 固定版本、只读使用、人工定期升级。
6. Sovei 包装层与外部 Skill 实现分离。
7. 业务事实必须绑定具体 commit；未验证事实保持 candidate。
8. Memory 快速演进，稳定规则需要证据升级，SOP 缓慢演进。
9. 中央 Harness 是共享源，项目 `specs/` 和 Feature 状态是实例数据。
10. 第一阶段采用文件协议，不建设复杂中心化 LLM 编排服务。

## 14. 决策状态

已解决：

1. 外部 Skills 使用 lock + 固定 commit 安装缓存，Phase 1 不提交 vendor 副本。
2. Feature 使用独立 `workflow-state.yaml`；`.specify/feature.json` 只保留指针职责。
3. Phase 1 以 `load` 为入口，不增加 `/sovei-start` 别名。
4. Codex 使用 repo Skill，Claude 使用薄 Command Adapter，共用一个核心协议。
5. Coverage Matrix 以 Markdown 为人工可读源，状态校验只读取 YAML 状态文件。

仍待决：Baseline 中枢备份策略、历史 Feature 回放集及指标、其它 IDE 的最低兼容矩阵，以及外部 Skill 的安装和升级生命周期。

## 15. 分阶段实施路线

### Phase 1：协议 MVP

- [x] 创建 `load`、`grill`、`spec`、`scope`、`plan` 阶段契约。
- [x] 创建 `scope.md`、`coverage-matrix.md`、`workflow-state` 等模板。
- [x] 支持 Codex repo Skill 与 Claude Code 薄 Command Adapter。
- [x] 建立只读 validator、三类回放和独立 Agent forward-test。
- [x] 不接入自动 vendor 更新。

### Phase 2：执行闭环

- [x] 创建 `/sovei-wayfind`、`/sovei-tasks`、`/sovei-implement`、`/sovei-converge`、`/sovei-verify`。
- [x] 接入 change manifest、convergence report 和真实旅程证据契约。
- [x] 增加确定性的 `reopen`、revision 和 workflow history。
- [ ] 用一个真实普通 Feature 和一个长周期 Feature 回放验证。

### Phase 3：持续学习与跨工程

- [x] 创建 `/sovei-learn`、`/sovei-sync` 和规则升级审计契约。
- [x] 将 `sync` 的显式目标授权、前后 Diff 和保护路径检查纳入阶段门禁。
- [x] 增加 CodeBuddy 命令/Skill 与 Trae Skill Adapter。
- [ ] 增加 Cursor Adapter。

### Phase 4：外部 Skills 生命周期

- 创建 `harness-release.yaml` 和 vendor lock。
- 建立上游 diff、历史 Feature 回放和人工批准流程。
- 评估是否需要安装器、缓存和离线分发。

## 16. 当前下一步

Sovei 1.1 的协议、模板、Validator、Codex/Claude/CodeBuddy/Trae 适配和中枢 package 已实现。下一步从 `specs/002-sovei-workflow-phase2` 的 `wayfind` 阶段开始，按一次一个阶段的正常规则回放并调优；该回放完成前，不宣称真实普通 Feature 与长周期 Feature 的验证已经完成。Cursor Adapter 和外部 Skill 生命周期仍留待后续迭代。
