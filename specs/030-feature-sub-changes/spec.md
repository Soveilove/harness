# 功能规格

> 由 Sovei 阶段生成：spec
> Feature：030-feature-sub-changes（Feature 拆分为多个子变更）

---

## 验收标准

### AC-1：Feature 拆分命令

- `sovei feature split <feature>` 在 scope 阶段完成后可用
- AI 分析 spec.md + scope.md，按"功能内聚、可独立验证"原则提议子变更划分
- 每个子变更含：id（`SC-<feature>-<NN>`）、name（kebab-case）、goal（一句话）、dependsOn（依赖的子变更 id 数组）
- 检测循环依赖并自动合并环中子变更
- 用户可在确认前合并/拆分/重命名/调整依赖
- 确认后生成 `sub-change-map.md` 并创建子变更脚手架目录 `specs/<feature>/sub-changes/<id>/`

### AC-2：子变更独立阶段推进

- `sovei workflow <stage> <feature> --sub-change <id>` 在该子变更上下文中执行 plan→verify 阶段
- 每个子变更有独立的 currentStage 游标（一个可在 implement、另一个在 verify）
- 子变更的阶段产物存放在 `specs/<feature>/sub-changes/<id>/`（plan.md、tasks.md、change-manifest.md、evidence.md、convergence-report.md）
- `sovei workflow status <feature>` 显示父 Feature 阶段 + 各子变更阶段进度

### AC-3：依赖图约束

- 有前置依赖的子变更，在依赖未 merged 前无法进入 plan 阶段（prepare 时报错并指明阻塞项）
- 无依赖的子变更可并行推进
- `sovei feature sub-change list <feature>` 显示所有子变更的 id/name/status/dependsOn/被阻塞状态

### AC-4：聚合门禁

- 子变更完成 verify 后标记为 `merged`
- 父 Feature 进入 learn 阶段前，引擎检查所有子变更是否 merged
- 有未 merged 子变更时，learn 阶段 prepare 失并报告未完成项
- 所有子变更 merged 后，父 Feature 推进 learn→sync（聚合所有子变更的经验与同步）

### AC-5：上下文聚焦

- `sovei context build --stage <stage> --feature <feature> --sub-change <id>` 构建聚焦子变更的上下文包
- 上下文包含：父 Feature 的 load→scope 产物（共享）+ 当前子变更的 plan→verify 产物（专属）+ 其他子变更的 id/name/goal/status 摘要
- 无 `--sub-change` 时退化为当前行为

### AC-6：向后兼容

- 现有 Feature（001-029）和未 split 的新 Feature 行为完全不变
- 无 `sub-change-map.md` 的 Feature 走单管线路径（当前模型）
- `workflow-events.jsonl` 的旧格式事件可被正确 replay（subChangeId 字段缺失时视为顶层事件）

---

## 边界

### 做什么
- 子变更的创建、独立推进、依赖管理、聚合门禁
- AI 辅助拆分提议（scope 阶段产物）
- 子变更级上下文聚焦
- 向后兼容单管线

### 不做什么
- **不新增工作流阶段**（保持 12 阶段拓扑，拆分是 scope 的可选产物）
- **不做实时多 agent 调度**（子变更并行是"各自由不同 agent/会话推进"，sovei 不调度 agent，只管理状态与依赖）
- **不做子变更级 change-control**（子变更的重大变更重开仍走父 Feature 的 change-control；子变更本身不支持再拆子变更——一层嵌套）
- **不做子变更级 wayfinder**（wayfinder 在父 Feature 的 wayfind 阶段完成，子变更共享决策地图）

---

## 排除项

- 子变更的子变更（嵌套拆分）—— 第一版只支持一层
- 子变更间的代码合并冲突检测（由 git/preflight 处理，不在本 Feature 范围）
- 子变更级 skills 绑定（子变更继承父 Feature 的 skill-map，不支持独立绑定）
- 跨 Feature 的子变更依赖（子变更只依赖同一 Feature 内的其他子变更）
