# 学习报告

> 由 Sovei 阶段生成：learn
> Feature: 019-contract-single-source

## 观察分类

| 观察 | 来源 Feature | 证据 | 适用范围 | 建议目标 |
|------|--------------|------|----------|----------|
| 阶段契约应由阶段注册表单独持有 | 019-contract-single-source | 删除 `WorkflowDefinition.stages` / `StageConfig`，归档逻辑改从 stage registry 读取 `producesArtifacts` | 工作流阶段定义、产物校验与归档 | architecture |
| 编排定义不应复制阶段细节 | 019-contract-single-source | `DEFAULT_WORKFLOW` 不再保存阶段配置，状态机只依赖共享阶段顺序 | 所有依赖工作流定义的状态转换逻辑 | rule |
| 契约单源化必须配套行为等价回归 | 019-contract-single-source | `sovei:check`、构建、109/109 测试、list-stages 与归档路径均通过 | 共享契约重构 | rule |

## 蒸馏判断

- **Would we rebuild it?**：会。阶段顺序、依赖产物和生成产物属于阶段本身的契约；如果编排模型再次复制这些信息，未来新增或修改阶段时仍会产生同步遗漏。
- **Why**：后续 Feature 会同时影响阶段执行、状态转换、产物归档和 CLI 展示。契约只有一个权威归属，才能让这些消费者在变更时保持一致。
- **Could it be different?**：是。无论阶段注册表采用何种实现，阶段契约都应由阶段定义拥有，工作流定义只描述编排关系。
- **Means vs Ends**：沉淀“阶段契约单一归属、消费者读取同一来源”，而不是记录具体类型删除或属性访问方式。
- **排除**：不记录版本号、具体函数调用或测试命令作为长期知识；这些是本次 Feature 的实现与验证细节。

## Lesson: DRY（单一知识表示）

**What happened in the code:**
本 Feature 移除了工作流定义中的重复阶段配置，使阶段注册表成为依赖产物和生成产物的唯一契约来源。状态机保留阶段顺序判断，归档逻辑则读取阶段注册表中的产物契约，职责边界更清晰。

**The principle at work:**
DRY 要求每一项会影响行为的知识只有一个表示。这里保留编排信息与阶段契约的职责分离，避免同一阶段信息在两个模型中独立演进。

**Why it matters:**
重复契约会让一次阶段变更变成多点同步任务，遗漏时可能出现执行、归档或 CLI 展示不一致。单源化把这类错误从“靠记忆同步”变成“所有消费者读取同一事实”。

**Takeaway for next time:**
新增会被多个工作流路径消费的阶段元数据时，先确定唯一所有者，再让其他模块通过该所有者读取，而不是在调用方复制一份配置。

---

### Also worth noting: Separation of Concerns

**In the code:** 状态机只负责判断阶段顺序，阶段注册表负责阶段契约，工作流引擎负责编排与归档。
**The principle:** 不同职责分开后，删除重复配置不会迫使纯状态转换逻辑依赖完整的注册表对象。
**Takeaway:** 重构共享模型时，按职责拆分依赖，并用行为回归确认每个消费者仍获得所需信息。

## 知识提取

```yaml:knowledge-delta
observations:
  - title: "阶段契约必须由阶段注册表单一持有"
    type: architecture
    content: "阶段的依赖产物、生成产物及其他阶段级契约必须由阶段定义的权威注册表单一持有；工作流编排模型只描述阶段顺序与依赖关系，不复制阶段契约。所有执行、归档和展示消费者应读取同一契约来源。"
    tags: [workflow, stage-contract, single-source-of-truth, architecture]
    category: candidate
    evidence: "019-contract-single-source：删除 WorkflowDefinition.stages 与 StageConfig；状态机保留阶段顺序判断，归档逻辑从阶段注册表读取产物契约；check、build、109/109 测试及 list-stages 回归通过。"
    relatedEntryId: null
  - title: "共享契约重构必须验证行为等价"
    type: rule
    content: "重构共享契约的表示方式时，必须同时验证编译约束、全量行为回归以及关键 CLI/归档路径的输出，确保删除重复表示没有改变外部工作流语义。"
    tags: [workflow, refactoring, contract, regression]
    category: candidate
    evidence: "019-contract-single-source：AC1–AC8 全部通过，TypeScript check、构建、109/109 测试、12 阶段 list-stages 输出和归档相关路径均验证通过。"
    relatedEntryId: null
```
