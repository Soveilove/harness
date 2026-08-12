# Agents

> 12 个工作流阶段的 agent 指令模板。与 `skills/` 分开存放。

## 工作流阶段

```
load → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync
```

## 说明

- 阶段提示契约由引擎内置（`sovei workflow <stage> <feature>` 触发时注入）。
- 本目录用于存放项目自定义的 agent 指令补充材料（如团队约定、阶段增强提示）。
- 自定义内容不会被引擎自动加载，需在阶段产物中引用或通过 skill 绑定注入。
