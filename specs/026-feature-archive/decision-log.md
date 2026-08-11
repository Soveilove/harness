# 决策日志 — 026-feature-archive

## 事实核实

### F1：`storage.list()` 不递归
- **结论**：`FilesystemStorage.list()` 使用 `readdir` + `e.isFile()` 过滤，只返回目录下的文件，不返回子目录，不递归。
- **影响**：过程产物移到 `_archive/` 子目录后，`storage.list(featurePath)` 不会扫到它们。
- **来源**：`storage/filesystem.ts` L103-113，`storage/memory.ts` L43-49

### F2：`context build` 的 Feature 产物加载不递归
- **结论**：`ArtifactRepository.list()` 调用 `storage.list(featurePath)`，只列顶层文件。`context build` 用 `artifactNames.filter(n => n.endsWith('.md'))` 逐个读取。归档后的文件在 `_archive/` 子目录下，不会被 `context build` 加载为 required 项。
- **影响**：**归档后 `context build` 将不再把过程产物塞入 required 项**——这正是我们想要的效果（减少上下文膨胀）。
- **来源**：`cli/commands/context.ts` L64-73，`artifacts/repository.ts` L31-33

### F3：`cross-feature` 只读 `decision-log.md`
- **结论**：`context build --cross-feature` 只读取其他 Feature 的 `decision-log.md`（L82-113），不读其他产物。`decision-log.md` 保留在顶层，不受影响。
- **影响**：归档不影响 cross-feature 引用。

### F4：`redline-scanner.ts` 用 `storage.list()` 非递归
- **结论**：`redline-scanner.ts` L227-237 用 `storage.list('specs')` 列 Feature 目录，再用 `storage.list('specs/' + specDir)` 列文件，都是非递归。归档后的 `_archive/` 子目录不会被扫到。
- **影响**：归档不会导致红线规则被重复扫描。

### F5：`context expand` 直接读顶层文件
- **结论**：`context expand <feature> <artifact>` 用 `storage.read(specsDir/featureId/artifactName)` 直接读顶层文件。如果文件被归档，expand 会返回 404。
- **影响**：归档后 `context expand` 对过程产物将不可用。但 `context expand` 主要用于 cross-feature 场景（展开其他 Feature 的 decision-log），decision-log 不归档，所以影响可接受。

### F6：现有 `archiveInvalidatedArtifacts` 用 `history/` 目录
- **结论**：`workflow-engine.ts` L671-710 的归档路径为 `{featurePath}/history/revision-{N}/{reason}/`，在 reopen/change 时调用。这是按 revision 归档失效产物，语义不同于"Feature 完成后折叠过程产物"。
- **影响**：新归档功能用 `_archive/` 目录，避免与 `history/` 冲突。

## 可推断决策

### D1：命令归属——新建 `feature` 命令组
- **决策**：新建 `packages/sovei-core/src/cli/commands/feature.ts`，注册 `sovei feature archive <id>` 命令。
- **理由**：`workspace` 管理多工作区，`workflow` 管理工作流阶段，`feature` 管理 Feature 生命周期（archive/summary 等未来扩展）。语义不同，不混放。
- **被拒绝方案**：放在 `workflow` 下（`sovei workflow archive`）——archive 不是工作流阶段操作；放在 `workspace` 下——workspace 管理的是多工作区不是 Feature。
- **状态**：已决

### D2：归档目录名——`_archive/`
- **决策**：使用 `_archive/` 作为归档子目录名。
- **理由**：`history/` 已被 `archiveInvalidatedArtifacts` 使用（按 revision 归档失效产物），不能冲突。`_archive/` 前缀下划线表示"非产物目录"，与 `.md` 产物文件视觉区分。
- **被拒绝方案**：`history/`（冲突）、`archived/`（不如 `_` 前缀显眼）、`.archive/`（隐藏目录，部分工具不显示）。
- **状态**：已决

### D3：保留文件清单——持久文件留顶层
- **决策**：以下文件保留在 Feature 目录顶层，不归档：
  - `workflow-state.yaml` — 工作流状态
  - `workflow-events.jsonl` — 事件流
  - `decision-log.md` — 决策记录（cross-feature 引用依赖）
  - `wayfinder.json` / `wayfinder-events.jsonl` / `wayfinder.md` — 决策地图
  - `sync-report.md` — sync 产出（Feature 完成标志）
  - `load-summary.md` — 保留（load 增强后 grill 依赖）
  - `history/` — 已有归档目录不动
- **理由**：这些文件被 `context build`、`cross-feature`、`workflow` 引擎、`redline-scanner` 等模块直接读取，移走会破坏功能。
- **状态**：已决

### D4：归档文件清单——过程产物移入 `_archive/`
- **决策**：以下文件移入 `_archive/`：
  - `reconciliation.md`、`scope.md`、`plan.md`、`tasks.md`、`spec.md`
  - `change-manifest.md`、`evidence.md`、`convergence-report.md`、`coverage-matrix.md`
  - `learning-report.md`、`knowledge-delta.md`
  - `load.md`（如有）
- **理由**：这些是各阶段的中间产物，Feature 完成后不再被 `context build` 或 `cross-feature` 直接引用。归档后 `context build` 的 required 项更精简，解决上下文膨胀。
- **被拒绝方案**：全部保留——目录杂乱，上下文膨胀；删除——丢失历史记录。
- **状态**：已决

### D5：幂等性——已归档文件跳过
- **决策**：多次运行 `feature archive` 不报错。如果 `_archive/` 已存在文件，跳过已归档的，只归档新出现的。
- **理由**：用户可能 reopen 后再 complete，新增产物需要补归档。
- **状态**：已决

### D6：状态检查——只归档 completed Feature
- **决策**：执行归档前检查 `workflow-state.yaml` 的 `status` 字段，只有 `completed` 才允许归档。
- **理由**：归档进行中的 Feature 会破坏工作流（后续阶段需要读取前序阶段产物）。
- **被拒绝方案**：不检查——用户可能误操作归档进行中 Feature。
- **状态**：已决

### D7：实现模式——遵循 CODE_COMMENT_BEST_PRACTICE 规则
- **决策**：使用 `registerFeatureCommands(program: Command)` 模式，中文用户输出，统一错误处理，中文注释解释意图。
- **理由**：项目规则 `CODE_COMMENT_BEST_PRACTICE` 要求。
- **状态**：已决

## 范围性决策

### Q1：是否需要 `--restore` 选项（恢复归档）？
- **决策**：第一版不做。
- **理由**：YAGNI。归档是单向操作，如需恢复手动 `mv _archive/*.md .` 即可。先做核心归档功能，观察是否有真实恢复需求。
- **状态**：已决（用户确认 2026-08-11）

---

**未决项清单**：（无）
