# 代码模板参考

## Service 三段式模板

参考实现：`src/services/customer_combine.ts`

### 第一段：Zod Schema 定义

```typescript
import { z } from 'zod';
import { getNetWork } from '../core/network.js';

// 请求参数 Schema
const fetchXxxReqSchema = z.object({
    /** 参数说明。 */
    param1: z.string(),
});

// 子结构 Schema（复杂响应时单独声明）
const subItemSchema = z.object({
    /** ID。 */
    id: z.number().nullish(),
    /** 名称。 */
    name: z.string().nullish(),
});

// 响应数据 Schema
const fetchXxxResSchema = z.object({
    /** 数据列表。 */
    items: z.array(subItemSchema).nullish(),
});
```

### 第二段：类型导出

```typescript
export type FetchXxxReq = z.infer<typeof fetchXxxReqSchema>;
export type SubItem = z.infer<typeof subItemSchema>;
export type FetchXxxRes = z.infer<typeof fetchXxxResSchema>;
```

### 第三段：API 函数

```typescript
export const fetchXxx = async (
    params: FetchXxxReq,
): Promise<FetchXxxRes | undefined> => {
    const http = getNetWork();
    const result = await http.request<FetchXxxRes>({
        url: `${CRM_API_HOST}/v1/xxx`,
        method: 'POST',
        data: params,
    });

    if (result === undefined) {
        throw new Error('请求失败，未获取到响应数据。');
    }

    return fetchXxxResSchema.parse(result);
};
```

---

## 叶子命令模板

参考实现：`src/commands/combine/area.ts`

```typescript
import { z } from 'zod';
import helpText from './name.help.md';
import { type JsonCommandDefinition } from '../../core/json_command';
import { fetchXxx } from '../../services/xxx';
import { configureCrmNetwork } from '../../services/network';

/**
 * xxx 命令输入参数。
 */
const myCommandSchema = z.object({
    /** 参数说明。 */
    param: z.string().trim().min(1, '参数不能为空。'),
    /** 页码，默认 1。 */
    page: z.coerce.number().int().min(1).default(1),
});

/**
 * xxx 命令输出结构。
 */
const myCommandOutput = z.object({
    /** 结果列表。 */
    items: z.array(itemSchema),
});

/**
 * xxx 命令定义。
 */
export const myCommand: JsonCommandDefinition<typeof myCommandSchema, typeof myCommandOutput> = {
    name: 'module.name',
    description: '命令功能描述。',
    example: 'ec-crm module name --param value',
    schema: myCommandSchema,
    output: myCommandOutput,
    helpText,
    configure: (command) => {
        command.option('--param <param>', '参数说明');
    },
    execute: async (input) => {
        configureCrmNetwork();
        const result = await fetchXxx({ param: input.param });
        return { items: result?.items ?? [] };
    },
};
```

## 模块 / 中间层命令模板

参考实现：`src/commands/customer/index.ts`

```typescript
import { type JsonCommandDefinition } from '../../core/json_command';
import helpText from './index.help.md';

/**
 * module 命令定义。
 */
export const moduleCommand: JsonCommandDefinition<undefined, never> = {
    name: 'module',
    description: '模块描述。',
    helpText,
};
```

## Flow 命令模板

参考实现：`src/commands/flow/customer-search/customer-search.ts`

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

> **注意**：Flow 命令没有 `schema`、`output`、`configure`、`execute` 字段，也不使用 `JsonCommandDefinition` 泛型。末尾的 `export default {};` 不能缺少。

## help.md 模板

参考文件：`src/commands/customer/tag.help.md`

````markdown
# [命令名，空格分隔]

[命令功能描述]

## 示例
```
ec-crm [完整命令] --option value
```

## 选项
| 选项 | 说明 | 必填 |
|------|------|------|
| `--name <name>` | 按名称模糊匹配 | 否 |
| `--usage <usage>` | 标签用途 | 是 |

## 入参
```ts
interface XxxParams {
    /** 参数说明。 */
    paramName: string;
}
```

## 出参
```ts
interface XxxResult {
    /** 字段说明。 */
    fieldName: type;
}
```
````

### Flow help.md 格式

Flow 命令的 help.md 面向 AI Agent 提供业务操作指引，不包含 CLI 选项：

````markdown
# [场景名称]

## 模式判断（可选）
1. 条件一 → 走分支 A。
2. 条件二 → 走分支 B。

## Workflow
1. 第一步描述，引用实际 CLI 命令：`ec-crm <命令> --<选项> <值>`
2. 第二步描述。

## 输出约束
- 约束条件 1。
- 约束条件 2。
````
