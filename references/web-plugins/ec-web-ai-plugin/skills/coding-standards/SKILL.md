---
name: coding-standards
description: "Enforces project-wide coding standards for TypeScript, React, Less, file naming, comments, and Git commits. Use when writing new code, reviewing changes, or checking compliance with project rules. Don't use for architecture decisions, skill routing, or business logic design."
---

# 编码规范

## 编码核心原则

- **语言规范**：必须使用 TypeScript，除非特定场景明确要求使用 JavaScript。
- **三思与沟通（Think Before Coding）**：绝不隐瞒困惑或替用户做假设。当实现路径存在权衡（Tradeoffs）、歧义，或依赖用户明确选择时，必须先使用 `askQuestions` 工具提问确认。呈现不同方案的利弊，禁止私自决定。
- **简单至上（Simplicity First）**：第一性原理，用最少的代码直接解决问题。拒绝任何臆测性开发：不添加需求之外的功能，不提供未经请求的"灵活性"，不为不可能发生的场景编写错误处理。如果 50 行能解决，绝不写 200 行。
- **外科手术式修改（Surgical Changes）**：每一行更改都必须能直接追溯到用户的需求。保持修改点与调用点一致（使用 `usages` 工具检查引用）。只清理自己造成的混乱（如删除因你的修改而废弃的变量/导入），绝不"顺手"重构未损坏的代码或修改相邻代码的格式，严格保持既有代码风格。
- **务实的抽象与架构（Pragmatic Architecture）**：坚持单一职责与高内聚，功能相关的代码放在一起。严格遵守"三次法则"（出现3次及以上才抽离），严禁为仅使用一次的代码进行抽象，避免过度拆分。
- **性能优化原则**：在保证代码直白易懂的前提下，处理性能瓶颈（如避免不必要的渲染），但必须基于实际需求，警惕无数据支撑的过早优化。
- **目标驱动验证（Goal-Driven Execution）**：将任务转化为可验证的目标。无论是修复 Bug、重构还是添加新功能，必须先明确成功标准，并独立闭环循环，直至验证通过。

## 领域规范 Reference

以下路径均相对于本 skill 目录。根据任务涉及的技术领域，读取对应的 reference；跨领域任务同时读取所有相关 reference。不要一次读取无关规范。

| 技术领域 | 按需读取 |
| --- | --- |
| Web 项目 API 服务封装 | `references/api-service-standards.md` |
| ec-crm CLI 命令与服务 | `references/cli-standards.md`；CLI 模板需要时再读取 `references/templates.md` 和 `references/flow-help-guide.md` |
| React 组件与视图 | `references/react-component-standards.md` |
| Rematch 状态管理 | `references/rematch-store-standards.md` |
| Zustand 状态管理 | `references/zustand-store-standards.md` |
| Web Worker | `references/webworker-standards.md` |

跨层任务按服务层 → 状态层 → 视图层顺序实施；若 reference 内部明确要求继续读取其他规范，也按本 skill 目录下的路径执行。

## 文件命名约定

| 类型 | 命名规则 | 后缀 |
|------|---------|------|
| 组件、页面 | PascalCase，组件文件为 `index.tsx`，样式文件为 `index.less` | `.tsx` / `.less` |
| 服务文件、工具函数、类型定义、状态管理 | snake_case | `.ts` |
| 文档 | 任意 | `.md` |

## 项目结构约定

```
src/
├── components/    # 跨页面通用组件，每个组件一个目录
├── modules/       # 状态管理文件（Store）
├── services/      # 与外部交互的服务文件（API服务、终端能力、web能力）
├── views/         # 页面组件，每个页面一个目录，包含页面组件和该页面独有的子组件
├── utils/         # 工具函数（无外部能力依赖，纯计算）
├── definitions/   # 全局跨模块复用类型
└── doc/           # 文档
```

## TypeScript 规范

- 使用严格模式，ES6+ 语法，禁止使用过时的语法和不安全的特性。
- 禁止使用 `for...of` 和 `for...in`，改用 `map`、`filter`、`reduce` 或 `for` 循环。
- 禁止对同一数组进行多次遍历链式调用，优先使用 `reduce` 一次完成。
- 使用 `undefined`，不使用 `null`。
- 禁止使用嵌套的三元表达式，改用 `if...else` 或 `switch`。
- 代码风格：分号结尾、尾逗号、单引号、4空格缩进，使用 `eslint --fix` 自动修复格式问题。
- 使用 `interface` 定义数据实体，使用 `type` 定义联合类型或组合类型，使用 `enum` 定义枚举值。
- 类型定义优先声明在就近位置。
- 派生类型优先使用内置的 `Partial<T>`、`Pick<T>`、交叉类型等组合，不使用新类型名。
- 结构相同类型只保留一个公共类型，其它位置直接引用该类型，不使用无业务语义的壳类型或别名类型。

## 样式规范

- 使用 Less 预处理器，遵循 BEM 命名规范，层级嵌套最大 3 层。
- 使用 CSS Modules 避免样式污染。
- 布局使用 FlexBox，只在必要时使用绝对定位。

## 注释规范

**使用 `/** */` 注释**：
- `interface`、`type`、`enum` 等类型定义及其属性
- 函数和方法的参数、返回值、功能说明
- 状态管理 store 的状态、action 属性
- 组件的 Props 接口及其属性

**使用 `//` 注释**：
- 复杂逻辑、关键步骤、边界条件、多判断分支
- 重要交互事件、复杂状态和副作用逻辑

注释内容应清晰、简洁，避免冗余和过度解释。

## Git 提交规范

遵循 Conventional Commits 规范，格式：`类型: 描述`（描述简洁清晰，不超过50字）。

| 类型 | 场景 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug修复 |
| `refactor` | 重构 |
| `docs` | 文档更新 |
| `style` | 代码格式调整 |
| `test` | 测试相关 |
| `chore` | 构建或工具相关 |

## 执行检查清单

完成每次代码改动后，逐条验证：

1. [ ] 代码遵循编码核心原则，使用 TypeScript 并遵循 TypeScript 规范。
2. [ ] 新增文件放置在正确目录，遵循项目结构约定和命名约定。
3. [ ] 样式遵循样式规范（Less、BEM、CSS Modules、FlexBox）。
4. [ ] 注释遵循注释规范（JSDoc `/** */` 和 `//` 的使用场景正确）。
5. [ ] 执行 `eslint --fix` 自动修复格式问题，确保代码风格一致。
6. [ ] 代码修改已同步处理定义、调用点、类型、事件结构等所有联动位置（使用 `usages` 工具检查引用）。
7. [ ] 无重复逻辑，已抽离3处及以上的重复代码。
8. [ ] 提交信息遵循 Git 提交规范，清晰描述改动内容。
