# 系统化调试流程（Systematic Debugging SOP）

> 遇到 bug 时按此流程排查，避免凭直觉跳跃式调试。
> 流程结束时必须产出踩坑记录或规则更新，形成闭环。

## 调试阶段

### 第 1 步：复现与定位

**目标**：稳定复现 bug，缩小范围到具体文件/函数。

- [ ] 确认复现路径：用户操作了什么 → 期望什么 → 实际什么
- [ ] 确认是否稳定复现（偶发需记录触发条件）
- [ ] 用 `search_content` 搜索报错信息 / 异常行为关键词
- [ ] 用 `read_lints` 检查相关文件的类型错误
- [ ] 用 code-explorer subagent 搜索相关模块的调用链

**产出**：一句话描述 bug —— 「[文件] 的 [函数] 在 [场景] 下 [错误行为]」

### 第 2 步：查阅已有知识

**目标**：检查 harness 中是否已有相关踩坑记录或规则，避免重复踩坑。

按优先级查阅：

1. **`harness/memory/vue-pitfalls.md`** — 搜索相关关键词，是否有同类坑
2. **`harness/spec-harness/implementation-rules.md`** — 是否有规则被违反
3. **`harness/spec-harness/failure-taxonomy.md`** — 初步归类到 F1-F8
4. **`harness/memory/design-decisions.md`** — 是否有 ADR 解释了当前行为
5. **`harness/codegraph/*.md`** — 相关模块的数据流链路和文件职责

**如果找到相关记录**：
- 确认记录是否仍然准确（代码可能已变更）
- 按记录中的「正确做法」修复
- 跳到第 4 步

**如果没找到**：继续第 3 步

### 第 3 步：根因分析

**目标**：找到 bug 的根本原因，而非表面症状。

#### 3a. 按 Failure Taxonomy 归类

| 类型 | 排查方向 | 常见工具 |
|------|----------|----------|
| F1 数据契约 | 检查 API 字段名/类型/枚举是否与后端一致 | `search_content` 搜字段名，对比接口文档 |
| F2 状态同步 | 检查多个 ref/store/watch 是否同步更新 | 搜变量名所有赋值点，画状态流转图 |
| F3 分支覆盖 | 检查新增分支/模型/模式是否在所有映射表中 | 搜枚举值，逐个映射表检查 |
| F4 生命周期 | 检查 onUnmounted/onCleanup/watch 停止 | 搜组件生命周期钩子 |
| F5 性能/资源 | 检查大图加载、重复请求、未清理监听 | 看网络面板 + Performance |
| F6 交互/行为 | 检查用户操作流程是否符合产品预期 | 对照 PRD / 设计稿 |
| F7 代码结构 | 检查是否违反注册表/边界/命名约定 | 对照 `implementation-rules.md` |
| F8 规则误用 | 检查是否用了过时判断/已废弃模式 | 对照 `vue-pitfalls.md` |

#### 3b. 最小复现验证

- 在修复前，先确认能通过最小改动复现根因（不是修复）
- 写下根因一句话：「因为 [X] 没有处理 [Y] 场景，导致 [Z]」

### 第 4 步：修复

**目标**：按根因修复，不引入新问题。

- [ ] 修复范围最小化 —— 只改必要的文件
- [ ] 检查同类型其他入口是否也有同样问题（F3 分支覆盖的高频伴随问题）
- [ ] 修复后确认 `read_lints` 无新增类型错误
- [ ] 如果修复涉及架构模式（注册表/状态管理），对照 `implementation-rules.md` 确认合规

### 第 5 步：知识沉淀（必须完成）

**目标**：把本次调试经验固化到 harness，防止重复踩坑。

根据 bug 类型和严重程度，选择沉淀方式：

#### 情况 A：典型 Vue 陷阱 / 框架特性坑

→ 追加到 `harness/memory/vue-pitfalls.md`

```markdown
### [坑点标题]
- **发现日期**: YYYY-MM-DD
- **状态**: active
- **症状**: [bug 表现]
- **根因**: [为什么会发生]
- **正确做法**: [应该怎么做]
- **相关文件**: [涉及哪些文件]
- **Failure 类型**: F[1-8]
```

#### 情况 B：违反了已有规则但规则不够明确

→ 更新 `harness/spec-harness/implementation-rules.md` 对应规则，补充具体要求

#### 情况 C：新发现的架构模式问题

→ 追加到 `harness/spec-harness/rejected-patterns.md`（被拒绝的模式）

#### 情况 D：重要架构决策

→ 追加到 `harness/memory/design-decisions.md` 新 ADR

#### 情况 E：临时性 bug，无通用价值

→ 只记录到当日 `.codebuddy/memory/YYYY-MM-DD.md` 工作日志，不上 harness

### 第 6 步：关联检查

- [ ] 如果新增/更新了 pitfall，检查 `implementation-rules.md` 是否需要同步新增规则
- [ ] 如果新增了规则，检查 `knowledge-loader/SKILL.md` 的关键词触发表是否需要补充
- [ ] 如果修改了架构决策，检查 `codegraph/*.md` 的相关链路描述是否需要更新

## 流程速查

```
复现定位 → 查 harness 知识 → 根因分析(归类 F1-F8) → 最小修复 → 知识沉淀 → 关联检查
                ↑                                                        |
                └──────────── 下次同类 bug 直接命中 ────────────────────┘
```

## 使用方式

- **手动触发**：遇到 bug 时按此流程走，不要跳过知识沉淀步骤
- **CodeBuddy 触发**：在 prompt 中说「按 systematic-debugging 流程排查这个 bug」
- **关键词**：`debug` / `bug` / `排查` / `为什么报错` / `不生效` / `报错了`
