# Skills 基座

sovei 工作流的 skills 基座（base skills）是一组可复用的技能模板，每个技能封装特定技术栈/领域的开发规范、最佳实践与约束。AI 在执行任务时会根据上下文主动唤起匹配的技能，确保产出符合该技术栈的约定。

## 可用技能

| 技能 | 说明 | 适用场景 |
|------|------|----------|
| vue2 | Vue 2 开发规范 | 维护存量 Vue 2 项目、Options API、Vuex/Pinia |
| vue3 | Vue 3 开发规范 | Vue 3 新项目、Composition API、script setup、TS 集成 |
| react | React 开发规范 | 函数组件 + Hooks、Redux/Zustand、RTL 测试 |
| cli | CLI 工具开发规范 | Node.js 命令行工具、零依赖打包、跨平台处理 |
| python | Python 开发规范 | 类型注解、Pydantic、asyncio、pytest、pyproject.toml |
| quant | 量化系统知识 | 回测框架、数据管道、风控、订单管理、因子挖掘 |

## 如何启用

在 sovei-flow 根目录下执行：

```bash
# 启用单个技能
sovei skills use --local sovei-flow/skills/base/vue2

# 启用后通过 bind 绑定到工作流阶段
sovei skills bind --stage implement --skill vue2 --enable
```

启用后会写入 sovei 的本地 lock，AI 在执行对应阶段任务时自动加载该技能的规范。

## 如何自定义

直接编辑对应技能目录下的 `SKILL.md`：

```
sovei-flow/skills/base/<skill-name>/SKILL.md
```

每个 `SKILL.md` 由两部分组成：
- **frontmatter**：`name` 与 `description`，description 描述技能用途与触发时机，AI 据此判断是否唤起。
- **body**：技能正文，包含规范、最佳实践、约束等 markdown 内容。

修改后运行 `sovei skills sync` 将变更同步到 agent 上下文文件。

## 扩展新技能

复制任一现有技能目录结构，修改 `name`/`description`/body 即可创建新技能基座。命名用小写英文，与目录名一致。
