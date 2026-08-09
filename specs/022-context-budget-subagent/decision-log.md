# Decision Log: 022-context-budget-subagent

> Feature: 上下文包膨胀治理 + IDE 子 Agent 契约
> 阶段: grill | revision: 0

---

## 事实核实

### F1: shadow policy 三变体已实现但 `actual: 'full'` 硬编码

**类型**: 事实核实
**结论**: 已确认。`context/policy.ts:88` 硬编码 `actual: 'full'`，`compatibility: 'preserved'`。
- `scoped` 变体逻辑已实现：按 `--paths` 匹配筛选 required，未命中的降级为 indexed/unloaded
- `index+on-demand` 变体已实现：全部降级为索引摘要
- 但 `actual` 始终是 `'full'`，三个 shadow 变体仅作为影子对比，不影响实际交付
**状态**: 已决

### F2: required 项无整体字符预算上限

**类型**: 事实核实
**结论**: 已确认。`context/builder.ts:124-186` 的 `buildContextPack` 将以下全部塞入 `required`：
1. 所有 active 红线（`fromRedline`）
2. 所有 stable 知识规则（`fromKnowledge`）
3. 所有 required 项目规范（`fromProjectRule`）
4. 当前 Feature 全部 `.md` 产物（每个截断 4000 字符，`fromArtifact`）

无整体字符/token 预算检查，无优先级截断逻辑。
**状态**: 已决

### F3: `--cross-feature` 全量加载所有 Feature decision-log

**类型**: 事实核实
**结论**: 已确认。`cli/commands/context.ts:71-79`：
- `--cross-feature` 遍历 `config.specsDir` 下**所有**目录
- 每个读 `decision-log.md`，跳过仍含模板占位符的
- 每个截断 4000 字符塞入 `suggested`
- 无相关性过滤，无 Top-N 限制，无并行加载
**状态**: 已决

### F4: suggested 项仅有条数限制无字符上限

**类型**: 事实核实
**结论**: 已确认。`builder.ts:155`：`suggested.slice(0, 20)` 限制最多 20 条 candidate/pending 知识，但每条 `fromKnowledge` 不截断 content。advisory 项目规范无任何限制。
**状态**: 已决

### F5: CodeBuddy 支持子 Agent（Task 工具）

**类型**: 事实核实
**结论**: 已确认。CodeBuddy IDE 提供 `Task` 工具，可 spawn 异步子 Agent（如 `code-explorer`）。子 Agent 有独立上下文，可并行执行搜索/读取操作，结果返回给主 Agent。Claude Code (CC) 和 Codex 也有类似机制（CC 的 Task tool、Codex 的 agent 模式）。
**状态**: 已决

### F6: `matchesTarget` 使用简单字符串包含匹配

**类型**: 事实核实
**结论**: 已确认。`policy.ts:116-121`：`matchesTarget` 将 path normalize 后用 `searchable.includes(path)` 做匹配。这是子串匹配，不是 glob/regex，精度有限但对于 path-based 场景够用。
**状态**: 已决

### F7: `ContextPolicyResult.shadow.actual` 类型硬编码为 `'full'`

**类型**: 事实核实
**结论**: 已确认。`policy.ts:88`：`actual: 'full'` 是字面量类型，不是 `'full' | 'scoped' | 'index+on-demand'` 联合类型。需要扩展类型才能支持切换。
**状态**: 已决

---

## 可推断决策

### D1: `actual` 从 `'full'` 改为可选联合类型，默认 `scoped`（有 paths 时）

**类型**: 可推断决策
**决策**: 将 `ContextPolicyResult.shadow.actual` 类型从 `'full'` 扩展为 `'full' | 'scoped' | 'index+on-demand'`。当 `--paths` 提供时默认 `scoped`，无 `--paths` 时回退 `full`（向后兼容）。
**理由**: shadow 变体基础设施已就位，只差激活开关。`scoped` 变体已正确实现 required 拆分逻辑。向后兼容需求明确（无 paths 时行为不变）。
**被拒绝方案**:
- 默认 `index+on-demand`：过于激进，Agent 只拿到摘要索引可能不够推理
- 新增 `--policy <mode>` CLI 参数让用户选：增加认知负担，策略选择应由系统自动决定
**状态**: 已决

### D2: 引入字符预算 + 优先级截断

**类型**: 可推断决策
**决策**: 定义上下文包总字符预算（默认 32768 字符，可通过 `--budget <chars>` 配置）。超预算时按优先级从低到高截断/降级为索引摘要。
**优先级**（高→低）:
1. 全局不变量红线（`enforcement: absolute`，无 scope）
2. 命中路径的红线/规范
3. 当前 Feature 产物
4. stable 知识规则
5. cross-feature 决策日志
6. candidate/pending 知识
7. advisory 项目规范
**理由**: 红线是安全边界必须保留；Feature 产物是当前工作上下文必须保留；知识/cross-feature 是参考性的可降级。32768 字符 ≈ 8K tokens，留足空间给 Agent 推理。
**被拒绝方案**:
- token 预算而非字符预算：需要 tokenizer 依赖，违反零运行时依赖原则
- 不设默认预算，纯靠 scoped 变体：scoped 仍可能在大量红线+知识场景膨胀
**状态**: 已决

### D3: cross-feature 相关性过滤 + 子 Agent 契约

**类型**: 可推断决策
**决策**: 
1. CLI 侧：`--cross-feature` 不再全量加载，改为按 domain/tags/path 重叠度筛选 Top-N（默认 5）
2. 新增 `sovei context cross-feature-index <feature>` 命令：输出 JSON 数组，每项含 featureId + decisionLogPath + title 摘要，供宿主 AI 分派子 Agent 并行读取
3. 新增 `sovei context expand <feature-id> <artifact-name>` 命令：按需展开单个 cross-feature 项的完整内容
**理由**: SA-1 的核心痛点是串行 I/O。但 Sovei CLI 是单进程，真正的并行化需要宿主 AI 层面编排。CLI 的职责是提供结构化 JSON 让宿主 AI 决定是否分派子 Agent，以及提供 on-demand expand 入口。
**被拒绝方案**:
- CLI 内部用 worker_threads 并行：过度工程化，Node 14 兼容性差，且 Sovei 定位是单进程 CLI
- 不做子 Agent 契约，纯靠 Top-N 过滤：解决了量的问题但没解决"宿主 AI 能否并行化"的问题
**状态**: 已决

### D4: `ContextShadowVariant.actual` 类型扩展方式

**类型**: 可推断决策
**决策**: 将 `ContextPolicyResult` 中的 `shadow.actual` 类型从 `'full'` 改为 `'full' | 'scoped' | 'index+on-demand'`，并在 `buildContextPolicy` 中根据 options.paths 和预算计算结果自动选择 actual 值。同时新增 `shadow.actualReason` 字段记录选择理由。
**理由**: 最小改动原则——只扩展类型和赋值逻辑，不重构整个 policy 结构。
**状态**: 已决

### D5: 预算截断实现方式——新增 `applyBudget()` 函数

**类型**: 可推断决策
**决策**: 在 `context/policy.ts` 新增 `applyBudget(pack: ContextPack, budget: number): ContextPack` 函数。按优先级遍历 required+suggested，累计字符数，超预算的项降级为 `ContextIndexItem`（仅保留 240 字符摘要），移入 `policy.shadow.scoped.unloaded`。
**理由**: 截断逻辑独立于构建逻辑，可组合、可测试。不改 `buildContextPack` 的输出结构，只在 policy 层施加预算。
**被拒绝方案**:
- 在 `buildContextPack` 内部截断：耦合构建和策略，难以独立测试
- 在 CLI 层截断：CLI 不应有策略逻辑
**状态**: 已决

### D6: cross-feature 相关性评分算法

**类型**: 可推断决策
**决策**: 简单重叠度评分：当前 Feature 的 paths/tags/domain 与其他 Feature 的 decision-log 标题+标签做交集。评分 = path 重叠数 × 3 + tag 重叠数 × 2 + domain 重叠数 × 1。取 Top-N。
**理由**: 不引入外部依赖（无 embedding/向量搜索），基于已有结构化字段做粗粒度匹配。精确度足够用于"过滤掉明显无关的 Feature"这一目标。
**状态**: 已决

---

## 范围性决策

### R1: 本 Feature 是否同时实现「上下文预算系统」+「子 Agent 契约」？

**类型**: 范围性决策
**推荐**: 是，合并为一个 Feature。两者高度耦合——子 Agent 契约的 `cross-feature-index` 命令是预算系统"cross-feature 过滤"的并行化入口。分开做会导致中间状态：预算系统做了但 cross-feature 仍是全量串行加载，用户体感不完整。
**理由**: 
- 预算系统解决"量"的问题（required 无上限）
- 子 Agent 契约解决"速"的问题（cross-feature 串行 I/O）
- 两者共同构成"P1-3 上下文包膨胀"的完整解法
**被拒绝方案**:
- 拆成两个 Feature（022-budget + 023-subagent）：增加工作流开销，中间状态不完整
- 只做预算系统，子 Agent 契约留到后续：用户明确要求探索子 Agent 方向
**状态**: 已决（用户授权按推荐方案执行——合并为一个 Feature）
