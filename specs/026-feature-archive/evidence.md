# Evidence: 026-feature-archive

## 验证命令与结果

### 1. tsc 类型检查
```
cd packages/sovei-core && pnpm run check
→ tsc --noEmit → 通过（无输出）
```

### 2. 构建
```
pnpm run build
→ node scripts/clean-dist.mjs && tsc && node scripts/build-release.mjs → 通过
```

### 3. 全量测试
```
pnpm test
→ tests 186, pass 186, fail 0
→ 原 179 + 新增 7 = 186，零回归
```

### 4. 新增测试明细
```
node --test test/feature-archive.test.mjs
→ tests 7, pass 7, fail 0

✔ archiveFeature: 归档 completed Feature 的过程产物到 _archive/
✔ archiveFeature: 非 completed 状态拒绝归档
✔ archiveFeature: Feature 不存在时报错
✔ archiveFeature: 幂等——二次运行不报错，已归档文件跳过
✔ archiveFeature: _archive/ 已有同名文件时跳过不覆盖
✔ archiveFeature: 非 .md 文件不动
✔ archiveFeature: workflow-state.yaml 不存在时报错
```

### 5. CLI 手动验证

#### 5a. 命令注册
```
sovei feature --help
→ 输出：Feature 生命周期管理
  Commands: archive <id> — 将已完成 Feature 的过程产物归档到 _archive/ 子目录
```

#### 5b. 归档已完成 Feature（022-context-budget-subagent）
```
sovei feature archive 022-context-budget-subagent
→ ✓ 归档完成
  已归档（11 个文件）: change-manifest.md, convergence-report.md, coverage-matrix.md,
    evidence.md, knowledge-delta.md, learning-report.md, plan.md, reconciliation.md,
    scope.md, spec.md, tasks.md
  保留在顶层（7 个文件）: decision-log.md, sync-report.md, wayfinder-events.jsonl,
    wayfinder.json, wayfinder.md, workflow-events.jsonl, workflow-state.yaml
```

#### 5c. 幂等验证
```
sovei feature archive 022-context-budget-subagent（二次运行）
→ ✓ 归档完成
  保留在顶层（7 个文件）: 同上
  → archived=0, skipped=0（所有过程产物已在 _archive/）
```

#### 5d. 状态检查
```
sovei feature archive 026-feature-archive（当前 in_progress）
→ ✗ 只能归档已完成的 Feature（当前状态: in_progress）
```

#### 5e. 不存在的 Feature
```
sovei feature archive nonexistent-feature
→ ✗ Feature 目录不存在: specs/nonexistent-feature
```

## 证据位置

- 源码：`packages/sovei-core/src/cli/commands/feature.ts`
- 注册：`packages/sovei-core/src/cli/index.ts`（+2 行）
- 测试：`packages/sovei-core/test/feature-archive.test.mjs`（7 个场景）
- 归档产物实例：`specs/022-context-budget-subagent/_archive/`

## 限制

- 归档操作不可逆（需手动 `mv _archive/*.md .` 恢复）
- 未做 CLI 集成测试（只做了单元测试 + 手动 CLI 验证）

## 结论

所有验收标准已通过验证。tsc + 186/186 测试通过 + CLI 手动验证 5 个场景全部符合预期。
