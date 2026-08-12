# Decision Log — 031-explore-stage

## 事实核实

### F1：当前 stageOrder 是否包含 explore？
- **类型**：事实核实
- **查证**：`packages/sovei-core/src/engine/workflow-engine.ts:57-60` → `stageOrder = [load, grill, wayfind, spec, scope, plan, tasks, implement, converge, verify, learn, sync]`
- **结论**：**不包含 explore**。当前 12 阶段无 explore，需新增为第 1 阶段（load 之前）。
- **状态**：已决

### F2：scope 阶段的"拆分评估"段是否可移除？
- **类型**：事实核实
- **查证**：`stages/index.ts:303-312` scope 阶段提示契约末尾有"拆分评估"段。`feature split --json` 命令要求 spec.md + scope.md 存在（`feature.ts:587-593`）。
- **结论**：scope 的拆分评估段**保留但不作为主要拆分入口**——explore 阶段做首次拆分提议，scope 阶段做"基于代码影响面的拆分修正"（如果 explore 拆分不合理，scope 可建议调整）。两层评估互补，不冲突。`feature split --json` 的前置条件（需 spec.md + scope.md）**需放宽**——explore 后即可拆分（需 exploration.md + sub-change-map.md）。
- **状态**：已决

### F3：bootstrap 命令当前是否接受 PRD 参数？
- **类型**：事实核实
- **查证**：`workflow.ts:64-75` → `bootstrap` 只接受 `<feature>` 参数，无 `--prd` 或 `--brief`。
- **结论**：**不接受**。需扩展 bootstrap 或让 explore 命令兼任入口。
- **状态**：已决

### F4：onboard 是否产出业务覆盖面报告？
- **类型**：事实核实
- **查证**：`project.ts` runOnboardScan 函数 + `scanner.ts` + `business-map-scanner.ts` → 产出 `business-map.json`（技术能力图，正则推断）、`redlines-seed.json`、`knowledge/*.json`。**无业务覆盖面报告**（类似 webplugin 的 BUSINESS_COVERAGE.md）。
- **结论**：**不产出**。onboard 需增加业务覆盖面扫描步骤（吸收 WP-7）。
- **状态**：已决

### F5：webplugin 的 Explore agent 状态？
- **类型**：事实核实
- **查证**：`web-plugins/ec-web-ai-plugin/CHANGELOG.md` → "移除失效 Explore 依赖"（1.0.24/1.0.25）。`agents/` 目录无 explore.agent.md。
- **结论**：webplugin 的 Explore agent **已被自身废弃**。我们新增的 explore 阶段不是复制它，而是基于 webplugin `1-业务扫描` + `2-需求拆解` 的模式重新设计。
- **状态**：已决

### F6：状态机如何记录 explore 完成？
- **类型**：事实核实
- **查证**：`engine/types.ts` WorkflowState.completedStages: string[]。状态机 reducer 按 stageOrder 推进。
- **结论**：explore 加入 stageOrder 后，`completedStages: [explore]` 即可记录。跨会话恢复时读状态 + 读 exploration.md 产物。
- **状态**：已决

### F7：现有 Feature（已完成 scope 及之后阶段）是否受影响？
- **类型**：事实核实
- **查证**：现有 Feature 的 workflow-state.yaml 已记录 completedStages。如果 stageOrder 变了，状态机 replay 事件时是否兼容？
- **结论**：**需向后兼容**。状态机 replay 基于 append-only 事件日志（workflow-events.jsonl），事件不包含 explore STAGE_COMPLETED → replay 后 completedStages 不含 explore → 但 stageOrder 要求 explore 在 load 之前。**需要兼容处理**：replay 时若 Feature 已有 load 及之后阶段的 STAGE_COMPLETED 事件，但无 explore 事件，视为"老 Feature 跳过 explore"，不阻塞推进。
- **状态**：已决

## 可推断决策

### D1：explore 阶段的产物设计
- **类型**：可推断决策
- **决策**：explore 产出两个文件：
  1. `exploration.md` — PRD 摘要 + 需求项清单 + 与 business-coverage.md 关联（哪些需求属于本项目）+ 拆分建议理由
  2. `sub-change-map.md` — 拆分提议表（SC-ID/名称/目标/依赖），explore 生成草稿，用户确认后 `feature split` 执行
- **理由**：参考 spec 阶段产出 spec.md + reconciliation.md 的双产物模式。exploration.md 是需求理解（后续阶段共享），sub-change-map.md 是拆分决策（可独立消费）。
- **被拒绝方案**：①只产出一个 exploration.md（拆分信息混在需求理解里，不清晰）；②产出三个文件（过度拆分，exploration.md 和 sub-change-map.md 已足够）。
- **状态**：已决

### D2：explore 命令是否兼任入口（替代 bootstrap）？
- **类型**：可推断决策
- **决策**：**explore 兼任入口**。用户运行 `sovei workflow explore <prd-path> [feature-id]`：
  - 若 feature-id 未指定，AI 根据 PRD 内容自动生成（如 `001-user-auth`）
  - explore 命令内部调用 engine.bootstrap() 创建 Feature 目录
  - PRD 文件复制到 `specs/<feature>/prd.md`
  - 然后执行 explore 阶段逻辑
- **理由**：用户要求"一条指令搞定"（`/sovei-explore c:/docs/prd.md`）。bootstrap 退化为内部步骤。
- **被拒绝方案**：保留 bootstrap + explore 两步（用户已明确反对，"太难受了"）。
- **状态**：已决

### D3：explore 阶段是否读代码？
- **类型**：可推断决策
- **决策**：**explore 不读代码**。explore 只读：①PRD 文件 ②business-coverage.md（业务覆盖面）③business-map.json（能力依赖图，可选）。代码现状探索是 load 阶段的职责。
- **理由**：职责正交——explore 问"要做什么"，load 问"现状如何"。避免重复读代码。
- **被拒绝方案**：explore 也读代码（与 load 职责重叠，浪费上下文）。
- **状态**：已决

### D4：business-coverage.md 的生成时机
- **类型**：可推断决策
- **决策**：**onboard 时生成**，不是 init 时。`sovei project onboard` 增加业务覆盖面扫描步骤：
  - 脚本采集：路由配置、视图目录、类型定义、状态层（参考 webplugin `1-业务扫描`）
  - AI 语义判断：读采集结果 + business-map.json → 产出 `sovei-flow/project/business-coverage.md`
  - onboard 指南增加步骤提示 AI 生成此报告
- **理由**：init 只创建骨架（无代码可扫描）；onboard 扫描代码库后才有数据。webplugin 模式也是"每个 PRD 周期执行一次业务扫描"。
- **被拒绝方案**：①init 时生成（无代码可扫描）；②explore 时生成（每次 Feature 都扫描太重，应共享）。
- **状态**：已决

### D5：scope 阶段拆分评估段如何调整？
- **类型**：可推断决策
- **决策**：scope 阶段"拆分评估"段**改为"拆分修正"**——措辞从"评估是否需要拆分"改为"基于代码影响面修正 explore 阶段的拆分提议"。如果 explore 已拆分且 scope 验证合理，直接推进；如果 scope 发现拆分不合理，建议调整 sub-change-map.md。
- **理由**：explore 已做首次拆分（基于需求），scope 做二次验证（基于代码）。两层互补。
- **被拒绝方案**：移除 scope 的拆分评估段（失去了基于代码的二次验证机会）。
- **状态**：已决

### D6：feature split --json 的前置条件如何放宽？
- **类型**：可推断决策
- **决策**：`feature split --json` 前置条件从"需 spec.md + scope.md"改为"需 exploration.md（explore 完成后即有）"。若 exploration.md 不存在，回退到原条件（spec.md + scope.md），保证向后兼容。
- **理由**：explore 后即可拆分，不需等到 scope。
- **状态**：已决

### D7：stageOrder 和 slash command 如何更新？
- **类型**：可推断决策
- **决策**：
  - stageOrder 改为 `[explore, load, grill, wayfind, spec, scope, plan, tasks, implement, converge, verify, learn, sync]`（13 阶段）
  - 新增 `/sovei-explore` slash command（Claude Code / CodeBuddy）
  - Codex skillPackage 和 Trae 文本指令更新节点表格
  - WORKFLOW_STAGES 数组新增 explore 条目
- **理由**：保持 12→13 阶段的一致性更新。
- **状态**：已决

## 范围性决策

### R1：explore 阶段是否需要确认门？
- **类型**：范围性决策
- **推荐答案**：**不需要确认门**。explore 产出的是需求理解和拆分提议（非代码变更），风险低。确认门保留在 spec（S2/S3）和 verify（始终）。explore 的拆分提议由用户在 `feature split` 执行时确认（非状态机门禁）。
- **理由**：避免门禁过多拖慢流程。explore → load 是自然推进，不需产品/技术双签。
- **状态**：已决（用户说"自己补全吧"，按推荐执行）

### R2：explore 阶段是否支持"无 PRD"模式（口头需求）？
- **类型**：范围性决策
- **推荐答案**：**支持**。`sovei workflow explore <feature> --brief "实现用户登录的 OAuth2 支持"` 可不传 PRD 路径，用 `--brief` 内联需求描述。explore 产出 brief.md 替代 prd.md。
- **理由**：不是所有需求都有正式 PRD（小需求、bugfix 升级为 Feature）。支持 `--brief` 降低门槛。
- **状态**：已决（按推荐执行）

### R3：business-coverage.md 是否每次 onboard 覆盖更新？
- **类型**：范围性决策
- **推荐答案**：**是，每次 onboard 覆盖更新**。参考 webplugin"每个 PRD 周期执行一次全量扫描，覆盖上一期"。`sovei project onboard` 每次运行都重新生成 business-coverage.md。
- **理由**：项目演进后业务边界会变化，旧报告会过时。覆盖更新保持新鲜。
- **状态**：已决（按推荐执行）

## 未决项清单

无未决项。所有决策已记录。
