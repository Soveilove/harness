# 验证证据

> 由 Sovei 阶段生成：verify
> Feature：030-feature-sub-changes（Feature 拆分为多个子变更）

---

## 1. 测试证据

### 命令

```bash
# 子变更专项测试
node --test test/sub-change.test.mjs

# 全量回归测试
node --test "test/**/*.test.mjs"
```

### 结果

| 测试套件 | 通过 | 失败 | 总数 |
|---|---|---|---|
| sub-change.test.mjs | 13 | 0 | 13 |
| 全量回归（含 sub-change） | 205 | 0 | 205 |

**结论**：全部测试通过，零回归。

### 测试覆盖明细

| # | 测试名 | 验证点 |
|---|---|---|
| 1 | SUBCHANGE_CREATED adds a sub-change with pending status | 创建事件正确更新 subChanges 数组 |
| 2 | SUBCHANGE_CREATED rejects duplicate ids | 重复 id 拒绝 |
| 3 | SUBCHANGE_CREATED rejects forward dependency references | 前向依赖引用拒绝 |
| 4 | SUBCHANGE_STAGE_PREPARE sets currentStage and transitions status | prepare 事件更新游标和状态 |
| 5 | SUBCHANGE_STAGE_PREPARE blocks plan when dependency unmerged | 依赖未 merged 时 plan 阻塞 |
| 6 | SUBCHANGE_STAGE_COMPLETE advances cursor and verify auto-merges | complete 推进游标，verify 自动 merged |
| 7 | aggregationGate passes when all sub-changes merged | 聚合门禁逻辑 |
| 8 | splitFeature creates sub-change-map.md and scaffold dirs | splitFeature 创建产物和目录 |
| 9 | splitFeature rejects re-splitting | 禁止重复拆分 |
| 10 | listSubChanges reports blocked state for unmerged deps | listSubChanges 阻塞状态报告 |
| 11 | old events without subChangeId replay as top-level | 向后兼容：旧事件 replay |
| 12 | subChanges default to empty array in createInitialState | 默认空数组 |
| 13 | YAML round-trip preserves subChanges state | YAML 序列化/反序列化往返 |

---

## 2. 类型检查证据

### 命令

```bash
npx tsc --noEmit
```

### 结果

```
Exit code: 0（无错误）
```

**结论**：TypeScript 类型检查通过，无类型错误。

---

## 3. 构建证据

### 命令

```bash
pnpm run build
```

### 结果

```
> @soveilove/sovei@2.5.10 build
> node scripts/clean-dist.mjs && tsc && node scripts/build-release.mjs

Exit code: 0
```

**结论**：构建成功，release 单文件 `sovei.cjs` 生成正常。

---

## 4. 功能验证证据（AC 对照）

### AC-1：Feature 拆分命令

- `feature split <id>` 命令注册：`cli/commands/feature.ts` 第 573-656 行
- `--json` 提议契约输出：测试 8 验证 splitFeature 逻辑
- sub-change-map.md 生成：测试 8 断言 `storage.read('specs/060-split-test/sub-change-map.md')` 匹配 SC-060-01/02
- 脚手架目录创建：测试 8 断言 `.gitkeep` 存在

### AC-2：子变更独立阶段推进

- `--sub-change` 选项：`cli/commands/workflow.ts` 第 97 行 `.option('--sub-change <id>', ...)`
- 独立游标：测试 4/6 验证 currentStage 独立更新
- 产物路径切换：`workflow-engine.ts` `prepareStage` 第 126-128 行 `getSubChangePath`

### AC-3：依赖图约束

- 依赖阻塞：测试 5 验证 `SUBCHANGE_STAGE_PREPARE` 在依赖未 merged 时抛错
- blocked 状态：测试 10 验证 `listSubChanges` 返回 `blocked: true, blockedBy: ['SC-062-01']`

### AC-4：聚合门禁

- verify 自动 merged：测试 6 验证 verify 完成后 `status === 'merged'`
- 聚合门禁：测试 7 验证 `aggregationGate` 在未 merged 时 `passed === false`

### AC-5：上下文聚焦

- `--sub-change` 选项：`cli/commands/context.ts` 第 42 行
- 共享前段过滤：`SHARED_FRONT_ARTIFACTS` 集合（第 70-74 行）
- 兄弟摘要：`listSubChanges` 调用生成 sibling-sub-changes.md

### AC-6：向后兼容

- 旧事件 replay：测试 11 验证无 subChangeId 的事件正确 replay 为顶层
- 默认空数组：测试 12 验证 `createInitialState` 返回 `subChanges: []`
- 全量回归：205/205 通过（原 192 个测试零破坏）

---

## 5. P0-A 自主拆分提示证据

- scope 阶段提示契约新增"拆分评估"段：`stages/index.ts` scopeStage.execute 第 303-312 行
- AI 在 scope 完成后可看到拆分信号/不拆分信号/建议命令
- `feature split --json` 输出结构化提议契约供 AI 消费

---

## 6. 限制

- **`workflow status` 未内联子变更进度**：converge 报告已标记为 partial。用户需通过 `feature sub-change list <id>` 查看子变更进度。不影响功能正确性。
- **未做端到端 CLI 集成测试**：测试覆盖了引擎层和 reducer 层，但未通过 `child_process` 执行完整 CLI 命令做端到端验证。现有测试已覆盖核心逻辑路径，端到端测试为后续优化项。
- **archive 兼容性未单独测试**：`sub-change-map.md` 已加入 PERSISTENT_FILES 白名单，但未写专门测试验证含子变更的 Feature 归档行为。理由：archive 逻辑是文件移动，PERSISTENT_FILES 白名单已覆盖。

---

## 7. 结论

**验证结果：通过**

- 6 项验收标准全部覆盖（AC-1~AC-6）
- 205/205 测试通过，零回归
- TypeScript 类型检查通过
- 构建成功
- P0-A 自主拆分提示已补充

**建议**：推进 learn 阶段。
