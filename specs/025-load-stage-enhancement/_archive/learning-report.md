# 学习报告：025-load-stage-enhancement

> Feature：025-load-stage-enhancement
> 日期：2026-08-10

## 观察分类

### 1. 阶段产物契约变更的连锁影响

**类型**：仅项目适用
**观察**：当为一个阶段增加 `producesArtifacts` 时，所有通过 `prepareStage + completeStage` 走该阶段的现有测试都会受影响——`prepareStage` 会自动生成模板（含占位符标记），`completeStage` 会校验模板占位符并拒绝完成。需要手动在 prepare 和 complete 之间写入真实内容。
**证据**：本 Feature 为 loadStage 增加 `producesArtifacts: ['load-summary.md']` 后，7 处现有测试（workflow.test.mjs 2 处、skill-runtime.test.mjs 4 处、project.test.mjs 1 处）需要适配。
**适用范围**：所有修改阶段 `producesArtifacts` 的 Feature
**建议目标**：不沉淀——这是实现细节，不是领域知识

### 2. requiredArtifacts 变更的向后兼容

**类型**：仅项目适用
**观察**：当为阶段 B 的 `requiredArtifacts` 增加阶段 A 的产物时，已完成 sync 的 Feature 不受影响（不会重新走 B），但卡在 in_progress 的 Feature reopen B 时会要求新产物。需要给出明确错误提示而非自动生成。
**证据**：grill 的 `requiredArtifacts` 从 `[]` 改为 `['load-summary.md']`，影响卡在 in_progress 的 4 个 Feature（002/009/012/015）。
**适用范围**：所有修改阶段 `requiredArtifacts` 的 Feature
**建议目标**：不沉淀——已有 pitfall 知识覆盖类似场景

### 3. 设计文档与实现差距的 bug 级修复

**类型**：candidate
**观察**：设计文档承诺的能力（如 §6.1 要求 load 加载 Code Map + 规则）但实现未覆盖时，应视为 bug 级差距而非新功能。修复方式是直接补齐实现，不需要复杂设计。
**证据**：`TASK_TYPE_MAP['general']` 缺失 `code-map` 和 `rule`，设计文档 §6.1 明确要求。修复只改了一行代码。
**适用范围**：所有设计文档与实现存在差距的场景
**蒸馏判断**：Would we rebuild it? 是——设计文档承诺的能力在重写时仍应实现。Why? 后续 Feature 需要知道设计文档是权威需求来源。Could it be different? 是——无论实现方式如何，设计文档承诺应被满足。

### 4. load→grill 信息断层

**类型**：candidate
**观察**：load 阶段不产出文件时，后续阶段（grill）的 prompt 虽然写「## 输入：有效的 load 结果」，但实际无法引用任何 load 产出。增加 load 产出文件（load-summary.md）并在 grill 的 requiredArtifacts 中声明依赖，可以建立实质性的信息传递链。
**证据**：load 原本 `producesArtifacts: []`，grill `requiredArtifacts: []`。改为 load 产出 + grill 依赖后，grill 启动时能引用 load 的探索成果。
**适用范围**：阶段间信息传递设计
**蒸馏判断**：Would we rebuild it? 是——阶段间通过产物传递信息是 Sovei 的核心设计。Why? 后续 Feature 增加新阶段或修改阶段链时，应确保信息传递不断层。Could it be different? 是——无论具体产物是什么，阶段间通过 requiredArtifacts/producesArtifacts 建立依赖是通用模式。

## 知识提取

```yaml:knowledge-delta
observations:
  - title: "设计文档承诺的能力未实现应视为 bug 级差距"
    type: rule
    content: "设计文档（如 §6.1）明确要求的能力但代码未覆盖时，应视为 bug 级差距而非新功能。修复方式是直接补齐实现，不需要复杂设计。设计文档是权威需求来源，实现应与其对齐。"
    tags: [design-doc, implementation-gap, bugfix]
    category: candidate
    evidence: "Feature 025: TASK_TYPE_MAP['general'] 缺失 code-map 和 rule，设计文档 §6.1 明确要求加载 Code Map + 规则 + Baseline。修复只改了一行代码。"
    relatedEntryId: null
  - title: "阶段间通过 producesArtifacts/requiredArtifacts 建立信息传递依赖"
    type: architecture
    content: "当阶段 A 的产出需要被阶段 B 消费时，应在 A 的 producesArtifacts 和 B 的 requiredArtifacts 中同时声明。仅靠 prompt 中的「## 输入」文字描述不构成实质性依赖——completeStage 不会校验文字描述，只会校验 requiredArtifacts。"
    tags: [stage-contract, artifact-dependency, information-flow]
    category: candidate
    evidence: "Feature 025: load 原本不产出文件，grill prompt 写「## 输入：有效的 load 结果」但无法引用。增加 load-summary.md 产出 + grill requiredArtifacts 依赖后建立实质性传递链。"
    relatedEntryId: null
```
