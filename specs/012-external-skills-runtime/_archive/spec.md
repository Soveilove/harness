# 外部 Skills 运行时接入

## 背景

Sovei 当前已经实现 `load → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync` 工作流，但这些阶段由 Sovei 自己的 Stage 和 WorkflowEngine 执行。OpenSpec、Superpowers、Matt Pocock Skills 等外部项目目前只是方法论来源，CLI 没有加载、锁定或调用它们。

本 Feature 解决“参考过第三方 Skills，但运行时没有真正接入”的事实鸿沟，并为后续按阶段复用外部能力建立可审计的边界。

## 目标

1. 定义外部 Skill 的最小元数据和调用协议。
2. 通过 lock 文件固定来源、版本、commit、许可证和校验信息。
3. 增加只读 vendor/cache 加载器，不允许运行时隐式跟随上游 latest。
4. 为 `grill`、`spec`、`plan`、`implement`、`converge`、`verify`、`learn` 建立显式适配点。
5. CLI 在每次阶段执行结果中报告实际加载的 Sovei 能力和第三方 Skills。
6. 第三方 Skill 失败时回退到 Sovei 原生实现，不阻断已有工作流。

## 非目标

- 不复制或重写 OpenSpec、Superpowers 或其他仓库的全部能力。
- 不让第三方 Skill 直接修改 `specs/`、业务红线、事件事实源或知识库。
- 不自动安装未锁定版本，也不自动跟随上游分支。
- 不在本 Feature 中改变十二个阶段的业务语义和门禁顺序。

## 运行时行为

默认策略是 `native`：Sovei 原生 Stage 继续负责状态机、上下文、产物和门禁。只有当配置中存在已验证的 Skill 绑定时，适配器才向第三方 Skill 提供只读上下文，并将结果转换为 Sovei 可校验的候选产物。

```text
Sovei Stage
   ↓ 读取绑定与 lock
Skill Resolver
   ├─ 无绑定 / 未通过验证 → Sovei 原生实现
   └─ 已锁定且兼容 → 外部 Skill Adapter
                              ↓
                      候选结果 + 来源 + 证据
                              ↓
                    Artifact Validator / Gate
```

第三方 Skill 不拥有工作流状态，也不能直接宣布阶段完成。只有 Sovei 校验产物、证据和完成条件通过后，WorkflowEngine 才能追加阶段完成事件。

## 第一批候选映射

| Sovei 阶段 | 候选外部 Skill | 接入方式 | 默认状态 |
|---|---|---|---|
| `grill` | `grill-me` / `grilling` | 提供问题生成与澄清纪律，结果写入 `decision-log.md` | native |
| `wayfind` | `wayfinder` | 仅吸收决策地图思想；优先验证是否需要适配 | native |
| `spec` | `domain-modeling` / `to-spec` | 输出候选契约，不直接覆盖 Spec | native |
| `plan` | `domain-modeling` | 输出候选设计检查项 | native |
| `implement` | `implement`、Superpowers TDD/调试纪律 | 输出执行提示和验证要求 | native |
| `converge` / `verify` | `code-review`、Superpowers Review | 输出审查意见和证据要求 | native |
| `learn` | `handoff` | 输出候选交接和学习条目 | native |

第一批接入不代表全部启用。每个绑定必须经过兼容测试和历史 Feature 回放后，才能从 `candidate` 变为 `enabled`。

## 验收标准

- CLI 能显示当前配置实际启用的第三方 Skills；未配置时明确显示 `third-party: none`。
- lock 文件能阻止来源、版本或校验信息缺失的 Skill 被加载。
- 第三方 Skill 只能读取受控 Context Pack，不能直接写入项目事实源。
- 外部 Skill 超时、格式错误或版本不兼容时，Sovei 能记录失败原因并回退原生 Stage。
- 阶段完成事件仍然只能由 Sovei WorkflowEngine 产生。
- 至少完成 `grill` 和 `spec` 两个适配器的契约测试；其余阶段保留明确的扩展接口。
- 至少用现有 `specs/001` 至 `specs/011` 中的 Feature 做一次回放，比较 native 与 adapter 结果。
