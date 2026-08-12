# Tasks: 030-feature-sub-changes

> 由 Sovei 阶段生成：tasks
> 基于 plan.md 的 8 层依赖顺序拆分。每个 TASK 可独立在 implement 阶段勾选。

## 任务清单

- [ ] TASK-001: 在 `engine/types.ts` 新增子变更类型定义
  - 依赖：无（最底层）
  - 文件：`packages/sovei-core/src/engine/types.ts`
  - 改动：
    - 新增 `SubChangeState` 接口（id/name/goal/dependsOn/currentStage/completedStages/completedTaskIds/status/createdAt）
    - 在 `WorkflowState` 新增 `subChanges: SubChangeState[]` 字段
    - 在 `WorkflowEvent` 联合类型新增 4 个事件：`SUBCHANGE_CREATED`、`SUBCHANGE_STAGE_PREPARE`、`SUBCHANGE_STAGE_COMPLETE`、`SUBCHANGE_MERGED`（每个事件携带 `subChangeId: string` 字段）
  - 验收：tsc 类型检查通过；现有事件类型保持兼容

- [ ] TASK-002: 在 `engine/state-machine.ts` 实现子变更 reducer 分支
  - 依赖：TASK-001
  - 文件：`packages/sovei-core/src/engine/state-machine.ts`
  - 改动：
    - `createInitialState` 返回值加入 `subChanges: []`
    - `workflowReducer` 新增 4 个 case：
      - `SUBCHANGE_CREATED`：push 新 SubChangeState（status='pending', currentStage=null）
      - `SUBCHANGE_STAGE_PREPARE`：定位 subChange，设置 currentStage（首次推进时校验依赖已 merged）
      - `SUBCHANGE_STAGE_COMPLETE`：更新 completedStages、推进 currentStage；verify 完成时 status 置为 'merged'
      - `SUBCHANGE_MERGED`：显式标记 merged（与 verify 完成自动 merged 互补）
    - `canExecuteStage` 重载：当传入 `subChangeId` 时，校验子变更状态而非顶层 currentStage
  - 验收：单元测试覆盖 4 个事件；现有顶层事件路径行为不变

- [ ] TASK-003: 在 `engine/event-store.ts` 处理 subChangeId 序列化与 replay 分桶
  - 依赖：TASK-001
  - 文件：`packages/sovei-core/src/engine/event-store.ts`
  - 改动：
    - `stateToYaml` 新增 `subChanges` 段输出
    - `parseStateYaml` 解析 `subChanges` 段（数组形式）
    - `replay` 函数无需改动（reducer 内部按 subChangeId 路由，旧事件无 subChangeId 字段时走顶层分支）
  - 验收：旧格式 workflow-state.yaml（无 subChanges 段）可被解析为 `subChanges: []`；新格式可往返序列化

- [ ] TASK-004: 在 `engine/workflow-engine.ts` 添加子变更路由与聚合门禁
  - 依赖：TASK-002、TASK-003
  - 文件：`packages/sovei-core/src/engine/workflow-engine.ts`
  - 改动：
    - `prepareStage` 与 `completeStage` 接受可选 `options.subChangeId`
    - 当 `subChangeId` 存在时：
      - artifacts 路径切换为 `${featurePath}/sub-changes/${subChangeId}/`
      - 校验 `dependsOn` 中所有子变更 status === 'merged'，否则抛错并报告阻塞项
      - append 事件时携带 subChangeId
    - 顶层 `prepareStage('learn', feature)` 新增聚合门禁：若 `state.subChanges.length > 0` 且非全部 merged，则抛错并列出未完成项
    - `completeStage('verify', feature, { subChangeId })` 完成后自动追加 `SUBCHANGE_MERGED` 事件
    - 新增 `splitFeature(featureId, subChanges)` 方法：批量 append `SUBCHANGE_CREATED` 事件 + 创建脚手架目录
    - 新增 `listSubChanges(featureId)` 方法：返回 subChanges 数组及 blocked 状态
  - 验收：子变更可独立推进 plan→verify；聚合门禁正确阻塞 learn

- [ ] TASK-005: 在 `artifacts/repository.ts` 支持子变更产物命名空间
  - 依赖：无
  - 文件：`packages/sovei-core/src/artifacts/repository.ts`
  - 改动：
    - ArtifactRepository 已通过 `featurePath` 参数抽象，无需改动核心方法
    - 新增导出 helper `getSubChangePath(featurePath, subChangeId): string` 返回 `${featurePath}/sub-changes/${subChangeId}`
  - 验收：子变更产物写入 `specs/<feature>/sub-changes/<id>/plan.md` 等位置

- [ ] TASK-006: 在 `cli/commands/feature.ts` 实现 `feature split` 与 `feature sub-change list`
  - 依赖：TASK-004
  - 文件：`packages/sovei-core/src/cli/commands/feature.ts`
  - 改动：
    - 新增 `splitFeature` CLI 子命令：`feature split <id>`
      - 读取 spec.md + scope.md，输出拆分提议提示契约（AI 填充 sub-change-map.md 草稿）
      - 用户确认后调用 `engine.splitFeature()` 创建子变更
    - 新增 `sub-change` 命令组：
      - `feature sub-change list <id>`：表格输出 id/name/status/currentStage/dependsOn/blocked
    - `PERSISTENT_FILES` 白名单加入 `sub-change-map.md`（archive 时保留）
  - 验收：`sovei feature split <id>` 与 `sovei feature sub-change list <id>` 可用

- [ ] TASK-007: 在 `cli/commands/workflow.ts` 添加 `--sub-change` 选项
  - 依赖：TASK-004
  - 文件：`packages/sovei-core/src/cli/commands/workflow.ts`
  - 改动：
    - 12 个阶段命令统一新增 `.option('--sub-change <id>', '子变更 ID')`
    - `--sub-change` 存在时，prepare/complete 调用传入 `engine.prepareStage(feature, stage, { subChangeId })` / `engine.completeStage(feature, stage, { subChangeId })`
    - `--sub-change` 仅允许在 plan→verify 阶段使用（load→scope 与 learn→sync 拒绝）
    - `printState` 增加子变更进度段（当 state.subChanges 非空时）
  - 验收：`sovei workflow plan <feature> --sub-change SC-030-01` 可用

- [ ] TASK-008: 在 `cli/commands/context.ts` 添加 `--sub-change` 选项
  - 依赖：TASK-005
  - 文件：`packages/sovei-core/src/cli/commands/context.ts`
  - 改动：
    - `context build` 新增 `.option('--sub-change <id>', '聚焦子变更 ID')`
    - 当 `--sub-change` 存在时：
      - artifacts 路径切换为子变更目录
      - 上下文包含父 Feature 的 load→scope 产物（共享）+ 当前子变更的 plan→verify 产物（专属）+ 其他子变更的 id/name/goal/status 摘要
    - 无 `--sub-change` 时退化为当前行为
  - 验收：`sovei context build --feature <f> --stage <s> --sub-change <id>` 输出聚焦上下文

- [ ] TASK-009: 在 `context/builder.ts` 支持子变更聚焦上下文
  - 依赖：TASK-005
  - 文件：`packages/sovei-core/src/context/builder.ts`
  - 改动：
    - `buildContextPack` 参数新增可选 `subChange?: { id, artifacts, siblings }`
    - 当传入 subChange 时，required 段注入子变更专属产物，crossFeature 段注入兄弟子变更摘要
  - 验收：子变更上下文包结构正确

- [ ] TASK-010: 新增 `test/sub-change.test.mjs` 单元测试
  - 依赖：TASK-001 ~ TASK-009 全部完成
  - 文件：`packages/sovei-core/test/sub-change.test.mjs`
  - 覆盖场景：
    - 子变更创建：SUBCHANGE_CREATED 正确更新 subChanges 数组
    - 子变更阶段推进：SUBCHANGE_STAGE_PREPARE/COMPLETE 正确更新 currentStage
    - 依赖约束：有未 merged 依赖时 prepareStage(plan, subChange) 失败
    - 聚合门禁：有未 merged 子变更时 prepareStage(learn) 失败
    - 子变更合并：completeStage(verify, subChange) 后 status 变为 merged
    - replay 分桶：混合顶层 + 子变更事件正确还原状态
    - 向后兼容：旧格式事件（无 subChangeId）replay 结果与当前一致
    - CLI：`feature split` 创建 sub-change-map.md + 脚手架目录
    - CLI：`feature sub-change list` 输出表格
    - CLI：`workflow plan --sub-change` 在子变更上下文执行
  - 验收：所有测试场景通过

- [ ] TASK-011: 回归测试与 archive 兼容
  - 依赖：TASK-010
  - 文件：无新增（运行现有测试套件）
  - 改动：
    - 运行 `pnpm --dir packages/sovei-core test` 确认 192 个现有测试不破坏
    - 确认 `feature archive` 对含子变更的 Feature 正常归档（`sub-changes/` 目录整体折叠到 `_archive/sub-changes/`，`sub-change-map.md` 留顶层）
  - 验收：全部测试通过；archive 行为正确

## 验证方式

- `pnpm --dir packages/sovei-core run check`（tsc 类型检查）
- `pnpm --dir packages/sovei-core test`（全部测试通过，无回归）
- 手动集成：创建测试 Feature → split → 两个子变更并行推进 → 聚合门禁 → learn→sync
