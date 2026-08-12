# 收敛报告

> 由 Sovei 阶段生成：converge
> Feature：030-feature-sub-changes（Feature 拆分为多个子变更）

---

## 验收标准对照

### AC-1：Feature 拆分命令

| 检查项 | 状态 | 证据 |
|---|---|---|
| `feature split <feature>` 在 scope 后可用 | ✅ | `cli/commands/feature.ts` split 命令；`--json` 输出提议契约 |
| AI 分析 spec+scope 提议子变更划分 | ✅ | `--json` 输出 schema + 原则；scope 阶段提示契约含"拆分评估"段（P0-A） |
| 每个子变更含 id/name/goal/dependsOn | ✅ | `SubChangeState` 接口 + `splitFeature` 参数 |
| 检测循环依赖 | ✅ | `splitFeature` 校验 dependsOn 引用已知 sibling；reducer 拒绝前向引用 |
| 用户确认前可编辑 | ✅ | AI 填充 sub-change-map.md 草稿 → 用户确认 → 执行拆分 |
| 确认后生成 sub-change-map.md + 脚手架 | ✅ | `splitFeature` 写 sub-change-map.md + 创建 `sub-changes/<id>/.gitkeep` |

### AC-2：子变更独立阶段推进

| 检查项 | 状态 | 证据 |
|---|---|---|
| `workflow <stage> --sub-change <id>` | ✅ | `cli/commands/workflow.ts` 12 阶段统一加 `--sub-change` 选项 |
| 独立 currentStage 游标 | ✅ | `SubChangeState.currentStage`；reducer 按 subChangeId 路由 |
| 产物存放在 `sub-changes/<id>/` | ✅ | `getSubChangePath()` + `prepareStage`/`completeStage` 切换 artifactRoot |
| `workflow status` 显示子变更进度 | ⚠️ partial | `listSubChanges` 可查；`printState` 暂未内联子变更段（可通过 `feature sub-change list` 补充） |

### AC-3：依赖图约束

| 检查项 | 状态 | 证据 |
|---|---|---|
| 依赖未 merged 时 plan prepare 失败 | ✅ | `canExecuteStage` 子变更分支 + reducer `SUBCHANGE_STAGE_PREPARE` 校验 |
| 无依赖可并行推进 | ✅ | 各子变更独立游标，无全局锁 |
| `feature sub-change list` 显示 blocked 状态 | ✅ | `listSubChanges` 返回 `blocked`/`blockedBy` |

### AC-4：聚合门禁

| 检查项 | 状态 | 证据 |
|---|---|---|
| verify 完成后标记 merged | ✅ | reducer `SUBCHANGE_STAGE_COMPLETE` verify 分支自动 merged + 追加 `SUBCHANGE_MERGED` |
| learn 前检查全部 merged | ✅ | `prepareStage('learn')` 调用 `aggregationGate()` |
| 未 merged 时 learn prepare 失败 | ✅ | 抛错并列出未完成项 |
| 全部 merged 后推进 learn→sync | ✅ | 门禁通过后正常推进 |

### AC-5：上下文聚焦

| 检查项 | 状态 | 证据 |
|---|---|---|
| `context build --sub-change <id>` | ✅ | `cli/commands/context.ts` 新增 `--sub-change` 选项 |
| 父 Feature load→scope 产物 + 子变更 plan→verify | ✅ | `SHARED_FRONT_ARTIFACTS` 过滤 + 子变更目录加载 |
| 兄弟子变更摘要 | ✅ | 调用 `listSubChanges` 生成 sibling-sub-changes.md |
| 无 `--sub-change` 时退化为当前行为 | ✅ | `subChangeId` 为空时走原路径 |

### AC-6：向后兼容

| 检查项 | 状态 | 证据 |
|---|---|---|
| 现有 Feature 行为不变 | ✅ | 205/205 测试通过（含 192 个原测试零回归） |
| 无 sub-change-map.md 走单管线 | ✅ | `subChanges` 默认 `[]`，所有子变更分支不触发 |
| 旧事件 replay 正确 | ✅ | 测试 'old events without subChangeId replay as top-level' 验证 |

---

## 差距分类

### Missing（缺失）

无。所有 AC-1~AC-6 的核心检查项均已实现。

### Partial（部分）

- **AC-2 `workflow status` 内联子变更进度**：当前 `printState` 未在状态输出中内联子变更段。用户需通过 `feature sub-change list <id>` 查看子变更进度。这是体验优化项，不阻塞功能正确性。
  - 处置：记为后续优化（不重开 tasks），当前 `feature sub-change list` 已满足查询需求。

### Contradicts（矛盾）

无。

### Unrequested（未要求）

无。实现严格限定在 spec.md 的边界内，未引入额外功能。

---

## 架构健康检查

### 既有热点影响

- **state-machine.ts**：新增 4 个 reducer case + `aggregationGate` + `canExecuteStage` 重载。文件已较大，但新增代码遵循既有模式（switch case + immutability），未引入新的复杂度维度。
- **workflow-engine.ts**：新增 `splitFeature`/`listSubChanges` + `prepareStage`/`completeStage` 的 subChangeId 路由。方法签名向后兼容（新增可选参数）。

### 新依赖循环

无。新增代码仅依赖 `types.ts`（类型）和 `artifacts/repository.ts`（helper），未引入反向依赖。

### 候选模块职责膨胀

- `workflow-engine.ts` 新增子变更生命周期管理职责。这是合理的——引擎是工作流操作的单一入口，子变更属于工作流操作。若未来子变更逻辑继续膨胀，可考虑抽取 `SubChangeService`，但当前规模（~130 行）不值得过早抽象。

---

## 测试覆盖

| 维度 | 覆盖 | 测试数 |
|---|---|---|
| reducer（SUBCHANGE_CREATED/PREPARE/COMPLETE/MERGED） | ✅ | 6 |
| 依赖约束 | ✅ | 2 |
| 聚合门禁 | ✅ | 1 |
| splitFeature | ✅ | 2 |
| listSubChanges | ✅ | 1 |
| 向后兼容 | ✅ | 2 |
| YAML 往返 | ✅ | 1 |
| **合计** | | **13** |

---

## 结论

**收敛状态：通过（1 个 partial，不阻塞）**

- 6 项验收标准全部覆盖，核心功能完整
- 1 个 partial（`workflow status` 内联子变更进度）为体验优化项，不阻塞功能
- 205/205 测试通过，零回归
- 架构健康：无新依赖循环，职责膨胀在合理范围内

**建议**：推进 verify 阶段。partial 项记为后续优化。
