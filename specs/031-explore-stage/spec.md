# Spec — 031-explore-stage

## 需求

新增 `explore` 阶段作为工作流第 1 阶段（load 之前），承担"需求分析 + 业务理解 + 拆分提议"职责。同时增强 `onboard` 命令，产出业务覆盖面报告（吸收 WP-7）。

## 验收标准

### AC-1：explore 阶段定义
- [ ] `stages/index.ts` 新增 exploreStage，定义 prompt 契约（读 PRD + business-coverage → 需求理解 + 拆分提议）
- [ ] explore 产出 `exploration.md` + `sub-change-map.md`（草稿）
- [ ] explore 不读代码（只读 PRD + business-coverage.md + business-map.json）

### AC-2：stageOrder 更新
- [ ] `workflow-engine.ts` DEFAULT_WORKFLOW.stageOrder 改为 13 阶段（explore 在最前）
- [ ] 向后兼容：老 Feature（无 explore 事件）replay 后不阻塞推进

### AC-3：explore 命令兼任入口
- [ ] `workflow.ts` 新增 `sovei workflow explore` 命令
- [ ] 支持 `sovei workflow explore <prd-path> [feature-id]`（PRD 文件路径作为第一参数）
- [ ] 支持 `--brief <text>` 内联需求（无 PRD 文件时）
- [ ] explore 命令内部调用 engine.bootstrap() 创建 Feature 目录
- [ ] PRD/brief 复制到 `specs/<feature>/prd.md` 或 `brief.md`

### AC-4：onboard 增加业务覆盖面扫描
- [ ] `project.ts` runOnboardScan 增加业务覆盖面采集步骤
- [ ] 采集路由配置、视图目录、类型定义、状态层
- [ ] onboard 指南增加步骤提示 AI 生成 business-coverage.md
- [ ] 产出 `sovei-flow/project/business-coverage.md`

### AC-5：feature split 前置条件放宽
- [ ] `feature.ts` feature split --json 前置条件改为"需 exploration.md"
- [ ] 若 exploration.md 不存在，回退到原条件（spec.md + scope.md）

### AC-6：scope 拆分评估段调整
- [ ] `stages/index.ts` scope 阶段"拆分评估"段改为"拆分修正"

### AC-7：IDE 适配器更新
- [ ] `registry.ts` WORKFLOW_STAGES 新增 explore 条目
- [ ] Claude Code / CodeBuddy 新增 `/sovei-explore` slash command
- [ ] Codex skillPackage 和 Trae 文本指令更新节点表格

### AC-8：测试零回归
- [ ] 现有 205 测试全部通过
- [ ] 新增 explore 阶段相关测试
