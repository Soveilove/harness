# Feature 015 — Convergence Report

## 变更审查

### 1. types.ts — WorkflowDefinition JSDoc
- 在 `WorkflowDefinition` 接口前添加了完整的 JSDoc 块
- 明确了 version 追踪范围：stageOrder / stages / maxStagesPerInvocation / allowChaining
- 明确了不追踪的内容：确认门逻辑、Skills/Wayfinder/Change Control、CLI 命令、prompt 内容
- 说明了与 schemaVersion 的区别：workflow.version 不持久化到 Feature 事件中

### 2. workflow-engine.ts — DEFAULT_WORKFLOW 注释
- 从 `/** Default workflow definition for Sovei 2.0 */` 更新为详细注释
- 说明了 version 2.0.0 的含义和历史（12 阶段结构自 TypeScript 重写以来未变）
- 注明了 2.3.2 的 spec 产物修复是 bugfix 而非 version bump

### 3. loader.ts — version mismatch warning
- 在 `loadConfig` 的 return 前添加 version 对比逻辑
- 使用 `process.stderr.write` 输出 warning（不 throw、不阻断）
- 格式包含项目声明的版本和引擎期望的版本，并给出修复建议

### 4. project.test.mjs — 测试
- `loadConfig warns on workflow.version mismatch`：用 version '9.9.9' 触发 warning，验证 stderr 输出
- `loadConfig does not warn when workflow.version matches`：用 version '2.0.0'，验证无 warning

### 5. project.rules.json — schema 修复（附带的阻塞修复）
- lifecycle: `"stable"` → `"active"`（符合 RuleLifecycleSchema）
- verification.type: `"check"` → `"review"`（符合 discriminatedUnion）
- provenance.kind: `"manual"` → `"declared"`（符合 enum）
- provenance.sources: `[]` → `["用户显式声明（2026-08-06）"]`（min 1 element）

## 红线检查

| 红线 | 状态 |
|---|---|
| NO_SILENT_DATA_LOSS | ✅ 不重写项目数据 |
| AUDIT_LOG_APPEND_ONLY | ✅ 不修改事件日志 |
| CONFIRMATION_GATE_INTEGRITY | ✅ 不修改门禁逻辑 |
| CHANGE_REQUEST_OPTIMISTIC_LOCK | ✅ 不修改变更控制 |
| PATH_TRAVERSAL_CONTAINMENT | ✅ 不修改存储层 |
| PERSISTED_SCHEMA_COMPAT | ✅ 不修改 schemaVersion |
| CLI_CONTRACT_STABILITY | ✅ 不修改 CLI 命令 |

## 测试结果

- 91 tests, 90 pass, 1 fail（预存的 release bundle 测试，与本次变更无关）
- 新增 2 个测试均通过
- tsc --noEmit 通过
