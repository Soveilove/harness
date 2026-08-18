# CLI Command & Service Standards

## Use When

- 在 `src/commands/` 下新增或修改 CLI 命令。
- 在 `src/services/` 下新增或修改 API 服务封装。
- 设计命令层级（点号命名映射 Commander 父子命令）。
- 定义命令输入/输出的 Zod Schema。
- 将命令与服务函数对接。
- **修改已有命令代码（schema / configure / execute / description）后，必须同步更新对应的 help.md 文档。**

> **重要：「添加接口」与「创建命令」是两件独立的事，必须严格按用户意图执行，不得捆绑：**
> - 用户说「添加接口 / 添加 API」→ **只做 service 层**（Schema → 类型 → fetch 函数），不创建 `commands/` 文件，不创建 help.md，不注册命令。
> - 用户说「创建命令」→ 才做命令层（`commands/*.ts` + `help.md` + 注册），此时 service 已存在则直接引用，不存在则先创建 service。

## Avoid When

- 任务只涉及前端 React 组件或 Zustand store。
- 任务只是修改 `core/` 框架代码（program、json_command、output、network），不涉及具体命令或服务。
- 任务只是修改 help.md 文档内容，不改代码逻辑。

## Architecture Overview

```
src/
├── index.ts              # 入口：创建程序、注册命令、运行
├── core/
│   ├── program.ts        # Commander 根程序创建/运行
│   ├── json_command.ts   # 命令注册引擎 + JsonCommandDefinition 接口
│   ├── output.ts         # 统一 JSON 输出（writeSuccess / writeFailure）
│   └── network.ts        # fetch 基 HTTP 客户端（单例 NetWork）
├── commands/
│   ├── root.ts           # 根命令默认输出
│   ├── combine/          # combine 模块
│   │   ├── index.ts      # 模块入口，汇总所有命令
│   │   ├── area.ts       # 叶子命令 combine.area（参考示例）
│   │   ├── area.help.md
│   │   └── ...
│   ├── customer/         # customer 模块
│   │   ├── index.ts      # 模块入口，汇总所有命令
│   │   ├── index.help.md
│   │   ├── tag.ts        # 叶子命令 customer.tag（参考示例）
│   │   ├── tag.help.md
│   │   └── search/       # 子模块
│   │       └── ...
│   └── flow/             # flow 模块（纯文档命令）
│       ├── index.ts      # 模块入口，汇总所有命令
│       ├── index.help.md
│       └── customer-search/   # flow.customer-search（纯帮助文本）
│           ├── customer-search.ts
│           └── customer-search.help.md
└── services/             # 服务调用层
    ├── network.ts        # CRM 认证 Cookie 配置
    └── customer_combine.ts  # API 封装示例（Zod schema + 类型 + fetch 函数）
```

核心设计特点：
1. **统一 JSON 输出** — 所有命令通过 `{ success, data/error }` 结构输出，成功写 stdout，失败写 stderr。
2. **声明式命令定义** — 每个命令是一个 `JsonCommandDefinition` 对象，注册引擎自动处理 Commander 父子命令层级。
3. **Zod 全链路类型推导** — Schema 定义即类型，无需手动维护 TypeScript 接口。
4. **点号命名约定** — `customer.search.run` 自动映射为 `ec-crm customer search run` 三级命令结构。
5. **MD 文件直接导入** — `helpText` 通过 `import helpText from './xxx.help.md'` 导入，由 `loaders/` 中的自定义 loader 处理。

## Procedures

### Step 1: 确定命令层级

读取已有的同类命令文件了解模式，参考：
- 叶子命令：`src/commands/combine/area.ts`、`src/commands/customer/tag.ts`
- 模块入口：`src/commands/customer/index.ts`

确定命令类型：

| 类型 | execute | schema | 说明 |
|------|---------|--------|------|
| 模块命令 | 无 | 无 | 纯容器，不可直接执行，仅输出子命令列表 |
| 中间层命令 | 无 | 无 | 有子模块时作为占位层 |
| 叶子命令 | 有 | 有 | 可执行命令，接收选项参数并返回数据 |
| Flow 命令 | 无 | 无 | 纯文档命令，只提供 help 文本，为 AI Agent 输出业务操作流程参考。仅含 `name`、`description`、`helpText` 三字段，无 schema/configure/execute/output |

命令名规则：使用点号 `.` 分隔层级，如 `customer.search.run`，点号自动映射为 CLI 子命令层级。

### 关于 Flow 命令

Flow 命令是 ec-crm CLI 中的一类特殊命令，它不执行业务逻辑，而是为 AI Agent 提供**各业务场景的操作流程参考文档**。每个 flow 命令对应一个具体业务场景（如筛选客户、创建客户），其 help.md 中包含完整的工作流步骤和输出约束。

Flow 命令特征：

| 属性 | 说明 |
|------|------|
| 用途 | 为 AI Agent 输出业务操作的 workflow 与输出约束 |
| 代码结构 | 仅含 `name`、`description`、`helpText` 三字段，无 `schema`/`output`/`configure`/`execute` |
| 目录命名 | kebab-case，如 `customer-search/` |
| 文件命名 | 与目录名一致，如 `customer-search.ts` |
| help.md 格式 | 面向工作流描述，典型章节：`## 模式判断`（可选）、`## Workflow`（核心）、`## 输出约束` |
| 注册方式 | 定义在 `flow/` 各子目录下，统一收录到 `flow/index.ts` 的 `flowCommandDefinitions` 数组 |

目录结构规范：
```
commands/flow/
├── index.ts                          # 模块入口
├── index.help.md                     # 模块帮助
├── customer-search/                  # kebab-case 目录名
│   ├── customer-search.ts            # 文件名与目录名一致
│   └── customer-search.help.md       # workflow 文档
└── call-center/
    ├── call-center-add.ts
    └── call-center-add.help.md
```

代码结构模板（详见 `references/templates.md`）：
```typescript
import helpText from './xxx.help.md';

/**
 * flow.xxx 命令定义 —— 场景描述。
 */
export const flowXxxCommand = {
    name: 'flow.xxx',
    description: '场景的 workflow 与输出约束',
    helpText,

};

export default {};
```

> **help.md 编写规范**：Flow 命令的 help.md 需遵循工作流描述格式（`## Workflow` + `## 输出约束`），具体规则见 `references/flow-help-guide.md`。编写 Flow help.md 时先读取该文件。

> **重要**：Flow 命令与模块/中间层命令外观相似（都无 schema/execute），但本质不同——Flow 命令是**叶子级的纯文档命令**（CLI 层级上无子命令），而模块/中间层命令是**容器级的非执行命令**（CLI 层级上包含子命令）。

### Step 2: 实现 Service（需要 API 调用时）

纯本地逻辑（如读取 npm 包数据）跳过此步，直接在 `execute` 中实现。

Service 文件放在 `src/services/` 下，文件名使用 `snake_case`，遵循三段式结构（Schema → 类型 → fetch 函数）。读取 `references/templates.md` 查看完整代码模板。

Schema 设计规则：
- 每个字段上方必须带 `/** 描述 */` 注释，不使用 `.describe()`。
- 可空字段使用 `.nullish()`（兼容 `null` 和 `undefined`）。
- 使用 `z.infer<typeof schema>` 导出类型，不手写 `interface`。
- `request<T>` 的泛型 `T` 直接指向业务 data 的类型（`proxy.ts` 内置 `handleResponse` 已统一处理 code 校验和 data 提取），不需要在 service 层包装 `{ code, msg, data: T }` 结构。

**`request` 函数 `params` 自动序列化（重要）**：`request` 内部已实现对 `params` 的自动 query string 序列化（`buildSearchParams`），会根据 HTTP 方法自动处理：
- **GET/HEAD 等方法**：`params` 对象自动转为 URL query string，`undefined` 值自动跳过。
- **POST/PUT 等 body 方法**：`params` 对象自动作为请求体发送。
- **禁止手动构建 `URLSearchParams`**：直接传普通对象即可，不需要 `new URLSearchParams()` 后再拼接。参见 `src/core/network.ts` 中 `buildSearchParams` 和请求构建逻辑。

```typescript
// ✅ GET 请求：直接传对象
const result = await request({ url, method: 'GET', params: { crmId: 123, pageNum: 1 } });
// ✅ POST 请求：用 data 传 JSON body
const result = await request({ url, method: 'POST', data: { crmId: 123 } });
// ❌ 禁止：手动拼接 URLSearchParams
const q = new URLSearchParams(); q.append('crmId', '123');
```

### Step 3: 定义命令 JsonCommandDefinition

核心接口定义参见 `src/core/json_command.ts`。读取 `references/templates.md` 查看叶子命令与模块命令的完整代码模板。

**`helpText` 字段说明（重要）**：help.md 文件通过 ES module 静态导入，不使用路径字符串：

```typescript
import helpText from './name.help.md';  // ✅ 正确
// helpPath: fileURLToPath(...)          // ❌ 错误，该字段不存在
```

叶子命令必填字段：

| 字段 | 说明 |
|------|------|
| `name` | 点号分隔的完整命令名 |
| `description` | 命令描述 |
| `schema` | Zod Object Schema，定义 CLI 选项 |
| `output` | Zod Schema，定义返回数据结构 |
| `helpText` | 通过 `import` 导入的 help.md 文本 |
| `configure` | 注册 Commander option；option 名必须与 schema 字段名一致 |
| `execute` | 命令执行函数，返回 `z.output<TResult>` 类型数据 |
| `example` | （推荐）完整 CLI 调用示例 |

模块/中间层命令只设置 `name`、`description`、`helpText`，不设置 `schema`、`output`、`execute`。

### Step 4: 创建或更新 help.md 文档

> **强制规则**：无论新增命令还是修改已有命令，凡涉及 `schema`（选项增减/含义变更）、`description`、`example`、`output` 的改动，必须同步更新对应的 help.md，保持文档与代码一致。

help.md 与命令文件放在同一目录，文件名与命令文件一致（如 `tag.ts` → `tag.help.md`）。读取 `references/templates.md` 查看完整 help.md 格式模板。

### Step 5: 注册命令到模块入口

1. **已有模块下的新命令**：在模块 `index.ts` 中导入命令定义，添加到 `xxxCommandDefinitions` 数组。
2. **新建一级模块**：参考 `src/commands/customer/index.ts` 创建模块入口，在 `src/index.ts` 中将 `xxxCommandDefinitions` 展开到 `baseCommandDefinitions`。
3. **一级叶子命令**（无模块包装）：直接在 `src/index.ts` 中导入并添加到 `baseCommandDefinitions`。

### Step 6: 验证与调试

1. 确认 `configure` 中的 option 名与 `schema` 字段名一致。
2. 确认命名层级无重复冲突：同一父级下不能有同名子命令。
3. 确认叶子命令设置了 `execute`，模块/中间层命令未设置 `execute`。
4. 使用 `npx tsx src/index.ts <command> --help` 验证 help 输出。
5. 使用 `npx tsx src/index.ts <command> --option value` 执行实际调用测试。

## Error Handling

- **Service 层错误**：`proxy.ts` 的 `request<T>` 内置 `handleResponse` 已统一处理 code 检查和 data 提取。Service 函数只需判断 `result === undefined`（网络错误或鉴权失败等异常），无需手动检查 `code !== 200`。
- **命令层错误**：`execute` 中无需 try-catch，框架统一捕获并转为 JSON 错误输出（参见 `src/core/json_command.ts`）。
- **Zod 校验失败**：框架自动捕获 `ZodError`，输出 `VALIDATION_ERROR` 错误码及各字段校验详情。
- **未认证**：需要 CRM API 的命令必须在 `execute` 首行调用 `configureCrmNetwork()`，否则触发 401 错误。
- **help.md 缺失**：`import helpText from './xxx.help.md'` 在构建/运行时若文件不存在会直接报错，确保 help.md 与命令文件同级且命名一致。

## Checklist

1. 命令层级命名合理，点号分隔与目录结构一致。
2. 叶子命令包含 `name`、`description`、`schema`、`output`、`helpText`、`configure`、`execute` 七个必填字段。
3. 模块/中间层命令只设置 `name`、`description`、`helpText`，未设置 `schema`、`output`、`execute`。
4. Service 文件遵循三段式（Schema → 类型 → fetch 函数），文件名是 snake_case。
5. Zod Schema 每个字段上方都带 `/** 描述 */` JSDoc 注释，不使用 `.describe()`。
6. `configure` 中的 option 名与 `schema` 字段名一致。
7. `helpText` 通过 `import helpText from './xxx.help.md'` 导入，未使用 `helpPath`/`fileURLToPath`。
8. **新增命令**：help.md 已创建，包含示例、选项表格、入参/出参说明，文件名与命令文件一致。
9. **修改已有命令**：凡改动 `schema`（选项增减/含义变更，含 enum 可选值调整）、`description`、`example`、`output`，已同步更新对应 help.md（选项表格、入参/出参、示例）。
10. **移动/重命名命令**：命令名称或所属模块变更后，所有涉及的 help.md 中的命令路径、用法示例、子命令列表必须同步修改，不遗漏。
11. 新命令已正确导入并注册到模块入口和/或主入口 `src/index.ts`。
12. 需要 CRM API 的命令在 `execute` 首行调用了 `configureCrmNetwork()`。
13. `npx tsx src/index.ts <command> --help` 和实际执行均通过测试。
14. Flow 命令确认只有 `name`、`description`、`helpText` 三字段，未设置 `schema`/`output`/`configure`/`execute`。
15. Flow 命令的目录和文件使用 kebab-case 命名且保持一致，末尾包含 `export default {};`。
16. Flow 命令已正确注册到 `flow/index.ts` 的 `flowCommandDefinitions` 数组中。
