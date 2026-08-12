# 决策地图

## 目标

实现 Feature 拆分为多个子变更的能力：AI 驱动拆分(scope 产物) + 依赖图并行 + 子变更独立 plan→verify + 父 Feature 聚合 learn→sync，向后兼容单管线

## 备注

grill 已决：方案B粒度/独立游标/依赖图并行/新建SubChange实体/scope产物拆分。零运行时依赖+Node14兼容。

## 已完成决策

- [SubChange状态存储设计](decision-tickets/D-001.json) - 嵌入父WorkflowState的subChanges数组字段,每个子变更有自己的currentStage/completedStages/completedTaskIds/status。不存独立文件——保持单状态文件workflow-state.yaml作为单一事实来源。理由:独立文件导致状态分散+replay复杂+
- [子变更事件类型设计](decision-tickets/D-002.json) - 新增4个事件类型:SUBCHANGE_CREATED(id,name,goal,dependsOn)/SUBCHANGE_STAGE_PREPARE/SUBCHANGE_STAGE_COMPLETE(推进currentStage)/SUBCHANGE_MERGED(完成verify后合并到父)。所有事件带subChan
- [父Feature门禁机制](decision-tickets/D-003.json) - 父Feature进入learn阶段前引擎检查所有子变更状态是否为merged。有未完成子变更时learn阶段prepare失败并报告未完成项。这是聚合门禁:learn-sync只在所有子变更merge后才能推进
- [scope sub-change-map schema](decision-tickets/D-004.json) - sub-change-map.md是scope阶段可选产物。schema: YAML frontmatter含sub-changes数组,每项id(SC-030-NN)/name(kebab-case)/goal(一句话)/dependsOn(依赖ID数组)/status(pending|planning|implem
- [context build子变更聚焦](decision-tickets/D-005.json) - context build接受--sub-change选项。有子变更时上下文包聚焦:父Feature的load-scope产物(共享)+当前子变更的plan-verify产物(专属)+其他子变更只含id/name/goal/status摘要(不污染)。无--sub-change时退化为当前行为

## 尚未明确

（无）

## 范围外

（无）
