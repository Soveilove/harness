# 蒸馏格式参考

## debug 记录格式

每条记录位于 `.debug-records/` 下,是一个 markdown 文件:

```markdown
### [bug 标题]
- **日期**: YYYY-MM-DD
- **F 类型**: F[1-8]
- **症状**: [bug 表现]
- **根因**: [因为 X 没有处理 Y,导致 Z]
- **修复**: [改了什么]
- **相关文件**: [涉及哪些文件]
```

## F 类型分类法

来自 `spec-harness/failure-taxonomy.md`:

| 类型 | 名称 | 聚类关键词 |
|---|---|---|
| F1 | 数据契约错误 | 字段名、类型、枚举、API |
| F2 | 状态同步错误 | ref、store、watch、同步 |
| F3 | 分支覆盖遗漏 | 映射表、枚举、新增、遗漏 |
| F4 | 生命周期错误 | onUnmounted、watch、清理、泄漏 |
| F5 | 性能/资源错误 | 大图、重复请求、懒加载 |
| F6 | 交互/行为错误 | 用户操作、产品预期、流程 |
| F7 | 代码结构错误 | 注册表、边界、命名、约定 |
| F8 | 规则误用/过时 | 废弃、过时、误用 |

## 聚类规则

1. 相同 F 类型 + 根因关键词重叠 >= 2 个 -> 同一簇
2. 不同 F 类型但相关文件重叠 -> 标注为关联簇
3. 簇大小 >= 2 -> 生成提议
4. 簇大小 = 1 -> 归档,不进候选

## 提议报告模板

```markdown
# 蒸馏提议报告 [日期]

## 概况

- 扫描源: [路径]
- 记录总数: [N]
- 候选簇数: [M]
- F 类型分布: F1:N, F2:N, ...

## 候选提议

### 候选 1: [模式标题]

| 字段 | 值 |
|---|---|
| Observation | [一句话描述] |
| Classification | F[1-8] |
| Evidence | [记录1日期+文件, 记录2日期+文件] |
| Scope | [影响范围] |
| Proposed Destination | [pending-rules / rejected-patterns / vue-pitfalls / design-decisions] |
| 命中次数 | [N] |

### 候选 2: ...

## 归档(单次出现,不进候选)

- [记录标题] (F类型, 日期)

## Manual Review Required
```

## 候选写入格式

### pending-rules.md (P-XXX)

```markdown
### P-XXX: 规则标题

- **发现来源**: 蒸馏自 .debug-records/ 或 specs/<feature>/
- **触发场景**: [场景]
- **假设规则**: [规则内容]
- **观察次数**: N / 1 / 2 / 3+
- **命中记录**: 日期 + 场景
- **误报记录**: 日期 + 场景(如有)
- **预期毕业方向**: stable / 合并到其他规则 / 淘汰
```

### rejected-patterns.md (RP-XXX)

```markdown
### RP-XXX: 失败标题

- **发生时间**: YYYY-MM-DD
- **相关 spec**: specs/<feature>/ 或 .debug-records/
- **相关能力**: [能力域]
- **问题描述**: [错误决策]
- **影响**: [bug 或返工]
- **修复方案**: [最终改法]
- **提炼规则**: 对应 implementation-rules.md#R-XXX 或 pending-rules.md#P-XXX
- **验证方式**: [如何避免]
```