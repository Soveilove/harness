# API Service Procedure

## Use When

- 在 services 目录下新增或重构接口封装。
- 设计请求参数、响应类型或 Mock 数据。
- 评审命名、目录位置和请求封装方式。

## Avoid When

- 任务只改组件，不涉及接口封装。
- 任务只改 Zustand store，不改服务层。
- 任务只是纯工具函数或本地计算逻辑。

## Procedures

### Step 1: Confirm Service Scope

1. 先确认任务属于 services 层接口封装，而不是组件、store 或 utils。
2. 如果任务同时涉及 store 如何消费接口结果，同时读取 `references/zustand-store-standards.md`。
3. 如果任务同时涉及页面组件如何触发请求，同时读取 `references/react-component-standards.md`。

### Step 2: Define File And Function Shape

1. 将服务文件放在 services 目录下，文件名使用 snake_case 命名。
2. 每个接口封装一个函数，函数名使用 fetch 前缀并明确表达业务语义。
3. 请求参数类型使用 Req 后缀，响应数据类型使用 Res 后缀，并就近声明在同文件中。
4. 参数数量小于等于 3 时使用平铺参数，超过 3 个参数时使用对象参数。

### Step 3: Implement Request Wrapper

1. 使用 @workec/ec-request 进行请求封装，不自行绕开统一网络层。
2. 常规业务接口直接返回库处理后的 data 结果，业务侧通过是否为 undefined 判断成功与否。
3. 只有在确实需要 code 或 message 时，才通过 beforeResponse 返回原始响应结构。
4. 不额外创建无业务语义的壳类型，直接复用已有实体类型或组合内置类型。

### Step 4: Design Mock Data

1. 一个接口函数对应一个 mockFetch 前缀的 Mock 函数。
2. 在真实请求函数中保留 Mock 调用注释，方便开发和测试时切换。
3. Mock 数据必须符合响应类型定义，必要时使用 Mock.js 生成随机数据。
4. 翻页接口的 Mock 结果必须正确反映请求页码和分页结构。

### Step 5: Validate Contract Usage

1. interface、type、enum 等新增类型补齐标准 JSDoc。
2. 确认返回结构足够让业务方直接消费，避免把接口歧义留给调用侧猜测。
3. 如果接口契约不明确，先补全注释和返回结构约束，再写调用方逻辑。

## Error Handling

- 如果后端返回结构和 @workec/ec-request 默认约定不一致，明确使用 beforeResponse 进行转换，不要把判断逻辑散落到业务侧。
- 如果 Mock.js 未安装但任务确实要求 Mock 数据，先安装依赖，再实现 Mock 函数。
- 如果参数过多导致函数签名混乱，收敛为对象参数，而不是继续扩展位置参数。

## Reference Example

```typescript
import { getNetWork } from '@workec/ec-request';
import Mock from 'mockjs';

/** 用户信息 */
export interface UserInfo {
    /** 用户ID */
    id: number;
    /** 用户名 */
    name: string;
}

/** 用户列表请求参数 */
export interface UserListReq {
    /** 页码 */
    page: number;
    /** 分页大小 */
    pageSize: number;
}

/** 用户列表响应 */
export interface UserListRes {
    /** 总数 */
    total: number;
    /** 列表 */
    list: UserInfo[];
}

const mockFetchUserList = (): UserListRes => ({
    total: Mock.Random.integer(50, 200),
    list: Mock.mock({
        'arr|10': [{
            id: () => Mock.Random.integer(1, 10000),
            name: () => Mock.Random.cname(),
        }],
    }).arr,
});

/** 后端返回通用结构 */
export interface ApiResponse {
    /** 状态码 */
    code: number;
    /** 提示信息 */
    message: string;
    /** 数据体 */
    data: unknown;
}

export const fetchUserList = (params: UserListReq): Promise<UserListRes | undefined> => {
    // return Promise.resolve(mockFetchUserList());
    const http = getNetWork();

    return http.request({
        url: '/api/user/list',
        method: 'post',
        params,
    });
};

export const fetchUserListWithResponse = (params: UserListReq): Promise<ApiResponse> => {
    const http = getNetWork();

    return http.request({
        url: '/api/user/list',
        method: 'post',
        params,
        beforeResponse: (response) => response.data,
    });
};
```

## Checklist

1. 是否确认任务属于 services 层接口封装。
2. 服务文件命名和目录位置是否正确。
3. fetch 函数、Req 类型、Res 类型、Mock 函数的命名是否符合规范。
4. 是否使用 @workec/ec-request 进行统一请求封装。
5. 是否仅在必要时暴露 code 和 message 原始结构。
6. Mock 数据结构是否与响应类型一致，并正确覆盖分页场景。
7. 新增类型是否补齐标准 JSDoc，且没有引入无业务语义的壳类型。
