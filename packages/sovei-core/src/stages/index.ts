/**
 * Sovei Workflow - Stage Definitions
 * All 12 stages with typed contracts and lifecycle hooks.
 * Prompt contracts derived from the original stage-contracts.md.
 *
 * Each stage's `contract` (requiredArtifacts / producesArtifacts) is the single
 * source of truth for that stage's artifact contract. The workflow definition
 * (`WorkflowDefinition`) intentionally does NOT duplicate these — it carries only
 * orchestration concerns (stageOrder / version / ...). See engine/types.ts.
 */

import { defineStage } from './define-stage.js';
import { stageRegistry } from './registry.js';
import { parseLearningReport, reconcileObservations, formatReconcileReport } from '../knowledge/reconcile.js';

// ──────────────────────────────────────────────
// load - Initialize or resume a feature
// ──────────────────────────────────────────────
export const loadStage = defineStage({
  name: 'load',
  description: '根据实际文件校验状态并加载任务相关知识',
  contract: {
    requiredArtifacts: [],
    producesArtifacts: ['load-summary.md'],
  },
  async preExecute(ctx) {
    await ctx.knowledge.loadByTaskType('general');
  },
  async execute(ctx) {
    return {
      stage: 'load',
      artifactsWritten: ['load-summary.md'],
      nextStage: 'grill',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# 阶段：load

## 输入
- Harness 索引、Memory 索引、工作流定义、Feature 状态和实际产物列表。
- 已加载的知识：宪法、偏好、架构、代码地图、规则。

## 操作

### 1. 状态校验
根据实际文件校验状态，确认 Feature 状态、版本匹配、产物无冲突。

### 2. 现状探索
主动读取代码库关键文件，理解当前架构、模块边界和入口点：
- 项目结构概览（主要目录/包/模块）
- 与当前 Feature 可能相关的已有实现
- 依赖关系和技术栈

### 3. 风险识别
基于现状探索，识别与当前 Feature 可能相关的风险点：
- 潜在的耦合或副作用
- 需要特别注意的约束（红线、规范）
- 已知的技术债务或踩坑

## 输出
load-summary.md，包含以下结构：
- 代码库现状摘要（关键模块/入口/架构）
- 与当前 Feature 相关的已有实现
- 潜在风险点

## 初始化
仅当用户明确提供一个尚无状态的 Feature 时创建 workflow-state.yaml，记录 load 已完成、grill 等待执行。

## 停止条件
Feature 不明确、版本不匹配、产物冲突，或缺少状态且用户未明确授权初始化。

## 写入
已有状态不写入；初始化时只写状态文件。load-summary.md 是 AI agent 的探索产出。
`,
    };
  },
  async postExecute(ctx) {
    // 校验 workflow-state 一致性——load 是状态恢复阶段，状态文件是唯一可校验对象
    const state = ctx.workflowState;
    if (!state.featureId) throw new Error('workflow-state missing featureId');
    if (state.revision < 0) throw new Error(`invalid revision: ${state.revision}`);
  },
});

// ──────────────────────────────────────────────
// grill - Resolve decisions by evidence tier: facts, inferences, scope questions
// ──────────────────────────────────────────────
export const grillStage = defineStage({
  name: 'grill',
  description: '区分事实核实、可推断决策与范围性决策，逐项解决业务决策',
  contract: {
    requiredArtifacts: ['load-summary.md'],
    producesArtifacts: ['decision-log.md'],
  },
  async preExecute(ctx) {
    if (!ctx.workflowState.completedStages.includes('load')) {
      return { block: true, reason: 'load stage not completed' };
    }
    await ctx.knowledge.loadByTaskType('decision-making');
  },
  async execute(ctx) {
    return {
      stage: 'grill',
      artifactsWritten: ['decision-log.md'],
      nextStage: 'wayfind',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# 阶段：grill

## 输入
有效的 load 结果和当前请求。

## 操作
沿决策树逐层推进，依次解决依赖关系。对每个待决议项，先判断其类型，再选择处理方式：

1. 事实核实——能从代码、文档、配置或既有知识查证的，直接查证并记录结论，不问用户。
2. 可推断决策——项目约定、既有模式或证据指向明确最优解的，自行决策并记录理由和被拒绝方案，不等用户确认。
3. 范围性决策——无法从证据推断且会实质改变 Feature 范围的，逐个向用户提问。每个问题附上推荐答案和理由，一次只问一个，收到回复后再继续下一项；同时抛出多个问题会造成信息过载。

提问纪律：
- 先给出推荐答案和理由，再请用户确认或修正。
- 一次只提一个问题，等用户回复后再推进下一项。
- 用户确认视为达成共识；未确认的标注为未决。

## 输出
decision-log.md，包含每项决议的类型（事实核实/可推断决策/范围性决策）、决策内容、理由、被拒绝方案、状态（已决/未决）和未决项清单。

## 停止条件
所有事实已核实、所有可推断决策已记录、所有范围性决策已获得用户回复或标注为未决。本阶段不得实施。
`,
    };
  },
  async postExecute(ctx, result) {
    const artifact = await ctx.artifacts.read('decision-log.md');
    if (!artifact) throw new Error('decision-log.md not generated');
  },
});

// ──────────────────────────────────────────────
// wayfind - Map unknown decisions for large features
// ──────────────────────────────────────────────
export const wayfindStage = defineStage({
  name: 'wayfind',
  description: '为大型或高不确定性 Feature 绘制决策地图',
  contract: {
    requiredArtifacts: ['decision-log.md'],
    producesArtifacts: ['wayfinder.md'],
  },
  async preExecute(ctx) {
    if (!ctx.workflowState.completedStages.includes('grill')) {
      return { block: true, reason: 'grill stage not completed' };
    }
  },
  async execute(ctx) {
    return {
      stage: 'wayfind',
      artifactsWritten: ['wayfinder.md'],
      nextStage: 'spec',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# 阶段：wayfind

## 输入
已接受的决策和当前 Feature 范围。

## 操作
先确定目标，再建立决策地图。区分当前决策票据、阻塞关系、决策前沿、未知区域和范围外事项。
每个会话解决一张决策票据；相互独立的调研可并行。使用类型化 Wayfinder 命令：chart/skip、ticket add、
fog add/graduate、frontier、claim、resolve、release 和 exclude；解决前必须先领取。
地图只是索引，票据 JSON 是决策细节的唯一事实来源。

## 输出
wayfinder-events.jsonl 为事实来源，wayfinder.json 为低分辨率索引，decision-tickets/*.json 保存细节，
wayfinder.md 供人工阅读。

## 停止条件
目标是消除规划前的未知决策，不是实施。仅当所有票据已解决或排除且 fog 为空时完成。
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('wayfinder.md');
    if (!artifact) throw new Error('wayfinder.md not generated');
  },
});

// ──────────────────────────────────────────────
// spec - Define requirements and acceptance criteria
// ──────────────────────────────────────────────
export const specStage = defineStage({
  name: 'spec',
  description: '定义问题、用户可见行为、边界和验收场景',
  contract: {
    requiredArtifacts: ['decision-log.md', 'wayfinder.md'],
    producesArtifacts: ['spec.md', 'reconciliation.md'],
  },
  async preExecute(ctx) {
    await ctx.knowledge.loadByTaskType('specification');
  },
  async execute(ctx) {
    return {
      stage: 'spec',
      artifactsWritten: ['spec.md'],
      nextStage: 'scope',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# 阶段：spec

## 输入
已接受的决策、相关的业务/知识/基线证据，以及跨 Feature 的历史决策日志（通过 sovei context build --stage spec --cross-feature 获取）。

## 操作
1. 需求翻译：将 PM 的原话翻译为技术理解，明确“做什么”和“不做什么”。
2. 还原现状：读代码 + 跨 Feature 的 decision-log，理解“代码为什么是现在这个样子”。PM 可能不知道上一个需求做了什么附带改动。
3. 方案与代价：列出可选方案及其代价（影响面、风险、兼容性）。
4. 疑问提取：区分 [product] 和 [tech] 的疑问，每个附推荐和选项。
5. 定义验收标准：用户可见行为、边界、排除项。

## 输出
spec.md：验收标准，不写入易变的实现路径。
reconciliation.md：需求对齐文件，结构如下：

# Reconciliation: <feature-id> <title>

## Need Translation
<PM 原话 → 技术理解>

## Current State
<代码现状 + 为什么是这样，引用跨 Feature 决策>

## Solutions
### Solution A: <name>
- <描述>
- cost: <代价>

### Solution B: <name>
- <描述>
- cost: <代价>

## Questions
### [product] Q1: <问题>
- recommendation: <推荐>
- options: [选项1] [选项2]

### [tech] Q2: <问题>
- recommendation: <推荐>

## Sign-off
- [ ] product: by: ____ date: ____ ref: ____
- [ ] tech: by: ____ date: ____ ref: ____

## 停止条件
仍存在会改变用户行为或契约的未决事项。`,
    };
  },
  async postExecute(ctx) {
    const spec = await ctx.artifacts.read('spec.md');
    if (!spec) throw new Error('spec.md not generated');
    const recon = await ctx.artifacts.read('reconciliation.md');
    if (!recon) throw new Error('reconciliation.md not generated');
  },
});

// ──────────────────────────────────────────────
// scope - Trace real impact surface
// ──────────────────────────────────────────────
export const scopeStage = defineStage({
  name: 'scope',
  description: '追踪真实入口、状态、参数、I/O、异步生命周期和消费者',
  contract: {
    requiredArtifacts: ['spec.md'],
    producesArtifacts: ['scope.md', 'coverage-matrix.md'],
  },
  async preExecute(ctx) {
    await ctx.knowledge.loadByTaskType('impact-analysis');
  },
  async execute(ctx) {
    return {
      stage: 'scope',
      artifactsWritten: ['scope.md', 'coverage-matrix.md'],
      nextStage: 'plan',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# 阶段：scope

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
`,
    };
  },
  async postExecute(ctx) {
    const scope = await ctx.artifacts.read('scope.md');
    const matrix = await ctx.artifacts.read('coverage-matrix.md');
    if (!scope) throw new Error('scope.md not generated');
    if (!matrix) throw new Error('coverage-matrix.md not generated');
  },
});

// ──────────────────────────────────────────────
// plan - Technical design
// ──────────────────────────────────────────────
export const planStage = defineStage({
  name: 'plan',
  description: '定义模块边界、状态/数据流、契约和迁移策略',
  contract: {
    requiredArtifacts: ['spec.md', 'scope.md', 'coverage-matrix.md'],
    producesArtifacts: ['plan.md'],
  },
  async preExecute(ctx) {
    await ctx.knowledge.loadByTaskType('planning');
  },
  async execute(ctx) {
    return {
      stage: 'plan',
      artifactsWritten: ['plan.md'],
      nextStage: 'tasks',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# 阶段：plan

## 输入
有效的 Spec、Scope、Coverage Matrix、架构规则和决策。

## 操作
定义模块边界、状态/数据流、契约、迁移策略和验证方式。

## 输出
plan.md；不得修改实现文件。

## 停止条件
必需覆盖缺失时返回 scope；不得绕过未知项制定计划。
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('plan.md');
    if (!artifact) throw new Error('plan.md not generated');
  },
});

// ──────────────────────────────────────────────
// tasks - Split into independently verifiable tasks
// ──────────────────────────────────────────────
export const tasksStage = defineStage({
  name: 'tasks',
  description: '拆分为可独立验证的纵向任务',
  contract: {
    requiredArtifacts: ['plan.md'],
    producesArtifacts: ['tasks.md'],
  },
  async execute(ctx) {
    return {
      stage: 'tasks',
      artifactsWritten: ['tasks.md'],
      nextStage: 'implement',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# 阶段：tasks

## 输入
有效的 Plan、Scope、Coverage Matrix、决策和当前代码基线。

## 操作
将工作拆成单个新上下文可完成、可独立验证的纵向任务。为每项声明依赖、文件/契约范围、验收标准和验证方式。

## 输出
tasks.md；使用稳定的清单 ID，例如 "- [ ] TASK-001: 描述"。不得修改实现文件。

## 停止条件
任务依赖未解决契约或未知影响面时，重新打开 plan 或 scope。
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('tasks.md');
    if (!artifact) throw new Error('tasks.md not generated');
  },
});

// ──────────────────────────────────────────────
// implement - Execute one ready task
// ──────────────────────────────────────────────
export const implementStage = defineStage({
  name: 'implement',
  description: '仅实施选定且已就绪的任务，并保留无关改动',
  contract: {
    requiredArtifacts: ['tasks.md'],
    producesArtifacts: ['change-manifest.md'],
  },
  async preExecute(ctx) {
    await ctx.knowledge.loadByTaskType('implementation');
  },
  async execute(ctx) {
    return {
      stage: 'implement',
      artifactsWritten: ['change-manifest.md'],
      nextStage: 'converge',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# 阶段：implement

## 输入
一个已就绪任务、Spec、Scope、Plan、规则和当前基线。

## 操作
只实施选定任务，保留无关改动，并按风险运行聚焦验证。

## 输出
产品/工具改动，以及记录任务、文件、行为、测试和剩余工作的 change-manifest.md。

## 完成条件
还有就绪任务时停留在 implement。所有必需任务完成或明确延期后，才能将 implement 标记完成。

## 停止条件
实施发现新决策、范围或设计约束时，重新打开最早失效阶段；不得静默扩大任务。
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('change-manifest.md');
    if (!artifact) throw new Error('change-manifest.md not generated');
  },
});

// ──────────────────────────────────────────────
// converge - Check implementation against contracts
// ──────────────────────────────────────────────
export const convergeStage = defineStage({
  name: 'converge',
  description: '将差距分类为缺失、部分满足、冲突或未请求',
  contract: {
    requiredArtifacts: ['change-manifest.md'],
    producesArtifacts: ['convergence-report.md'],
  },
  async execute(ctx) {
    return {
      stage: 'converge',
      artifactsWritten: ['convergence-report.md'],
      nextStage: 'verify',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# 阶段：converge

## 输入
Spec、Scope、Plan、Tasks、Coverage Matrix、Change Manifest、基线、当前实现和涉及模块的架构健康信息。

## 操作
将每项差距分类为 missing、partial、contradicts 或 unrequested。追加纠正任务，不重写历史。
检查 Feature 是否加剧既有热点、引入新依赖循环，或继续向候选模块增加职责。

## 输出
convergence-report.md，记录每项发现的证据和处置。

## 停止条件
实现差距返回 tasks，契约差距重新打开更早阶段；存在未关闭的高严重度发现时不得声称完成。
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('convergence-report.md');
    if (!artifact) throw new Error('convergence-report.md not generated');
  },
});

// ──────────────────────────────────────────────
// verify - Acceptance verification
// ──────────────────────────────────────────────
export const verifyStage = defineStage({
  name: 'verify',
  description: '分别验证需求符合性与工程质量',
  contract: {
    requiredArtifacts: ['convergence-report.md'],
    producesArtifacts: ['evidence.md'],
  },
  async execute(ctx) {
    return {
      stage: 'verify',
      artifactsWritten: ['evidence.md'],
      nextStage: 'learn',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# 阶段：verify

## 输入
验收场景、Coverage Matrix、实现、收敛结果和环境能力。

## 操作
分别验证需求符合性和工程质量；除聚焦测试外，适用时还需真实流程、请求/日志或视觉证据。

## 输出
evidence.md，包含命令、结果、证据位置、限制和结论。

## 停止条件
失败时返回 tasks 或 converge。异步或视觉行为不能只凭单元测试通过。
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('evidence.md');
    if (!artifact) throw new Error('evidence.md not generated');
  },
});

// ──────────────────────────────────────────────
// learn - Classify and distill observations
// ──────────────────────────────────────────────
export const learnStage = defineStage({
  name: 'learn',
  description: '分类观察结果，自动提取知识并对账到知识库',
  contract: {
    requiredArtifacts: ['evidence.md'],
    producesArtifacts: ['learning-report.md'],
  },
  async execute(ctx) {
    return {
      stage: 'learn',
      artifactsWritten: ['learning-report.md'],
      nextStage: 'sync',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# 阶段：learn

## 输入
决策、实施偏差、收敛发现、验证证据、当前 Harness 知识和架构健康变化。
当前知识库中的 candidate/pending 条目（供匹配参考）。

## 操作
1. 将观察分类为仅项目适用、candidate/pending、stable 晋升提案或拒绝模式。
2. 多个 Feature 反复触及同一热点时，应基于证据提出架构债务条目。
3. **必须**在 learning-report.md 末尾添加 "## 知识提取" 段落，包含一个 yaml:knowledge-delta 代码块，
   将所有可沉淀的观察以结构化格式输出，引擎将自动对账到知识库。
4. 用蒸馏判断准则提炼观察——区分领域级知识 vs 一次性实现细节。知识条目应捕捉
   "为什么值得记住"，而非"怎么实现的"。核心测试：
   - "Would we rebuild it?"：重写系统时这个结论还会进约定吗？会才沉淀。
   - "Why" 测试：后续 Feature 为什么关心这个？说不清就是实现细节。
   - "Could it be different?"：换实现方式还成立吗？成立才沉淀。
   - "Means vs Ends"：沉淀"目的/原则"，不沉淀"手段/具体 API"。
   - 排除：具体库名/API、文件行号、一次性变量、框架语法、基础设施（除非影响约定）。
   多个 Feature 反复触及同一热点时，归并到同一知识条目累积证据，不要各写一条。

## 输出
learning-report.md，包含：
- 观察分类（来源 Feature、证据、适用范围、建议目标）
- "## 知识提取" 段落，包含 yaml:knowledge-delta 结构化块

### knowledge-delta 格式

在 learning-report.md 末尾添加如下结构化块（用三反引号包裹，语言标记为 yaml:knowledge-delta）：

    observations:
      - title: "观察标题"
        type: rule          # rule | pitfall | decision | architecture | code-map | preference | constitution
        content: "知识条目内容"
        tags: [tag1, tag2]
        category: candidate # candidate | pending-proposal | stable-proposal | rejected
        evidence: "本 Feature 提供的证据描述"
        relatedEntryId: null # 认出现有条目时填 ID，否则 null

category 含义：
- candidate: 新观察，首次记录
- pending-proposal: 跨 2+ Feature 的观察，建议晋级 pending
- stable-proposal: 跨 3+ Feature 的观察，建议晋级 stable
- rejected: 拒绝模式，仅记录在报告中，不进入知识库

匹配规则：如果本 Feature 的观察与已有知识条目描述同一问题，填入 relatedEntryId。
引擎会自动按标题相似度 + 标签重叠度匹配，relatedEntryId 是加速提示。

## 自动化行为
引擎在 postExecute 中自动执行：
- 新观察 ADD 为 candidate
- 已有条目 + 新证据 PROMOTE（candidate 到 pending 需 2 证据，pending 到 stable 需 3 证据）
- 自动晋级 stable 的条目记录在 knowledge-delta.md 中，供事后审查
- 拒绝模式（category: rejected）不会进入知识库

## 停止条件
无。stable 晋级由证据数量自动驱动，人工审查改为事后回退模式。
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('learning-report.md');
    if (!artifact) throw new Error('learning-report.md not generated');

    // ── Auto-reconcile observations into knowledge store ──
    const observations = parseLearningReport(artifact);

    if (observations.length > 0) {
      await ctx.knowledge.load();
      const result = reconcileObservations(observations, ctx.knowledge, ctx.featureId);
      await ctx.knowledge.persist();

      const report = formatReconcileReport(result, ctx.featureId);
      await ctx.artifacts.write('knowledge-delta.md', report);

      ctx.logger.info(
        '知识对账完成: ' + result.added.length + ' 新增, ' + result.promoted.length + ' 晋级' +
        (result.autoStable.length > 0
          ? ', ' + result.autoStable.length + ' 自动 stable（需事后审查）'
          : ''),
      );
    } else {
      await ctx.artifacts.write(
        'knowledge-delta.md',
        '# 知识对账报告\n\n> Feature: ' + ctx.featureId + '\n\n（learning-report.md 未包含 knowledge-delta 块，无知识变更）\n',
      );
    }
  },
});

// ──────────────────────────────────────────────
// sync - Final sync and completion
// ──────────────────────────────────────────────
export const syncStage = defineStage({
  name: 'sync',
  description: '同步已审核的学习晋级并完成工作流',
  contract: {
    requiredArtifacts: ['learning-report.md'],
    producesArtifacts: ['sync-report.md'],
  },
  async execute(ctx) {
    return {
      stage: 'sync',
      artifactsWritten: ['sync-report.md'],
      nextStage: null,
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# 阶段：sync

## 输入
已验证的 Feature、已审核的知识晋级和当前同步规则。

## 操作
运行目标 Status 和 Diff，审查受保护路径，仅同步明确授权的目标，然后重新运行 Diff。

## 输出
sync-report.md，包含目标、同步前后差异、受保护文件、命令结果和跳过目标。

## 完成条件
所有授权目标通过同步后检查，再将工作流标记为 completed，next_stage 为 null。

## 停止条件
未授权、目标脏或不明确、受保护路径冲突、同步后 Diff 失败。不得凭暗示批量同步。
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('sync-report.md');
    if (!artifact) throw new Error('sync-report.md not generated');
  },
});

// ──────────────────────────────────────────────
// Register all stages
// ──────────────────────────────────────────────
const allStages = [
  loadStage, grillStage, wayfindStage, specStage, scopeStage, planStage,
  tasksStage, implementStage, convergeStage, verifyStage, learnStage, syncStage,
];

for (const stage of allStages) {
  stageRegistry.register(stage);
}

export { stageRegistry };
