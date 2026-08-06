# Sovei 引擎 — 技术分享素材

> 本文档是 Sovei 项目的完整上下文总结,供技术分享和 AI 辅助分析使用。
> 整理自:git 历史、设计文档、知识库、红线治理数据、开发记忆日志。
> 项目路径:D:\project\harness | npm 包:@soveilove/sovei | 当前版本:2.4.0

---

## 一、项目定位

**Sovei 是一个本地知识管理工作流引擎,定义"怎么沉淀知识"(工作流 + 知识生命周期),不定义"知识是什么"(那是项目专属内容)。**

它是一套便携式开发 SOP 引擎,用 TypeScript 实现,通过 npm 包 + CLI 分发。核心价值:让 AI 编码助手(Codex、Claude Code、CodeBuddy、Trae、Cursor)在同一套开发纪律下工作,而不是各自为政。

一句话原则:

> 外部 Skills 提供持续输入,Memory 随开发快速进化,Sovei SOP 只在重复证据证明流程有缺陷时缓慢升级。

---

## 二、为什么自建(痛点与差异化)

### 2.1 真实痛点

1. **切换 IDE/模型后上下文丢失**:同一需求在 Codex 做到一半,切到 Claude Code 要从头解释。
2. **较弱模型不守纪律**:模型自己决定跳过关键步骤,没有强制门禁。
3. **长周期功能遗漏**:跨模块、异步链路的需求,影响面找不全,做到一半才发现漏了。
4. **需求撕裂**:产品上线当天改需求("新模块有风险不上,旧模块同步部分新模块规则"),需求被撕裂成过渡态 + 终态并存,AI 执行一直出错。SpecKit/OpenSpec 救不了,因为它们假设需求向前累积。
5. **多工程冲突**:并行 a/b/c 三工程,需求冲突、代码变动冲突、业务红线不同。
6. **知识无法复用**:踩过的坑、业务规则、代码结构,换个项目就丢了。

### 2.2 与现有方案的差异

| 方案 | 擅长 | 不解决 |
|---|---|---|
| SpecKit | 把一个 spec 写清楚 | 需求撕裂、AI 执行纪律 |
| OpenSpec | Artifact DAG、可迭代更新 | 过渡态 vs 终态、执行不跑偏 |
| Matt Pocock Skills | 小型可组合 Skill、grilling、wayfinder | 跨工程协调、业务红线治理 |
| **Sovei** | **工作流纪律 + 知识生命周期 + 执行纪律链 + 红线治理** | **不重新实现 IDE Agent,不复制外部能力** |

Sovei 的差异化价值:被敏捷上线当天改需求的痛苦逼出来的**执行层能力**。

---

## 三、核心架构

### 3.1 壳料分离

| 层 | 内容 | 换项目时 |
|---|---|---|
| 壳(工具层) | CLI 引擎、阶段定义、模板 | 原样保留 |
| 料(项目层) | 踩坑库、代码地图、架构文档、规则 | 清空重填 |

### 3.2 五框架借鉴

| 借鉴来源 | 核心思想 | 应用层 |
|---|---|---|
| Vite Plugin | hook 生命周期 + 可组合插件 | Stage 定义和扩展 |
| XState | 形式化状态机 + 可序列化 context | Workflow Engine |
| Redux | reducer 纯函数 + typed actions | Knowledge Store |
| NestJS DI | 依赖注入 + 模块化 | Service Container |
| Express Middleware | pipeline + context 传递 | Stage Pipeline |

### 3.3 事件溯源状态机

这是 Sovei 最核心的架构决策:

```
状态 = fold(events)
```

- **事实源**:`workflow-events.jsonl`(只追加事件日志)
- **缓存**:`workflow-state.yaml`(可重建,损坏时重放事件恢复)
- **reducer**:`state-machine.ts` 纯函数,从 BOOTSTRAP 事件起 fold 出当前状态
- **变更请求**:带乐观锁(baseEventRevision 校验),防止并发变更互相覆盖

关键推论:修状态 bug 要改 reducer 而非改 YAML;新增状态字段必须同时更新 stateToYaml 与 parseStateYaml。

### 3.4 总体架构图

```
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

### 3.5 源码模块结构(packages/sovei-core/src/)

13 个模块,约 70 个 TypeScript 文件:

| 模块 | 职责 | 关键文件 |
|---|---|---|
| `engine/` | 事件溯源状态机 + 工作流引擎 | workflow-engine.ts(23KB)、state-machine.ts、event-store.ts |
| `change-control/` | 红线仓储、变更请求、乐观锁 | repository.ts、schemas.ts、redline-view.ts |
| `wayfinder/` | 决策地图、claim 归属、证据强制 | repository.ts(14KB)、reducer.ts、selectors.ts |
| `knowledge/` | 7 类知识 + 4 态生命周期 | store.ts、schemas.ts、lifecycle.ts |
| `cli/` | commander CLI 入口 + 各领域子命令 | project.ts(42KB)、workflow.ts、governance.ts |
| `config/` | 扫描器、版本守卫、工作区 | scanner.ts、business-map-scanner.ts、workspace.ts |
| `context/` | 上下文构建器 + 快照 | builder.ts、snapshot.ts |
| `stages/` | 12 阶段定义与契约 | index.ts(22KB)、define-stage.ts |
| `storage/` | 原子写 + 文件锁 + 路径防护 | filesystem.ts、json.ts、memory.ts |
| `review/` | reconciliation 解析与双视图渲染 | parser.ts、renderer.ts |
| `rules/` | 规则引擎与适配 | repository.ts、adaptation.ts |
| `architecture/` | 架构分析器 + 重构策略 | analyzer.ts、policy.ts |
| `providers/` | DI container + TOKENS | container.ts、bootstrap.ts |

---

## 四、12 阶段工作流

```
load -> grill -> wayfind -> spec -> scope -> plan -> tasks -> implement -> converge -> verify -> learn -> sync
```

### 4.1 核心规则

- 每次调用只执行一个阶段并停止(长上下文控制 + 人工门禁)
- 阶段可以为 N/A,但必须记录原因,模型不能静默跳过
- 所有需求走同一状态机,但 Artifact 深度按风险调整

### 4.2 阶段职责

| 阶段 | 职责 | 关键产物 |
|---|---|---|
| `load` | 加载知识、输出 Prompt Contract | 使用的知识来源清单 |
| `grill` | 一次只问一个决策问题,提供推荐答案 | decision-log.md |
| `wayfind` | 大型工作建立决策地图,消除规划前未知 | wayfinder.json、decision-tickets/*.json |
| `spec` | 描述问题、验收场景、排除项 | spec.md、reconciliation.md |
| `scope` | 沿真实代码链路发现影响面 | scope.md、coverage-matrix.md |
| `plan` | 基于 Spec + Scope 生成技术方案 | plan.md |
| `tasks` | 拆成单上下文可完成的纵向 tracer-bullet | tasks.md |
| `implement` | 只执行已就绪任务,发现新影响面暂停 | change-manifest.md |
| `converge` | 对照 Spec/Scope/Plan 检查缺口 | convergence-report.md |
| `verify` | 验证需求符合度与工程质量(分开报告) | evidence.md |
| `learn` | 分类沉淀偏差、踩坑、知识 | learning-report.md |
| `sync` | 项目知识先合并到中央 Harness 再分发 | sync-report.md |

### 4.3 任务风险分级

| 等级 | 场景 | 必要阶段 |
|---|---|---|
| S0 | 文案、单点配置、小型明确修复 | load、grill-lite、spec-lite、implement、verify、learn |
| S1 | 普通 Feature、单模块业务改动 | 完整 SOP,wayfind 可为 N/A |
| S2 | 跨模块、异步链路、权限计费、长周期 | 完整 SOP + wayfinder + coverage matrix + 多轮 converge |

### 4.4 确认门禁

- **spec 之后**(S2/S3 风险):产品 + 技术双确认才能进 scope
- **verify 之后**(始终):产品 + 技术双确认才能进 learn
- override 必须显式记录 reason 与操作人

门禁建模为 blocker 而非第 13 个阶段,保护 12 阶段契约的稳定性。

### 4.5 长周期功能的完整性模型

| 完整性 | 解决的问题 | 主要机制 |
|---|---|---|
| 决策完整性 | 还有什么没想清楚 | wayfinder、decision tickets、fog of war |
| 影响面完整性 | 还有哪些入口/消费者/契约没找到 | scope、代码追踪、coverage matrix |
| 实现完整性 | 代码是否真正满足 Spec | converge、双轴 review、验证证据 |

Coverage Matrix 每条需求必须处于 `discovered -> planned -> implemented -> verified -> excluded -> candidate` 之一,完成门禁:所有必须项为 verified,其余项必须是有理由的 excluded 或待处理的 candidate。

---

## 五、知识管理体系

### 5.1 类型化 JSON 知识(替代 markdown 约定)

7 类知识,每类一个 JSON 文件,位于 `harness/project/knowledge/`:

| 类型 | 说明 |
|---|---|
| `pitfall` | 踩坑记录 |
| `rule` | 经验规则 |
| `decision` | 架构决策 |
| `code-map` | 代码地图 |
| `architecture` | 架构文档 |
| `preference` | 用户偏好 |
| `constitution` | 项目宪法(架构原则) |

每个条目包含:type、title、content、lifecycle、evidence(来源 Feature + 日期 + 描述 + 验证状态)、tags、scope。

### 5.2 四态生命周期

```
candidate -> pending -> stable -> deprecated
```

**核心原则:不自动将单次观察升级为稳定规则。**

- `candidate`:单次观察,未经重复验证
- `pending`:正在积累证据
- `stable`:重复有效且无严重误报,人工升级
- `deprecated`:已废弃,保留审计痕迹

知识提取流程(防噪声):
```
spec/reconciliation 过程产物
  -> CLI 在 learn/sync 自动提取(带理由、进事件流)
  -> knowledge/*.json 的 candidate
  -> 人工 promote(候选->stable)
  -> stable 知识(AI 真正复用)
```

### 5.3 项目工程规范(第三类约束)

三层约束,互不等同:
- **业务红线**(`governance/redlines.json`):不可违反的业务约束
- **工程规范**(`rules/*.rules.json`):团队约定的代码规范
- **经验知识**(`knowledge/rule.json`):从踩坑中提炼的经验

规则适配流程:onboard 自动从 AGENTS.md / CLAUDE.md / .cursorrules / doc/ / CONTRIBUTING.md 提取 candidate -> AI code agent 读真实代码精炼(判断有效/过时/重复) -> 人工激活。

---

## 六、红线治理

### 6.1 双轨存储

| 层 | 文件 | 用途 |
|---|---|---|
| 事实源(机器读) | `redlines.json` + `redline-events.jsonl` | AI 上下文从这里读取 |
| 审查视图(人读) | `redlines.md` | 自动生成,只读不改 |

### 6.2 红线级别

- **绝对红线(absolute)**:不允许例外。重大变更评审中只能标记 unaffected 或 compliant。
- **审批红线(approval-required)**:允许授权例外,但必须提供审批人、审批时间、审批依据。

### 6.3 当前生效的 9 条红线

| ID | 级别 | 规则简述 |
|---|---|---|
| `NO_SILENT_DATA_LOSS` | 绝对 | CLI 升级不得静默重写项目数据 |
| `AUDIT_LOG_APPEND_ONLY` | 绝对 | 工作流事件日志只追加,revision 单调递增 |
| `CONFIRMATION_GATE_INTEGRITY` | 绝对 | 确认门禁不可绕过,override 须记录 reason |
| `CHANGE_REQUEST_OPTIMISTIC_LOCK` | 绝对 | 变更请求必须校验基线版本(乐观锁) |
| `PATH_TRAVERSAL_CONTAINMENT` | 绝对 | 所有文件写入限制在项目根目录内 |
| `WAYFINDER_CLAIM_OWNERSHIP` | 绝对 | 决策票据只能由占有人解决或排除 |
| `WAYFINDER_EVENT_APPEND_ONLY` | 绝对 | wayfinder 事件日志追加且修订号单调 |
| `PERSISTED_SCHEMA_COMPAT` | 审批 | 持久化数据格式变更需向后兼容 |
| `CLI_CONTRACT_STABILITY` | 审批 | CLI 命令契约是对外契约,破坏需迁移期 |

### 6.4 红线来源

`origin` 字段区分四种来源:`manual`(人工声明)、`scanner-seed`(扫描器候选)、`pm-confirmed`(PM 签署)、`agent-generated`(AI 分析)。

### 6.5 变更请求流程

重大需求变化不能让 AI 直接沿用或覆盖旧 Spec:
```
sovei workflow change 001-my-feature --target grill --reason "..."
  -> 生成 CHG-*.json(含红线评估矩阵)
  -> 填写授权字段和所有红线结论
sovei workflow apply-change 001-my-feature CHG-xxx
  -> 失效产物归档到 history/revision-*
```

没有 active 红线、缺少授权、红线漏审、绝对红线例外、审查基线过期都会阻止应用。

---

## 七、演进历程(git 时间线)

项目从 2026-07-17 到 2026-08-06,20 天内完成 4 个大版本迭代。

### 7.1 完整版本演进

```
1.0 (07-17) PowerShell/Python 脚本起步
  - 知识加载器 + 基础工作流状态跟踪(YAML)
  - 知识蒸馏 skill

1.1 (07-21) 完整 12 阶段 + 重开
  - load->sync 全部 12 阶段实现
  - reopen 返工机制
  - CodeBuddy slash commands

2.0 (07-29) TypeScript 重写 [重大重构]
  - PowerShell/Python -> TypeScript(sovei-core)
  - 纯 reducer 状态机 + 事件溯源
  - defineStage() 插件系统 + DI 容器
  - Zod 校验的类型化 JSON 知识 + 4 态生命周期
  - 壳料分离
  - Wayfinder 决策地图
  - 演进式架构治理 + 变更控制

2.1.0 (08-05) 治理与发布 [稳定版]
  - 业务红线治理(双轨存储 + 人工审查视图)
  - 演进式架构(scan/status/accept/dismiss/check)
  - IDE 适配器注册表(Codex/Claude/CodeBuddy/Trae)
  - 上下文构建器(版本化 context pack)
  - 项目规则适配(.cursorrules/CLAUDE.md/AGENTS.md)
  - CI 工作流 + 发布脚本
  - 版本号统一为单一来源
  - npm 发布(@soveilove/sovei)

2.2.0 (08-05) Agent 协作层
  - Reconciliation 模块(spec 阶段产出结构化对齐文档)
  - tech-review.md + product-review.md 双视图渲染
  - 跨 Feature 上下文(--cross-feature)
  - 确认门禁(CONFIRM/OVERRIDE_CONFIRM 事件)
  - review-pack CLI
  - onboard --evidence-only 模式
  - AGENTS.md 自动生成
  - 红线来源扩展(pm-confirmed + agent-generated)

2.2.x (08-05) 工程加固
  - evidence-only 真正落盘证据文件
  - governance redline add --origin 参数
  - redline list 显示停用状态 [INACTIVE]
  - FilesystemStorage 路径越界防护(PATH_TRAVERSAL_CONTAINMENT)
  - README 中文化

2.3.0 (08-05) 企业级扫描
  - 扫描器过滤构建产物/哈希 chunk/静态资源
  - 测试套件误判修复(精确目录名匹配)
  - 默认扫描深度 4->10,条目上限 20000->50000
  - 业务地图最大源码读取数 500->3000

2.3.1 (08-06) 产物版本守卫
  - artifact-version-guard(读侧阻断 + 写侧提示)
  - sovei project rescan 一等公民
  - 默认扫描深度 10->20

2.3.2 (08-06) 拓扑修复
  - spec 阶段 requiredArtifacts 补齐 wayfinder.md
  - grill.nextStage 对齐为 wayfind
  - spec.producesArtifacts 补 reconciliation.md
  - 删除 14 个死模板文件
  - project init AGENTS.md 覆盖保护

2.3.3 (08-06) init 修复
  - project init 已存在项目改为提示保留而非抛错

2.4.0 (08-06) 规则适配 [当前版本]
  - 团队规范文档识别(doc/、docs/、CONTRIBUTING.md、STYLEGUIDE.md)
  - 章节级语义切片(跳过 Sovei 自身段落和非规范章节)
  - 交叉验证(config-backed 标记 confidence: high)
  - sovei rules refine 命令(AI 精炼候选 + 批量废弃噪声)
  - onboard --evidence-only 联动 rules 精炼
```

### 7.2 关键重构节点

**2.0 TypeScript 重写**(commit `cd1d386`):从 PowerShell/Python 脚本迁移到 TypeScript 引擎,引入状态机、事件溯源、DI 容器、Zod 校验。这是项目从"脚本工具"变成"引擎"的分水岭。

**2.2.0 Agent 协作层**(commit `4cb76ae`):新增 1006 行代码,核心是 reconciliation 模块——PM 可能不知道前一个 feature 做了什么,agent 必须先重建上下文再写 spec。

---

## 八、前沿设计思考(尚未落地)

这部分是项目正在思考的下一代设计,记录在 `design-docs/SOVEI_SCENARIOS_DECISION.md`。

### 8.1 执行纪律链(两场景的灵魂)

诊断:AI 执行出错不是偶发,而是四环同时失守的系统性问题:

| 类型 | 表现 | 环节 |
|---|---|---|
| 基线污染 | 旧 spec 带偏,做过渡态却按完整新模块走 | 进上下文 |
| 理解偏 | 方向对但细节偏,无对照 | AI 理解 |
| 无清单执行 | 凭印象做,缺漏规则 | AI 执行 |
| 无卡点确认 | 自认做对,不再核对就交付 | 交付自检 |

四个强制卡点:
```
任务开始
  -> (1) 基线隔离:上下文只装"当前生效基线",旧/未来 spec 物理不进入
  -> (2) 判定样例:每条规则配"通过/不通过"样例,钉死"对"的形状
  -> (3) 规则清单:规则从描述变为可勾选清单,逐项落实
  -> (4) 自检门:强制输出"我做了什么 + 逐条对照清单结果",全过才交付
```

### 8.2 联邦星型拓扑(多工程协作)

个人用单一 hub(星型)足够,规模化后升级为联邦星型:
```
feature-A --> test分支中枢 --+
feature-B --> test分支中枢 --+--> master分支中枢 --> 全局
feature-C --> master分支中枢 --+
```

三样东西的处理:
- 知识:共享(有价值知识晋升到中枢,分发所有工程)
- 红线:部分共享(公共红线过中枢,工程专属红线必须隔离)
- Feature 状态:不共享

### 8.3 merge preflight(合并前语义冲突预检)

git 只懂文本冲突,不懂业务语义。合并前必须跑语义预检:
```
(1) 文本冲突检查(git 自带)
(2) 业务语义冲突检查(redlines + knowledge + coverage-matrix)
(3) 冲突裁决(AI + 规则兜底,写理由进事件流)
(4) 输出 preflight 报告 -> 无冲突才允许 merge
```

### 8.4 设计权分配(按可逆性)

| 决策 | 可逆性 | 归属 |
|---|---|---|
| 事实源/派生视图是否保留 | 不可逆 | 规则锁定 |
| 这条知识值不值得沉淀 | 可逆 | AI 判断(带理由+事件流) |
| 过程性 spec 是否归档 | 部分可逆 | AI 判断(归档进 history) |
| 知识是否升 stable | 不可逆 | 人工确认 |
| 质量闸门 | - | 人工 |

### 8.5 落地优先级

1. 执行纪律链(四个卡点)
2. 基线隔离 + 判定样例(解决过渡态 vs 终态)
3. 联邦星型 + merge preflight
4. 红线 scope/owner/branch 隔离
5. spec 分层 git 策略 + CLI 自动沉淀

---

## 九、工程实践

### 9.1 技术栈

- **语言**:TypeScript 7.0.2
- **运行时**:Node.js >= 20
- **包管理**:pnpm 10.33.4
- **CLI 框架**:commander 12
- **校验**:zod 3
- **构建**:tsc + esbuild(发布打包)+ javascript-obfuscator(混淆)
- **解析**:jsonc-parser、yaml、minimatch
- **测试**:node --test(原生测试运行器)

### 9.2 发布流程

npm 包 `@soveilove/sovei`,通过 `release-sovei.ps1` 脚本发布:

1. 检查 npm 登录身份(`npm whoami`)
2. 检查远端版本是否已存在(不可覆盖)
3. 运行类型检查(`tsc --noEmit`)
4. 运行完整测试(`pnpm test`)
5. 检查发布包白名单(`verify-package.mjs`)
6. npm publish(用 automation token,免 OTP)
7. 发布后版本校验(重试 6 次应对 CDN 传播延迟)

关键约束:预发布版本只能发到 `next` tag,稳定版本才发到 `latest`。发布包只含 `dist/release/sovei.js`(混淆后的单文件)和 `LICENSE.md`。

### 9.3 测试

17 个测试文件,覆盖所有核心模块:
```
test/workflow.test.mjs          # 工作流引擎
test/wayfinder.test.mjs         # 决策地图
test/change-control.test.mjs    # 变更控制
test/knowledge.test.mjs         # 知识管理
test/rules.test.mjs             # 规则适配
test/scanner.test.mjs           # 扫描器
test/project.test.mjs           # 项目初始化
test/context.test.mjs           # 上下文构建
test/architecture.test.mjs      # 架构分析
test/release.test.mjs           # 发布验证
```

### 9.4 三种演进速度

| 层 | 更新速度 | 主要内容 | 更新门槛 |
|---|---|---|---|
| Sovei SOP | 慢 | 阶段顺序、Artifact 契约、门禁、状态机 | 重复出现流程级失败并经人工确认 |
| Skills 能力 | 中 | 访谈、领域建模、调试、TDD、Review | 上游更新审查和历史需求回放通过 |
| Memory / Baseline | 快 | 业务规则、代码地图、踩坑、证据 | 每次 Feature 结束后按证据沉淀 |

三层必须分别版本化。外部 Skill 升级不应自动改变 Sovei SOP,Memory 更新也不应直接重写工作流。

---

## 十、踩坑经验(知识库精选)

### 10.1 扫描器自指误报

**问题**:`redline-scanner.ts` 的 `SURFACE_KEYWORDS` 字典(auth/billing/permission)对本仓库自扫描时,字典行本身被匹配,生成了 AUTH_REQUIRED 与 BILLING_CONTRACT 两条不存在的红线。

**规避**:验证扫描结果时必须打开 codeEvidence 指向的文件确认是真实业务逻辑,而不是关键词表、DI TOKENS 或注释。

### 10.2 monorepo 扫描深度不足

**问题**:默认扫描深度 4 层,monorepo 下 `packages/sovei-core/src/**` 未被覆盖,22 个候选能力里 15 个是 test 文件。

**修复**:逐步提升深度到 20,改用路径推断(segmentAfterSource 取 src 后一段)与语义关键词表。

### 10.3 红线 CLI 不标注停用状态

**问题**:`redline list --all` 不输出 `active` 字段,已停用红线与生效红线无法区分,人工审查极易误读。

**修复**:在 `--all` 模式下为 `active===false` 的条目加 `[INACTIVE]` 前缀。

### 10.4 governance redline add 硬编码 origin

**问题**:写死 `origin:'manual'`,无法区分"人类定的红线"与"AI/扫描器生成的候选"。

**修复**:为 add 增加 `--origin` 选项。

### 10.5 发布脚本假失败

**问题**:`release-sovei.ps1` 末尾 npm view 校验在 CDN 传播延迟时误报 E404(实际已发布成功),手动重复 publish 撞 E403 "cannot publish over"。

**修复**:脚本添加重试机制(6 次重试,每次间隔 5 秒),并在注释中警告"假失败"。

### 10.6 project init 覆盖 AGENTS.md

**问题**:`project init` 检测到 `AGENTS.md` 已存在且非空时无条件覆盖,导致用户手动维护的声明被抹掉。

**修复**:改为输出提示指令交由用户/AI 决定,`--force` 仍强制覆盖。

---

## 十一、待解决与路线图

### 11.1 当前待解决

1. **需求改动后拓扑/红线不跟随**:业务拓扑(business-map)和业务红线(redlines)只在 onboard 一次性扫描生成,后续需求/代码改动没有机制触发重新评估。需引入"变更影响评估"(Impact Re-evaluation)。
2. **"部分规则同步到旧模块"**:部分规则谁定、怎么定(执行偏离 vs 语义裁剪),待确认。
3. **业务语义冲突检测判定规则**:需真实冲突案例定义。
4. **知识提取"复用价值阈值"**:具体设计待定。

### 11.2 路线图

| 优先级 | 内容 |
|---|---|
| P1 | 执行纪律链(四个卡点) |
| P2 | 基线隔离 + 判定样例 |
| P3 | 联邦星型 + merge preflight |
| P4 | 红线 scope/owner/branch 隔离 |
| P5 | spec 分层 git 策略 + CLI 自动沉淀 |
| P6 | 变更影响评估(Impact Re-evaluation) |
| P7 | Cursor Adapter |
| P8 | 外部 Skills 生命周期(vendor lock + 安装器) |

---

## 十二、关键文件索引

### 设计文档
- `design-docs/SOVEI_HARNESS_WORKFLOW_DESIGN.md` — 完整架构设计(22KB)
- `design-docs/SOVEI_SCENARIOS_DECISION.md` — 场景决策记录(8KB)

### 开发记忆
- `.codebuddy/memory/MEMORY.md` — 项目记忆索引
- `.codebuddy/memory/2026-08-06.md` — 最新开发日志(13KB,含两场景深度讨论)

### 知识库
- `harness/project/knowledge/*.json` — 7 类类型化知识
- `harness/project/governance/redlines.json` — 红线事实源
- `harness/project/governance/redlines.md` — 红线审查视图
- `harness/project/onboard-report.md` — 自扫描报告
- `harness/index.md` — Harness 目录说明

### 变更记录
- `packages/sovei-core/CHANGELOG.md` — 完整版本历史
- `specs/` — 11 个 Feature 的完整工作流产物

### 源码入口
- `packages/sovei-core/src/index.ts` — 引擎入口
- `packages/sovei-core/src/cli/index.ts` — CLI 入口
- `packages/sovei-core/src/engine/workflow-engine.ts` — 工作流引擎核心(23KB)
- `packages/sovei-core/src/engine/state-machine.ts` — 状态机 reducer
- `packages/sovei-core/src/stages/index.ts` — 12 阶段定义(22KB)

### 配置
- `AGENTS.md` — Sovei 工作流声明(AI 读取入口)
- `package.json` — workspace 根配置
- `packages/sovei-core/package.json` — 引擎包配置
- `release-sovei.ps1` — 发布脚本

---

## 附:给 AI 的快速上下文

如果你是接到这份素材的 AI,以下是快速理解项目的要点:

1. **Sovei 是什么**:一个本地工作流引擎 CLI,管理 AI 编码助手的开发纪律和知识沉淀。
2. **核心技术**:事件溯源状态机(fold(events))、12 阶段工作流、类型化 JSON 知识(4 态生命周期)、红线治理(双轨存储)。
3. **设计哲学**:壳料分离(引擎跨项目复用,知识项目专属)、三种演进速度(SOP 慢 / Skills 中 / Memory 快)、不自动升级单次观察为稳定规则。
4. **差异化**:被"需求撕裂后 AI 执行出错"的痛苦逼出来的执行层能力,这是 SpecKit/OpenSpec 不解决的。
5. **当前阶段**:2.4.0 稳定版,已实现完整 12 阶段 + 知识管理 + 红线治理 + 规则适配。下一步是执行纪律链和多工程协作。