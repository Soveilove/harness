# 决策日志

> 由 Sovei 阶段生成：grill
> Feature：007-template-remediation
> 目的：修复 harness/templates 模板孤岛问题

## 待修复问题清单（已核实）

### 事实核实（源码/仓库直接查证）

#### D1. `harness/templates/sovei/` 是死模板目录
- **类型**：事实核实
- **内容**：`harness/templates/sovei/` 下 13 个模板文件（change-manifest/convergence-report/coverage-matrix/decision-log/evidence/learning-report/plan/scope/spec/sync-report/tasks/wayfinder/workflow-history + workflow-state-template.yaml），**没有任何代码读取**。
- **证据**：
  - 引擎生成模板的唯一来源是 `workflow-engine.ts:485-508` 的 `getArtifactTemplate`（代码内嵌，含标题+提示契约+占位符）。
  - 全仓搜索 `templates/sovei`、`template.md`、`readTemplate`、`loadTemplate` 均无读取代码。
  - `project.ts:163` 只创建 `harness/templates/` 空目录（`.gitkeep`），不写入/读取模板文件。
  - `workflow-state-template.yaml` 也不被用：`event-store.ts:87` 用自研 `stateToYaml` 生成状态缓存。
- **状态**：已决

#### D2. 模板文件已纳入 git 追踪
- **类型**：事实核实
- **内容**：13 个模板文件由 commit `0728305`（"初始化项目治理红线与知识库，添加中文模板和IDE适配器支持"）创建，被 git 追踪。删除需同步 git。
- **状态**：已决

#### D3. 引擎模板不依赖这些文件，功能完备
- **类型**：事实核实
- **内容**：`getArtifactTemplate` 内嵌模板包含全部 12 阶段产物的标题、提示契约和模板占位符，`completeStage` 的 `validateProduced` 依赖该占位符判断"仍是模板"。功能完整，不依赖外部模板文件。
- **状态**：已决

### 可推断决策（证据指向明确最优解）

#### D4. 方案：删除死模板文件（方案 B），而非接入引擎
- **类型**：可推断决策
- **内容**：删除 `harness/templates/sovei/` 下 13 个未被消费的模板文件；保留 `harness/templates/` 目录结构（`project.ts` 依赖它创建空目录）。
- **理由**：
  1. 引擎模板是代码内嵌的，功能完备且含提示契约，外部模板文件无法替代（接入需改造 `getArtifactTemplate` + 处理发布打包问题）。
  2. **接入方案不可行**：release 是 esbuild 单文件 bundle（`build-release.mjs`），不打包 harness 目录；`project init` 也不复制模板文件到新项目。新用户项目里根本没有这些模板文件，接入会因文件缺失而失败。
  3. 保留死模板会**误导使用者**——让人误以为修改它能影响生成产物，实则改代码才能生效。
- **被拒绝方案**：
  - 接入引擎（方案 A）：因发布打包不含 harness、新项目无模板文件而不可行。
  - 保留但文档标注为"仅供参考"：仍会造成双源混乱，且无实际价值。
- **状态**：已决

#### D5. 同步清理文档引用
- **类型**：可推断决策
- **内容**：`harness/index.md` 第 30 行将 `templates/` 描述为"壳（文档模板）"。删除死模板后，需将该目录说明更新为"由引擎内嵌生成，目录仅为占位"或移除误导性描述，避免文档声称存在实际不用的模板。
- **理由**：文档与实现必须一致；`index.md` 是工作流权威使用文档，需反映模板由引擎内置的事实。
- **状态**：已决

## 未决项清单
- 无。D1-D5 均已依据源码与仓库事实解决，无需要用户额外裁决的范围性决策（删除死文件为明确最优解，且用户已授权拆分修复）。
