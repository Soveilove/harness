# 决策日志

> 由 Sovei 阶段生成：grill
> Feature：005-artifact-guard-hardening

## 待决议项清单

- [已决] `knowledge list` 过度阻断的修正方式：**A（完全移除守卫）**，用户确认
- [已决] 门禁审阅补全：走 review-pack 正规流程（generate + import）
- [已决] CLI 集成测试：用 FilesystemStorage + 临时目录，复用 `project.test.mjs` 的 execFile 先例

---

## 决议明细

### 1. review-pack 门禁审阅流程（事实核实）

- **类型**：事实核实
- **决策内容**：Sovei 门禁确认的正规流程是 `governance.ts` 的 `review-pack` 命令：
  1. `review-pack generate <feature>`：从 `reconciliation.md` 解析并渲染 `tech-review.md`（技术负责人审阅）+ `product-review.md`（PM 审阅）。
  2. 交付人审阅签字。
  3. `review-pack import <feature> --product <file> --by <name> --reference <ref>`：导入 PM 签字，触发 `confirmGate('product')`。
  4. tech 确认仍需 `workflow confirm --role tech`。
- **结论**：004 跳过了 generate/import，直接用 `workflow confirm --role product`，导致 `tech-review.md`/`product-review.md` 缺失、`reconciliation.md` 的 Sign-off 表格未填。005 需要为 004 补走这一环。

### 2. knowledge list 的守卫是过度阻断（事实核实）

- **类型**：事实核实
- **决策内容**：`knowledge list`（knowledge.ts）只读取 `knowledge/*.json`（KnowledgeStore），**不消费** `business-map.json`/`redlines-seed.json` 的版本或内容。004 给它加了 `--force`/`--refresh` 守卫并在旧产物时阻断，导致用户"只想看知识列表"也被无关的 onboarding 产物版本卡住，违背"轻量无侵入"初衷。
- **结论**：这是 004 的实现缺陷，005 需修正。

### 3. CLI 集成测试基础设施（事实核实）

- **类型**：事实核实
- **决策内容**：`project.test.mjs` 已有成熟先例：`execFileAsync(process.execPath, [cli, '--root', root, ...])` + `mkdtemp` 临时目录 + 真实文件系统。适合补命令级守卫测试（`map` 阻断/放行、`rescan` 写侧提示）。
- **结论**：005 复用该模式补集成测试，覆盖 004 只靠手动验证的命令级行为。

### 4. 守卫命令消费关系修正（可推断决策）

- **类型**：可推断决策
- **决策内容**：守卫应只加在**真实消费** onboarding 产物的命令上：
  - `map`：消费 businessMap → 保留守卫（合理）
  - `redline list`/`render`：消费 redlineSeed → 保留守卫（合理）
  - `status`：聚合状态，不依赖产物版本 → 属于健康检查，**不阻断**（改仅提示或不加守卫）
  - `knowledge list`：不消费 onboarding 产物 → **不应加守卫**
- **理由**：守卫的边界应严格对应"命令是否读取该产物"。过度阻断会破坏命令可用性。
- **被拒绝方案**：给所有读侧命令统一加守卫（004 的做法，导致 knowledge list/status 过度阻断）。

### 5. status 的守卫修正（可推断决策）

- **类型**：可推断决策
- **决策内容**：`status` 是健康检查命令，不应被旧产物阻断。005 将其从"硬阻断"降级为"仅提示"（或直接不加守卫）。
- **理由**：用户用 `status` 恰恰是为了查看项目是否健康、是否需要重扫；阻断会让它无法完成本职。
- **被拒绝方案**：维持 004 的硬阻断（违背 status 的定位）。

---

## 范围性决策（待用户确认）

### Q1. `knowledge list` 过度阻断的修正方式

- **类型**：范围性决策
- **决策内容**：**A（完全移除守卫）**，用户确认。
- **理由**：`knowledge list` 不消费 onboarding 产物，守卫是无关的侵入；移除最干净，符合"轻量无侵入"。
- **被拒绝方案**：B（仅提示不阻断）——会残留不相关提示噪音。
