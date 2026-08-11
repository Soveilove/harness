# 功能规格

> 由 Sovei 阶段生成：spec
> Feature：008-review-gate-alignment
> 标题：澄清门禁确认与 review-pack 的关系（文档-实现对齐）

## 需求翻译（做什么 / 不做什么）

### 做什么
1. 在 `AGENTS.md` 澄清确认门禁的真实行为：
   - verify 后（始终）与 spec 后（仅 S2/S3）需 product + tech 确认。
   - 确认依据是阶段产物（evidence.md / reconciliation.md），**不是** review 文件。
   - `workflow confirm` 与 `review-pack import` 都是有效的确认入口。
2. 在 `harness/index.md` 补充同样说明（如已有相关段落则对齐）。
3. 明确 review-pack 是**可选的深入对齐工具**，不强制。

### 不做什么
- 不改 `confirmGate` / `overrideConfirmation` 代码（决策 Q1=B）。
- 不强制 review 产物作为门禁前置（决策 Q2=A）。
- 不改阶段定义、产物契约、门禁触发逻辑。
- 不新增/删除命令。

## 用户可见行为（验收标准）

### 场景 1：文档准确描述门禁行为
- **Given** 阅读 AGENTS.md 的确认门禁段落
- **When** 查看 verify/spec 门禁说明
- **Then** 明确写出：verify 后始终需确认、spec 后仅 S2/S3 需确认、确认依据是阶段产物

### 场景 2：review-pack 定位清晰
- **Given** 阅读 AGENTS.md 或 index.md
- **When** 查看 review-pack 相关说明
- **Then** 明确它是可选的深入对齐工具，`workflow confirm` 是标准确认路径

### 场景 3：无功能回归
- **Given** 运行确认门禁流程（如 006/007 的 verify confirm）
- **When** 使用 `workflow confirm`
- **Then** 行为不变，仍能正常确认解除阻塞

## 边界与排除项
- 仅修改文档文件（AGENTS.md、harness/index.md）。
- 不改源码、命令、阶段定义、门禁逻辑。
- 不新增任何强制校验。
