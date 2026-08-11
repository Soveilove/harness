# 学习报告

> Feature: 020-quick-context-governance
> 阶段: learn

## 观察分类

### 观察 1：低风险局部修改走快速通道，高风险升级完整 Sovei（rule）
- **来源 Feature**：020
- **证据**：决策 D1；`sovei quick` 六步闭环（Capture→Check→Confirm→Implement→Verify→Report）实现，遇到共享契约、权限、数据、异步、红线或不确定范围时升级并停止。
- **适用范围**：任何涉及局部修改或快速验证的后续 Feature。
- **建议目标**：rule，candidate。

### 观察 2：Context Policy 先影子测量，不预切实际上下文（decision/architecture）
- **来源 Feature**：020
- **证据**：决策 D5；`buildContextPolicy` 提供 full/scoped/index+on-demand 影子变体，`actual` 保持 `full`，`compatibility` 为 `preserved`，标准 workflow 与 Quick 共用同一 policy。
- **适用范围**：涉及上下文治理、上下文体积裁剪的后续工作。
- **建议目标**：architecture，candidate。

### 观察 3：usage 只记录脱敏事实，缺失 token 记 unknown 而非零（rule）
- **来源 Feature**：020
- **证据**：决策 D6；`UsageToken` 允许 null，`unknownTokenUsage()`；usage 不含完整原话、源码、绝对路径、会话 ID；已有文件只追加不覆盖。
- **适用范围**：任何记录使用/观测事实的后续设计。
- **建议目标**：rule，candidate。

### 拒绝模式（不进知识库）
- 无。020 未出现需要记录为反例的设计。

## 蒸馏判断

- **Would we rebuild it?** 观察 1/2/3 在重写系统时都会作为约定保留 → 沉淀。
- **Why 测试** 后续 Feature 修改契约、做上下文治理、或设计观测记录时都会关心 → 沉淀。
- **Could it be different?** "快速通道边界 + 风险升级"、"影子测量不裁剪"、"未知记 unknown 不记零" 均换实现方式仍成立 → 沉淀。
- **Means vs Ends** 沉淀的是"边界/原则/语义"，而非具体 CLI 参数或 API → 符合。

## 知识提取

```yaml:knowledge-delta
observations:
  - title: "低风险局部修改走快速通道，高风险/不确定/越界升级完整 Sovei"
    type: rule
    content: "明确、低风险、局部单文件的修改默认走机器先审的快速闭环（capture→check→confirm→implement→verify→report）；当目标模糊、触及共享契约/数据/权限/异步/红线、或真实 diff 越界时，必须停止并升级完整 Sovei 流程，不得自动回退或静默扩大范围。"
    tags: [quick-channel, governance, risk-escalation]
    category: candidate
    evidence: "020 实现 `sovei quick` 六步闭环与升级/越界报告，CLI 只做基线/真实 diff/硬风险，语义与完整流程隔离，不写普通 workflow events。"
    relatedEntryId: null
  - title: "Context Policy 用影子变体先测量，实际上下文保持 full 不预切"
    type: architecture
    content: "上下文治理抽成共用 policy 层（Quick 与标准 workflow 同一 version/baseline/候选字段），以 full/scoped/index+on-demand 影子变体观测裁剪效果，实际发送上下文保持 full 直到受控实验证明可裁剪；全局绝对红线在任何影子变体中都保留。"
    tags: [context-governance, shadow-policy, redline]
    category: candidate
    evidence: "020 实现 `buildContextPolicy` shadow 三变体，actual=full、compatibility=preserved，standard workflow prepareStage 记录影子观测不改变 prompt。"
    relatedEntryId: null
  - title: "usage 只记录脱敏事实，缺失 token 记 unknown 而非 0"
    type: rule
    content: "使用观测记录应保持 append-only、只补缺不覆盖；token 缺失时记录 unknown/null 而不是当作零；记录不得含完整原话、源码、绝对路径或会话 ID，避免跨会话泄漏敏感信息。"
    tags: [usage, privacy, data-integrity]
    category: candidate
    evidence: "020 实现 UsageRecorder（writeIfAbsent + withLock + unknownTokenUsage），项目 init/--force/onboard/rescan 均不清空历史。"
    relatedEntryId: null
```

## 结论

无稳定晋级提案（首次 Feature 引入该主题）。引擎将按候选（candidate）自动对账到知识库。
