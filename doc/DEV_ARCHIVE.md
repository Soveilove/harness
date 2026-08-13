# Sovei 开发归档（已完成功能）

> 用途：**只读归档**。所有已完成、已闭合的功能与决策沉淀在此，不再排期。
> 活跃开发清单见 [../DEV_BACKLOG.md](../DEV_BACKLOG.md)。
> 建档日期：2026-08-13（从 DEV_BACKLOG.md 拆分）

---

## 1. 已完成项总表

| 完成时间 | 项 | Feature / 来源 |
|---|---|---|
| 2026-08-06 | skills 空壳解决 | Feature 014 |
| 2026-08-07 | Feature 016-skill-verify 闭合（工作流 P0-1） | Feature 016 |
| 2026-08-07 | 013 O1 声明式适配器注册晋级 stable（工作流 P0-2） | knowledge promote |
| 2026-08-09 | 红线 branch 作用域隔离（场景二 P0-1，已发 2.5.7） | Feature 018 |
| 2026-08-09 | 两套 contract 数据源统一（P1-1） | Feature 019 |
| 2026-08-09 | S0 快速通道六步闭环 | Feature 020 |
| 2026-08-10 | quick --json 输出精简（117KB→37KB） | Feature 021 |
| 2026-08-10 | 上下文包膨胀治理 + 子 Agent 契约（P1-3 / SA-1） | Feature 022 |
| 2026-08-10 | IDE 适配器快速通道指令 + .gitignore 自动排除 | Feature 023 |
| 2026-08-10 | 过期感知 L1（P0） | Feature 024 |
| 2026-08-10 | load 阶段增强（P1） | Feature 025 |
| 2026-08-10 | merge preflight 语义冲突预检（场景二 P0-2） | preflight 模块 |
| 2026-08-10 | _subagentContract 契约提示 | Feature 022 后修 |
| 2026-08-11 | quick 通道过度防御修复（P2-7） | Feature P2-7 |
| 2026-08-11 | Feature 流程遗留清理（4 个卡住 Feature 归档） | 人工确认 |
| 2026-08-11 | `sovei feature archive <id>` 过程产物折叠（P1-1） | Feature 026 |
| 2026-08-12 | `sovei feature summary <id>` 聚合视图（P1-2） | Feature 029 |
| 2026-08-13 | Feature 030 拆分能力（Feature 拆子变更并行开发 + P0-A 引擎自主拆分提示） | Feature 030 |
| 2026-08-13 | N7 引擎 Feature 拆分能力 | Feature 030 |
| 2026-08-13 | N1 13 节点 skills 分开存放（init 新增 `sovei-flow/agents/`） | 重大更新 N1 |
| 2026-08-13 | N2 Skills 基座（init 预置 6 个技能模板） | 重大更新 N2 |
| 2026-08-13 | N3 Codex 独立适配（13 节点按钮 + skillPackage 技能包） | 重大更新 N3 |
| 2026-08-13 | N4 init 产物改名 harness → sovei-flow（`project migrate` 迁移脚本） | 重大更新 N4 |
| 2026-08-13 | N5 开源 + MIT + README 全面重写 + npm 包路径调整 | 重大更新 N5 |
| 2026-08-13 | N6 版本更新提示机制（version-check.ts，零依赖 registry 检查） | 重大更新 N6 |
| 2026-08-13 | P0-B 工作流节点调用层（slash command / Codex skill / 文本三层） | P0-B |
| 2026-08-13 | Feature 031 explore 需求入口（工作流第 1 阶段：PRD/brief → 需求理解 → 拆分提议） | Feature 031 |

> **README 版本同步（P1-3）**：已完成（快速通道 quick-msosv36f）；版本号三方同步，命令速查表补充新命令。

---

## 2. 七大重大更新 N1~N7（2026-08-13 全部完成，发布 v2.6.1）

> 背景：先解决适配 code agent 的问题（"指令就是 13 个节点，使用 / 触发"），再做 7 项重大更新。第 7 项（引擎 Feature 拆分）优先，立项 Feature 030；其余 6 项用拆分能力承载。

### 2.1 需求总览

| # | 需求 | 承载方式 |
|---|---|---|
| **N1** | 13 节点 skills 分开存放 | init 新增 `sovei-flow/agents/` 目录，与 `skills/` 分开存放；三方 skills 复制到自有文件夹 |
| **N2** | Skills 基座 | init 新增 `sovei-flow/skills/base/`；预置 6 个技能模板（vue2/vue3/react/cli/python/quant） |
| **N3** | Codex 单独适配 | codex 适配器新增节点按钮 + skillPackage（聚合技能 `sovei-workflow.md`）；installer 支持技能包生成 |
| **N4** | init 产物改名 harness → sovei-flow | 24 源文件 + 19 测试文件路径替换；新增 `project migrate` 命令；当前仓库已迁移 |
| **N5** | 开源 + npm 包路径调整 | LICENSE 改 MIT；README 全面重写；CHANGELOG 补 2.6.0 条目 |
| **N6** | 版本更新提示机制 | version-check.ts（零依赖 npm registry 检查 + 24h 缓存 + 能力注册表）；preAction/postAction 钩子；stderr 输出不污染 JSON |
| **N7** | Feature 拆分能力 | Feature 030（完整 Sovei 工作流） |

### 2.2 P0 结论（2026-08-13 落地）

**P0-A — 引擎自主拆分能力** ✅
- scope 阶段提示契约新增"拆分评估"段（`stages/index.ts`），AI 在 scope 完成后可主动建议运行 `feature split --json` 获取提议契约（`cli/commands/feature.ts`）。
- CLI + agent 提示双通道就绪。

**P0-B — 工作流节点调用方式** ✅（按 IDE 触发机制分三层）
- **Claude Code / CodeBuddy**（slash command）：`adapters install` 生成每阶段 `/sovei-<stage>` slash command 文件（`adapters/registry.ts` slashCommands），封装"准备阶段→读提示契约→填产物→--complete"完整 SOP。
- **Codex 桌面版**（skill 包）：`skillPackage` 生成 `sovei-workflow.md`，agent 通过技能 description 主动唤起（N3）。
- **Trae / Gemini / Aider / Windsurf**（文本指令）：`quickChannelDirective` 追加节点表格，agent 按表运行 `sovei workflow <stage> <feature>`。
- **调用方式结论**：不是 `/load` 自然描述完需求执行，而是**每个阶段一个 slash command**（如 `/sovei-load 001-my-feature`）触发该阶段完整 SOP。需求描述在 `workflow bootstrap` 或 load 阶段记录到 Feature 元数据，后续阶段只推进不重述。

### 2.3 开发顺序（历史记录）

```
Phase 1（2026-08-13）：N7 — Feature 030 拆分能力（含 P0-A scope 阶段拆分评估提示）
Phase 2（2026-08-13）：N1~N6 + Feature 031，发布 v2.6.1
  N4（改名）→ N1+N2（skills）→ N3+N6（codex+版本提示）→ Feature 031（explore）→ N5（开源）
```

---

## 3. Feature 030 开发日志（2026-08-12 → 2026-08-13）

> Feature：`030-feature-sub-changes`（Feature 拆分为多个子变更）。走完整 Sovei 工作流（当时为 12 阶段，explore 尚未加入）。2026-08-13 闭合，205/205 测试通过。

### 3.1 阶段进度

| 阶段 | 产物 | 关键决策 |
|---|---|---|
| load | load-summary.md | 识别 8 个影响模块（types/state-machine/event-store/workflow-engine/artifacts/cli/context/builder） |
| grill | decision-log.md | 子变更粒度模型、状态独立性、并行性、与 change-control 关系 |
| wayfind | wayfinder.md + 决策工单 | 选定"共享前段（load→scope）+ 分叉后段（plan→verify）+ 聚合（learn→sync）" |
| spec | spec.md + reconciliation.md | 6 项验收标准（AC-1~AC-6）；嵌入式子变更状态；4 个新事件类型 |
| scope | scope.md + coverage-matrix.md | 8 个影响模块清单 + 架构压力评估 |
| plan | plan.md | 8 层改动顺序；状态/数据流；契约定义；迁移策略；验证方式 |
| tasks | tasks.md | 11 个 TASK，按依赖排序 |
| implement | change-manifest.md | 全部 11 个 TASK 完成 + P0-A 落地 |
| converge | convergence-report.md | 验收标准对照，功能完整性确认 |
| verify | evidence.md | 205/205 测试通过；AC 对照全绿；P0-A 提示契约验证 |
| learn | learning-report.md | 3 个 candidate 知识条目入库 |
| sync | sync-report.md | 受保护路径审查；命令结果记录；标记 completed |

### 3.2 implement 任务清单

| TASK | 内容 | 层 |
|---|---|---|
| TASK-001 | types.ts — SubChangeState 接口 + 4 事件类型 | 数据层 |
| TASK-002 | state-machine.ts — reducer 4 个子变更 case + canExecuteStage 重载 + aggregationGate | 数据层 |
| TASK-003 | event-store.ts — subChanges YAML 序列化/解析 | 数据层 |
| TASK-004 | workflow-engine.ts — 子变更路由 + 聚合门禁 + splitFeature/listSubChanges | 引擎层 |
| TASK-005 | artifacts/repository.ts — getSubChangePath helper | 引擎层 |
| TASK-006 | feature.ts — feature split + sub-change list | 接口层 |
| TASK-007 | workflow.ts — --sub-change 选项 | 接口层 |
| TASK-008 | context.ts — --sub-change 选项 | 接口层 |
| TASK-009 | builder.ts — 子变更聚焦上下文 | 接口层 |
| TASK-010 | sub-change.test.mjs — 单元测试（13 个） | 验证层 |
| TASK-011 | 回归测试 + archive 兼容（205/205 零回归） | 验证层 |
| P0-A | stages/index.ts — scope 阶段"拆分评估"段 | 接口层 |

### 3.3 关键设计决策

1. **子变更粒度**：共享前段（load→scope）+ 分叉后段（plan→verify）+ 聚合（learn→sync）。一层嵌套，子变更不能再拆。
2. **状态存储**：嵌入式——`WorkflowState.subChanges: SubChangeState[]`，与顶层状态同文件。
3. **事件类型**：4 个新事件（SUBCHANGE_CREATED / STAGE_PREPARE / STAGE_COMPLETE / MERGED），携带 `subChangeId` 路由。
4. **向后兼容**：`subChanges` 默认 `[]`；旧事件无 `subChangeId` 走顶层分支；无 `sub-change-map.md` 走单管线。
5. **聚合门禁**：父 Feature 进入 learn 前 `aggregationGate()` 检查全部 merged。
6. **AI 拆分位置**：scope 产物完成后，`feature split --json` 输出提议契约供 AI 消费。

### 3.4 知识库增量（learn 阶段入库）

| 标题 | 类型 | 类别 |
|---|---|---|
| 嵌入式子状态模式：子实体状态嵌入父实体状态同文件存储 | architecture | candidate |
| 聚合门禁独立于状态转移：门禁在引擎层拦截，reducer 保持纯函数 | rule | candidate |
| AI 自主评估嵌入阶段提示契约，而非新增工作流阶段 | preference | candidate |

---

## 4. 已关闭决策

| # | 决策项 | 结论 |
|---|---|---|
| D17 | 是否做 Codex 技能封装（方案 G）？ | ✅ 已完成（N3，2026-08-13）：codex 适配器生成 `skillPackage`（聚合技能 `sovei-workflow.md`），agent 通过技能 description 主动唤起 |

---

## 5. 已归档的战略决策

### 问题三：Drift Detection — 第一期不做（2026-08-10）

**问题**：普通 AI 会话直接变更代码后，业务红线/代码地图/知识库等治理资产不可信。

**决策理由**：没有门禁 drift 一定发生（做检测也没用），有门禁不需要检测。个人用 L1 过期感知（Feature 024）+ 基线重新校准已覆盖；企业靠 CI 门禁强制走 sovei。行业级未解问题（OpenSpec/SpecKit/Superpower 都没解决）。

**如未来重启需实现**：代码变更检测（baseline vs 工作区）→ 影响面评估（红线 scope / coverage-matrix / knowledge codeEvidence）→ 可信度标记（stale）→ CLI 入口（`sovei drift check`）。依赖统一关系模型做精确影响面计算。
