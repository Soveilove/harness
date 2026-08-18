# Flow 命令 help.md 编写规范

面向 AI Agent 的工作流描述文档编写指南。

## 整体结构

`# 标题` → `## Workflow`（必选）→ `## 输出约束`（必选）。可选插入 `## 模式判断` 当存在多模式时。

**标题**：`# [场景名]`，用空格分词，不加 `flow.` 前缀。如 `# 查询电话联系记录`、`# 筛选/搜索客户`。

## 模式判断（可选）

当命令有简单/高级等多种模式时，放在 Workflow 之前，帮助 Agent 根据用户请求选择模式。如有多个模式则对应多个 `## Workflow（模式名）` 章节。

## Workflow 编写规则

1. 步骤从 `1.` 起编号，每步一句。步骤间无空行。
2. 条件分支用 `-` 缩进列表，放在主步骤下方。
3. 引用的 ec-crm 命令必须用完整形式：`ec-crm <module> <command> --option <value>`。可选参数用 `[--option <value>]` 括起来。
4. 调用命令后，用子列表逐项说明参数：`` `optionName`：说明，格式/类型，必填/选填/默认值 ``。互斥约束、多个值分隔方式也在此说明。
5. 互斥参数组在子列表中写作 `与 xxx 互斥`。
6. 特殊值约定（如 userId 为 -1 表示自己）写在对应参数说明或条件分支中。

示例：

```markdown
3. 调用 `ec-crm todo list --userType <userType> [--noticeTime <noticeTime>]` 查询待办列表：
   - `userType`：视角，`1` 执行人，`2` 创建人，默认 `1`。
   - `noticeTime`：提醒时间范围，格式 `YYYY-MM-DD～YYYY-MM-DD`，选填。
   - `isOverdue`：是否已逾期，与 `deadline` 互斥，选填。
```

## 输出约束编写规则

1. 用无序列表 `-`，每条一项输出要求。
2. 内容具体：告诉 Agent 展示**什么数据**、用**什么形式**（表格/列表/统计数）、**格式规则**。
3. 如有链接渲染要求，给出完整 URL 模板：`[crmId](https://html.workec.com/v2/crm_detail/home?crmId=crmId)`。
4. 如有行数限制，明确写出最大值（如 ≤10 行）及超限提示语。

示例：

```markdown
## 输出约束
- 展示当前生效的查询参数。
- 统计查询结果中所有记录的客户总数。
- 列表展示查询结果，行数 ≤10，超过时提示缩小查询范围。
- 客户 ID 渲染为 markdown 链接：`[crmId](https://html.workec.com/v2/crm_detail/home?crmId=crmId)`。
```

## 完整参考示例

- `src/commands/flow/call-record/call-record-list.help.md`
- `src/commands/flow/work-report/work-report-list.help.md`
