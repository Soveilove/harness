# Zustand Store Procedure

## Use When

- 创建或重构 Zustand store。
- 设计状态结构、动作、selector hook 和异步流程。
- 在 React 组件中接入 Zustand store，并调整 selector 使用方式。

## Avoid When

- 任务只涉及组件结构、样式或渲染逻辑，且不修改 store。
- 任务在设计 Redux、Context、React Query 或其他非 Zustand 状态方案。
- 任务只涉及服务层封装，没有 store 集成需求。

## Procedures

### Step 1: Confirm Scope

1. 先确认任务是否真的落在 Zustand store 或组件与 store 的集成上。
2. 如果任务同时涉及 React 组件改造，同时读取 `references/react-component-standards.md` 和 `vercel-react-best-practices`。
3. 如果任务同时涉及 services 下的接口封装，同时读取 `references/api-service-standards.md`，避免错误设计异步服务约定。

### Step 2: Design Store Shape

1. 将 store 文件放在 modules/ 目录下，文件名使用 snake_case.ts。
2. 在 store 文件就近声明 State 和 Actions 两个 interface，并补齐标准 JSDoc。
3. 先定义 defaultState，再基于 State 和 Actions 组合出 store 类型。
4. 保持状态最小化，不直接存储派生值，在使用处计算派生结果。
5. 将可复用的 Action 提前抽成独立函数，只执行一次的简单 Action 允许直接内联在返回对象中。

### Step 3: Implement Store Updates

1. 使用 create<State & Actions>((set, get) => (...)) 或等价结构实现 store。
2. 涉及多字段写入时，先构造单个 newState 对象，再一次性调用 set，避免多次触发更新。
3. reset 一类动作直接回退到 defaultState，保证初始化行为单一且可预测。
4. 不为相同结构额外创建无业务语义的壳类型，直接复用已有 interface 或在使用点组合类型。

### Step 4: Handle Async Flows

1. 调用异步服务前先写入对应 loading 状态，调用完成后统一清理 loading 状态。
2. 常规服务调用流程不要使用 try...catch 包裹，直接通过 if 判断服务返回值是否成功。
3. 服务失败时只更新当前 store 真正需要的错误或兜底状态，不要写入冗余派生信息。
4. 如果服务返回结构不明确，先读取 `references/api-service-standards.md` 再继续实现。

### Step 5: Integrate With Components

1. 组件引入 store 时，命名使用 use 前缀，明确其 hook 语义。
2. 组件依赖状态较多时，直接在组件中使用 store。
3. 组件依赖状态较少时，在组件外声明 selector hook，并使用 useShallow 聚合选择结果。
4. selector hook 不要手写返回值类型，即便存在 lint 提示，也优先依赖 useShallow 的类型推断。
5. 组件只依赖单个状态时，直接在组件内使用内联 selector。

## Error Handling

- 如果异步动作依赖的服务返回结构不明确，先读取 `references/api-service-standards.md`，再确定 loading、兜底值和返回判断方式。
- 如果组件侧同时出现大范围渲染改造，补充读取 `references/react-component-standards.md` 和 `vercel-react-best-practices`，避免只修 store 而忽略组件层约束。
- 如果 selector 聚合过多字段导致组件职责失衡，缩小 selector 范围，或回退到组件内直接使用 store，而不是继续叠加复杂 selector hook。

## Reference Example

```typescript
import { create } from 'zustand';

/** 列表项 */
interface Item {
    /** 唯一标识 */
    id: string;
}

/** Store 状态 */
interface State {
    /** 列表数据 */
    list: Item[];
    /** 列表加载态 */
    loading: boolean;
}

/** Store 动作 */
interface Actions {
    /** 拉取列表 */
    loadList: () => Promise<void>;
    /** 重置状态 */
    reset: () => void;
}

const defaultState: State = {
    list: [],
    loading: false,
};

const useListStore = create<State & Actions>((set) => {
    const loadList = async () => {
        set({ loading: true });

        const response = await fetchList();
        const newState: State = {
            list: [],
            loading: false,
        };

        if (response) {
            newState.list = response.list;
        }

        set(newState);
    };

    return {
        ...defaultState,
        loadList,
        reset: () => set({ ...defaultState }),
    };
});

export default useListStore;
```

## Component Integration Example

```typescript
import { useShallow } from 'zustand/react/shallow';
import useListStore from '../modules/list_store';
import usePageStore from '../modules/page_store';
import useUserStore from '../modules/user_store';

const useListSection = () => useListStore(useShallow((state) => ({
    list: state.list,
    loading: state.loading,
})));

const ListPage = () => {
    const { list, loading } = useListSection();
    const error = usePageStore((state) => state.error);
    const { userInfo, permissions, initPage } = useUserStore();

    return null;
};
```

## Checklist

1. 是否确认任务属于 Zustand store 或组件与 store 集成，而不是其他状态方案。
2. store 文件是否位于 modules/ 目录下，且文件名符合 snake_case.ts 约定。
3. 是否声明 State、Actions、defaultState 和 create 四个核心结构。
4. interface 是否补齐标准 JSDoc，且没有新增无业务语义的壳类型。
5. 是否保持状态最小化，没有把派生值塞进 store。
6. 多字段更新时，是否合并成一次 set 调用。
7. 异步流程是否正确维护 loading 状态，并通过 if 判断服务返回值。
8. 组件侧是否按依赖范围选择直接取 store、selector hook 或内联 selector。
9. selector hook 是否放在组件外，且没有手写返回值类型。
