# Evidence: 022-context-budget-subagent

> 验证证据

## 1. TypeScript 类型检查

**命令**: `npx tsc --noEmit`
**结果**: ✅ 通过（exitCode=0，无错误输出）
**证据**: `TSC_PASS`

## 2. 全部测试

**命令**: `node --test test/*.test.mjs`
**结果**: ✅ 156/156 通过，0 失败
**证据**:
```
ℹ tests 156
ℹ pass 156
ℹ fail 0
```

### 新增测试明细
- `context-budget.test.mjs`: 5 条（预算截断、优先级、untouchable、摘要格式、优先级顺序）
- `cross-feature-filter.test.mjs`: 8 条（标题提取、标签提取、路径提取、领域提取、Top-N、limit、空数组、排序）
- `context-subagent-contract.test.mjs`: 6 条（cross-feature-index 逻辑、expand 逻辑、expand 错误处理、budget 集成、向后兼容、scoped 选择）
- `context-policy.test.mjs`: 更新 1 条（actual 从 'full' 改为 'scoped'）

### 回归测试
- 原 137 条测试全部通过，无回归

## 3. 构建验证

**命令**: `pnpm run sovei:build`
**结果**: ✅ 通过
**证据**: `node scripts/clean-dist.mjs && tsc && node scripts/build-release.mjs` 全部成功

## 4. CLI 命令验证 — context expand

**命令**: `node packages/sovei-core/dist/release/sovei.cjs context expand 020-quick-context-governance decision-log.md`
**结果**: ✅ 成功输出 020 的 decision-log 内容，截断到 4000 字符
**证据**: 输出以 `# 决策日志：020-quick-context-governance` 开头，末尾有 `<!-- truncated at 4000 chars -->`

## 5. CLI 命令验证 — context cross-feature-index

**命令**: `node packages/sovei-core/dist/release/sovei.cjs context cross-feature-index 022-context-budget-subagent --paths src/context/policy.ts`
**结果**: ✅ 成功输出 JSON 数组，21 个 Feature 按相关性评分降序排列
**证据**:
- 最高分: `014-skills-runtime-completion` (score=12)
- 第二: `013-skills-agent-integration` (score=11)
- 每项含 featureId、decisionLogPath、title、relevanceScore、tags
- 输出大小远小于全量加载所有 decision-log

## 6. 向后兼容验证

**验证点**: 无 `--paths`、无 `--budget` 时行为不变
**证据**: `buildContextPolicy without budget preserves full context` 测试通过——`actual = 'full'`，`actualReason` 含 `backward compatible`

## 7. 预存 bug 修复验证

**验证点**: `FilesystemStorage.list()` 只返回文件不返回目录的 bug 已修复
**证据**: `cross-feature-index logic` 测试使用 `FilesystemStorage` + `listEntries()` 成功列出 Feature 目录并评分

## 限制

- 未在真实 IDE 环境（CodeBuddy/CC）中测试子 Agent 分派流程——CLI 契约（JSON 输出）已验证，子 Agent 编排是宿主 AI 层面的职责
- 预算阈值 32768 是默认值，未经过真实使用数据调优（P2-6）
- cross-feature 评分用简单重叠度，未引入 embedding（保持零运行时依赖）

## 结论

所有验收标准（AC1~AC6）通过验证。构建零错误，测试全绿，CLI 新命令功能正常，向后兼容性保持。
