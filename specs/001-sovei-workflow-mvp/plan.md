# Plan

## 方案

采用“一个核心 Skill + 一个状态机 + 多个薄适配器”：

```text
Codex explicit skill / Claude command
              -> sovei-workflow core
              -> workflow.yaml
              -> specs/<feature>/workflow-state.yaml
              -> actual artifacts
              -> validation result and legal next stage
```

## 模块边界

- Skill 负责阶段行为、停止条件和输出契约。
- workflow.yaml 负责阶段图和必需 Artifact，不包含长提示词。
- validator 只读验证，不创建、不修复、不推进状态。
- 模板负责 Artifact 结构，不复制 Skill 说明。
- Adapter 只翻译调用形式，不拥有业务规则。

## 状态策略

- `workflow-state.yaml` 是当前 Feature 的机器状态源。
- 实际文件是事实源；两者冲突时 load 失败。
- 只有用户明确要求执行阶段时才允许产出该阶段 Artifact。
- Phase 1 校验器不自动写状态，避免工具静默推进。

## 迁移策略

- 保留 `knowledge-loader`，由 sovei load 调用而不是替代。
- 不把旧 SpecKit workflow 改造成 Sovei；两者并存，Sovei 负责外层门禁。
- 先在中枢自举 Feature 验证，再考虑分发到 ABC。

## 验证

- 使用 Skill Creator 的 `quick_validate.py`。
- 运行 validator 的正常与失败回放。
- 解析所有 YAML/JSON，检查引用和空白错误。
- 只执行 ABC `Status`，本 Feature 不执行 `Pull`。
