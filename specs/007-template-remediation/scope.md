# 影响范围

> 由 Sovei 阶段生成：scope
> Feature：007-template-remediation

## 修改入口

1. 删除 `harness/templates/sovei/` 下 13 个模板文件：
   - change-manifest-template.md
   - convergence-report-template.md
   - coverage-matrix-template.md
   - decision-log-template.md
   - evidence-template.md
   - learning-report-template.md
   - plan-template.md
   - scope-template.md
   - spec-template.md
   - sync-report-template.md
   - tasks-template.md
   - wayfinder-template.md
   - workflow-history-template.md
   - workflow-state-template.yaml
2. 更新 `harness/index.md` 第 30 行 `templates/` 目录说明。

## 消费者与影响

### 删除文件的引用核查（全部无引用）
- **引擎**：`workflow-engine.ts:getArtifactTemplate` 用代码内嵌模板，不读取任何外部模板文件。
- **project init**：`project.ts:163` 只创建 `harness/templates/` 目录 + `.gitkeep`，不写入模板文件。
- **状态生成**：`event-store.ts:87` 用 `stateToYaml` 生成 workflow-state.yaml，不读模板。
- **review 渲染**：`review/renderer.ts` 生成 review 产物，不依赖模板文件。
- **测试**：测试导入 `dist/index.js`，不引用 harness/templates。

### index.md 更新影响
- `harness/index.md:30` 是目录结构说明的一部分，更新为反映"模板由引擎内嵌生成"。

## 明确不覆盖
- 引擎源码、阶段定义、release 构建逻辑。
- 12 阶段产物契约。
- `harness/templates/.gitkeep` 与目录结构。
- 已生成的 feature 历史产物。

## 架构压力记录
- 死模板根因：历史遗留（commit 0728305）引入外部模板，但引擎演进为内嵌模板后未同步清理。本 Feature 清理之，无新增债务。

## 兼容路径
- `project init` 仍创建空 `harness/templates/` 目录，功能不变。
- 引擎 prepare 仍内嵌生成模板，功能不变。
- 无需数据迁移或事件回放变更。
