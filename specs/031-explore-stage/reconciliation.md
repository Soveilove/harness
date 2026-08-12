# Reconciliation — 031-explore-stage

## Need Translation

| PM 原话 | 技术理解 |
|---|---|
| "不丢 PRD 进来，怎么自己生成 feature" | bootstrap 需接受 PRD 输入；explore 命令兼任入口 |
| "/explore 然后一个 PRD 链接，开始需求拆分" | explore 是第一入口，一条指令完成 PRD→Feature→拆分 |
| "生成相对应的 spec 放进 spec 文件" | explore 产出 exploration.md（需求理解），spec 阶段产出 spec.md（规格） |
| "AI 读懂项目这个方式能否优化" | onboard 增加业务覆盖面扫描（吸收 WP-7） |
| "使用 grill 自己多角度拷问" | 走完整 Sovei 工作流，grill 阶段多角度分析 |

## Current State

当前 12 阶段工作流无 explore，拆分评估在 scope（第 5 阶段）。bootstrap 只接受 Feature ID，无 PRD 输入。onboard 产出技术视角证据，缺业务覆盖面报告。

## Solutions

### 方案：新增 explore 阶段 + onboard 增强

**改动范围**：
1. `stages/index.ts` — 新增 exploreStage 定义
2. `engine/workflow-engine.ts` — stageOrder 改为 13 阶段
3. `engine/state-machine.ts` — 向后兼容（老 Feature 跳过 explore）
4. `cli/commands/workflow.ts` — 新增 explore 命令（兼任入口）
5. `cli/commands/project.ts` — onboard 增加业务覆盖面扫描
6. `cli/commands/feature.ts` — feature split 前置条件放宽
7. `adapters/registry.ts` — WORKFLOW_STAGES + slashCommands 更新
8. `adapters/installer.ts` — 无需改动（slashCommands 已支持）

**代价**：
- stageOrder 变更影响状态机核心，需保证向后兼容
- 新增测试覆盖 explore 阶段
- IDE 适配器 slash command 需重新生成

## Questions

无未决问题。grill 阶段已全部决策。

## Sign-off

- [ ] product: 用户已确认方案（"考虑完善了就执行工作流开发"）
- [ ] tech: grill 决策树已闭环，所有技术决策已记录
