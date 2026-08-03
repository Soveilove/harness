# Sovei — 便携式开发 SOP 引擎

Sovei 是一个本地知识管理工作流引擎。它定义"怎么沉淀知识"（工作流 + 知识生命周期），不定义"知识是什么"（那是项目专属内容）。

## 设计思想

Sovei 2.1 借鉴五个主流框架的核心思想，并增加演进式架构治理：

| 借鉴来源 | 核心思想 | 应用层 |
|---|---|---|
| Vite Plugin | hook 生命周期 + 可组合插件 | Stage 定义和扩展 |
| XState | 形式化状态机 + 可序列化 context | Workflow Engine |
| Redux | reducer 纯函数 + typed actions | Knowledge Store |
| NestJS DI | 依赖注入 + 模块化 | Service Container |
| Express Middleware | pipeline + context 传递 | Stage Pipeline |

## 壳料分离

| 层 | 内容 | 换项目时 |
|---|---|---|
| 壳（工具层） | 工作流引擎、模板、CLI、阶段定义 | 原样保留 |
| 料（项目层） | 踩坑库、代码地图、架构文档、ADR、实现规则 | 清空重填 |

当前项目声明见 [harness/project/project.config.json](harness/project/project.config.json)。

## 快速开始

```bash
# 安装依赖
pnpm --dir packages/sovei-core install

# 构建
pnpm --dir packages/sovei-core run build

# 使用 CLI
node packages/sovei-core/dist/cli/index.js --help

# 初始化新项目
node packages/sovei-core/dist/cli/index.js project init ./my-project --name "My Project"

# 创建新 Feature
node packages/sovei-core/dist/cli/index.js workflow bootstrap 001-my-feature

# 准备阶段（生成提示契约和缺失模板，不推进状态）
node packages/sovei-core/dist/cli/index.js workflow load 001-my-feature

# 完成实际工作后显式校验并推进
node packages/sovei-core/dist/cli/index.js workflow load 001-my-feature --complete
node packages/sovei-core/dist/cli/index.js workflow grill 001-my-feature
# 填写 specs/001-my-feature/decision-log.md 后：
node packages/sovei-core/dist/cli/index.js workflow grill 001-my-feature --complete

# 查看状态
node packages/sovei-core/dist/cli/index.js workflow status 001-my-feature

# 返工
node packages/sovei-core/dist/cli/index.js workflow reopen 001-my-feature --target scope --reason "发现遗漏"
```

## 工作流阶段

Sovei 2.0 共 12 个阶段，每次调用只执行一个：

```
load → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync
```

查看所有阶段及其契约：

```bash
node packages/sovei-core/dist/cli/index.js workflow list-stages
```

阶段命令默认只执行 `prepare`：加载知识、输出 Prompt Contract，并创建缺失模板。
模板不会被视为完成。填写真实产物后使用 `--complete`，CLI 会校验产物再追加
`STAGE_COMPLETE` 事件。

### Wayfinder 决策地图

`wayfind` 仍是原有 12 阶段中的一个阶段。S2、大型或高不确定工作使用类型化决策地图；
S0/S1 且一个会话能说清的工作必须显式 `skip`，不能用空地图假装完成。

```bash
# 先准备 wayfind 阶段，再创建低分辨率地图
sovei workflow wayfind 001-my-feature
sovei wayfinder chart 001-my-feature \
  --destination "所有跨模块契约已形成可写入 Spec 的结论" \
  --notes "计费问题需要产品负责人确认"

# 决策票据不同于实现任务；地图只保存索引，细节在 decision-tickets/*.json
sovei wayfinder ticket add 001-my-feature \
  --title "确认续费边界" --question "老会员是否允许移动端续费" \
  --type grilling --interaction HITL
sovei wayfinder fog add 001-my-feature --summary "迁移范围要等续费结论后才能具体化"

# 每次调用只处理 frontier 中的一张票；处理前先认领
sovei wayfinder frontier 001-my-feature
sovei wayfinder claim 001-my-feature D-001 --actor product-owner --lease 240
sovei wayfinder resolve 001-my-feature D-001 --actor product-owner \
  --resolution "老会员本期不支持续费" --evidence "approval:BILLING-42"

# 未知区变得可描述后，毕业为新票据；超出 Destination 的票据显式排除
sovei wayfinder fog graduate 001-my-feature F-001 \
  --title "界定历史会员迁移" --question "哪些历史会员需要兼容" \
  --type research --interaction AFK --blocked-by D-001
sovei wayfinder exclude 001-my-feature D-002 --reason "不属于当前版本"

# 所有票据 resolved/excluded 且 fog 清空后，才允许完成阶段
sovei workflow wayfind 001-my-feature --complete

# 小型、明确工作不用建空地图
sovei wayfinder skip 002-small-fix --reason "单文件修复，无跨会话未决问题"
sovei workflow wayfind 002-small-fix --complete
```

规范数据以 `wayfinder-events.jsonl` 为准；`wayfinder.json` 是低分辨率索引，
`decision-tickets/*.json` 是票据详情读模型，`wayfinder.md` 是自动生成的人类视图。
`research` 必须使用 `AFK`，`prototype`/`grilling` 必须使用 `HITL`；HITL 与
research 票据没有证据或上下文引用时不能解决。认领带租约，可避免多个进程重复处理同一票据。

`implement` 按任务执行，`tasks.md` 必须使用稳定 checklist ID：

```bash
# tasks.md: - [ ] TASK-001: implement request adapter
sovei workflow implement 001-my-feature --task TASK-001
# 完成代码并在 change-manifest.md 中记录 TASK-001 后
sovei workflow implement 001-my-feature --task TASK-001 --complete
# 所有任务完成后关闭 implement 阶段
sovei workflow implement 001-my-feature --complete
```

重复执行 `bootstrap` 是幂等的，不会重置已有 Feature 状态。返工仍使用 `reopen`。

## 项目场景

```bash
# 新项目：写入指定目录；已有声明默认拒绝覆盖
sovei project init D:/work/new-app --framework vue --language typescript

# 老项目：扫描当前 --root；重复执行会刷新确定性候选，不重复堆积
sovei --root D:/work/legacy-app project onboard --depth 4

# 同项目多工程：在 Hub 根目录维护注册表
sovei --root D:/work/app-main workspace register D:/work/app-main --id main --hub
sovei --root D:/work/app-main workspace register D:/work/app-feature --id feature
sovei --root D:/work/app-main workspace sync feature
sovei --root D:/work/app-main workspace promote feature
```

Hub 只向卫星分发 stable 知识；卫星只向 Hub 提交 candidate。项目身份、重复 ID、
重复路径和知识 ID 冲突都会阻止同步。Hub 的业务红线也会作为权威治理数据同步到卫星。

## 极端需求变更与业务红线

功能方向大幅变化时，不要直接修改旧 Spec，也不要只执行普通 `reopen`。先声明项目级
业务红线，再创建 Material Change Request：

```bash
# absolute 不允许例外
sovei governance redline add AUTH_REQUIRED \
  --title "Protected actions require authentication" \
  --rule "All purchase and account mutations require authenticated identity" \
  --enforcement absolute

# approval-required 允许有外部审批证据的例外
sovei governance redline add BILLING_CONTRACT \
  --title "Billing contract changes require approval" \
  --rule "Price, renewal, refund, and entitlement semantics require business approval" \
  --enforcement approval-required

sovei governance redline list

# target 是最早失效的阶段；商业方向或红线变化至少回到 grill
sovei workflow change 001-my-feature \
  --target grill \
  --summary "Replace one-time purchase with subscription" \
  --reason "The approved business model changed" \
  --dimensions "business-direction,business-redline,acceptance-or-api-contract"
```

命令会生成 `specs/<feature>/change-requests/CHG-*.json`。应用前必须填写：

- `affectedSurfaces`：业务、接口、权限、计费、数据及兼容面。
- `changeDimensions`：决定最晚允许回退的阶段，防止重大变化被伪装成实现细节。
- `supersedes`：除标准阶段产物外，还需要失效的 Feature 文件。
- `authorizedBy`、`authorizedAt`、`authorizationReference`：重大变更授权证据。
- 每条 active redline 的 `disposition`、`rationale` 和必要 evidence。

创建 draft 后普通 stage、task complete 和 reopen 会被冻结，防止 AI 在审查期间继续引用旧需求。
如果方向变化被撤回，必须显式取消并记录原因：

```bash
sovei workflow cancel-change 001-my-feature CHG-1234567890 \
  --reason "Product retained the original direction"
```

完成审查后应用：

```bash
sovei workflow apply-change 001-my-feature CHG-1234567890
```

应用时 CLI 会执行以下门禁：

- 没有 active 红线时默认阻断，而不是假设“没有风险”。
- 业务方向/红线至少回到 `grill`，用户行为/API 契约回到 `spec`，影响面回到
  `scope`，技术设计回到 `plan`；CLI 拒绝过晚的 target。
- `absolute` 红线不能使用 exception；`approval-required` 例外必须有审批人、时间和引用。
- Change Request 绑定创建时的事件基线；期间工作流发生变化后必须重新创建审查单。
- 从 `targetStage` 开始的旧产物会移动到 `history/revision-*/change-*/`，当前目录重新生成。
- 阶段 Prompt 明确 `history/` 只用于显式差异分析，不能作为当前需求来源。

停用红线也必须保留原因，并追加治理审计事件：

```bash
sovei governance redline deactivate BILLING_CONTRACT --reason "Contract retired by policy GOV-2026-04"
```

## 知识管理

知识有类型化 schema 和生命周期管理：

```bash
# 添加知识
sovei knowledge add --type pitfall --title "..." --content "..." --feature 001-my-feature --tags "vue,events"

# 查看知识
sovei knowledge list
sovei knowledge list --type rule --lifecycle stable

# 晋级知识（candidate → pending → stable）
sovei knowledge promote <id> --feature <feature> --description "证据描述"

# 搜索
sovei knowledge query "内存泄漏"

# 统计
sovei knowledge stats
```

### 知识生命周期

```
candidate (单次观察) → pending (2+ 次验证) → stable (3+ 次验证，人工确认)
```

单次观察永远不会直接晋级到 stable。

## 演进式架构治理

早期代码允许保持简单，随着持续迭代再根据实际压力治理。Sovei 不使用
“超过 2000 行就强制拆分”的单一规则，而是联合判断：

- 文件和函数体积
- 分支复杂度
- Git 90 天变更频率
- 模块扇入、扇出和循环依赖
- UI、API、状态、路由、事件、校验、持久化等职责混杂

单纯体积大只能进入 `watch`。至少两个压力维度叠加后，才会升级为
`refactor-candidate` 或 `refactor-required`。

```bash
# 扫描并保存健康快照
sovei architecture scan --paths src --top 20

# 查看最新热点和已登记技术债
sovei architecture status

# 查看一个模块的信号、依赖和最长函数
sovei architecture inspect src/views/editor/index.vue
sovei architecture inspect ARC-1234ABCD

# 接受为治理事项，只登记，不自动重写代码
sovei architecture accept ARC-1234ABCD \
  --reason "连续多个 Feature 修改且职责继续增长"

# 对稳定生成文件等误报保留决策记录
sovei architecture dismiss ARC-1234ABCD \
  --reason "生成文件，低 churn，不作为手工维护边界"

# CI 适应度检查（实时扫描当前源码，不依赖旧快照）
sovei architecture check --fail-on required
```

支持的治理策略：

- `extract-module`：提取纯函数、类型、API adapter 等低风险职责。
- `branch-by-abstraction`：高扇入或循环依赖时先建立抽象兼容层。
- `expand-migrate-contract`：高 churn、多职责模块分批扩展、迁移、收口。
- `stabilize-with-tests`：边界不清时先补行为基线，再决定拆分。

架构数据保存在 `harness/project/architecture/`：策略、当前快照、趋势历史和
债务登记相互分离。`scope`、`converge`、`learn` 会使用这些信号，但原有
12 阶段工作流保持不变。

## 目录结构

```
sovei/
├── packages/sovei-core/          # TypeScript 引擎包
│   ├── src/
│   │   ├── engine/               # 状态机 + 事件存储
│   │   ├── stages/               # 12 个阶段插件
│   │   ├── architecture/         # 架构健康分析 + 债务登记
│   │   ├── knowledge/            # 知识仓库 (Redux store)
│   │   ├── providers/            # DI 容器
│   │   ├── storage/              # 存储后端
│   │   ├── artifacts/            # Artifact 仓库
│   │   ├── config/               # 配置
│   │   └── cli/                  # CLI 命令
│   └── test/                     # 测试
├── harness/                      # 稳定知识层
│   ├── project/                  # 料（换项目清空重填）
│   │   ├── project.config.json   # 项目声明
│   │   ├── knowledge/            # 类型化知识 (JSON)
│   │   ├── architecture/         # 健康策略、快照、历史、债务
│   │   ├── codegraph/            # 代码地图
│   │   └── rules/                # 规则库
│   └── templates/                # 壳（文档模板）
├── specs/                        # Feature 实例
└── design-docs/                  # 架构设计文档
```

## 架构设计

详细架构设计见 [design-docs/](design-docs/)。

## 技术栈

- **运行时**：Node.js >= 20
- **语言**：TypeScript 5.x
- **依赖**：commander (CLI)、zod (schema 验证)、yaml (配置解析)
- **无 Python、无 PowerShell 依赖**

## 许可

个人使用。
