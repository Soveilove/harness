# Rematch Store Standards

## Use When

-   Creating or refactoring Rematch stores.
-   Designing model, state shape, actions, selector hooks, and async flows.
-   Connecting store data into React components.

## Purpose

根据需求设计和实现 Rematch store，编写状态、动作和异步逻辑，并在组件中接入 store selector 获取状态。

## Store Requirements

### Store 体系

-   modules/index.ts 用于总体 store 的初始化和类型定义，将所有的 model 引入并组合，同时给 redux 增加 tracked 能力。
-   model 文件放在 `modules/`，文件名使用 snake_case.ts 命名。

index.ts 示例：

```typescript
import { init, RematchDispatch, RematchRootState, Models } from '@rematch/core';
import rematchRouter, { RouterModel } from '@workec/ec-rematch-plugin-router';
import { createTrackedSelector } from 'react-tracked';
import { useSelector } from 'react-redux';
import example from './example';

export interface RootModel extends Models<RootModel> {
    example: typeof example;
    router: RouterModel;
}
export type RootDispatch = RematchDispatch<RootModel>;
export type RootState = RematchRootState<RootModel>;

const store = init({
    models: {
        example,
    } as RootModel,
});

export const useTrackedSelector = createTrackedSelector<RootState>(useSelector);
export default store;
```

### model 基本结构

-   `State` 接口定义状态结构。
-   `defaultState` 定义初始状态。
-   `reducers` 定义同步更新状态的方法。
-   `effects` 定义异步操作和副作用。
-   `createModel` 创建 Rematch model。

### 编写要求

-   reducer 保持纯函数，返回新 state。
-   不要把明显可派生的数据长期塞进 store，而是在使用处计算。
-   调用异步服务时，应在状态中设置对应的 loading 状态，确保组件能够正确反映加载状态。
-   涉及异步请求有 loading 的 effect，调用服务时通过 if 判断返回值是否成功，避免中途 return 或请求异常导致 loading 残留。

示例：

```typescript
import { createModel } from '@rematch/core';
import { RootDispatch, RootState, RootModel } from './index';

interface State {
    loading: boolean;
    list: string[];
}

const defaultState: State = {
    loading: false,
    list: [],
};

const reducers = {
    setLoading: (state: State, loading: boolean): State => ({
        ...state,
        loading,
    }),
    setList: (state: State, list: string[]): State => ({
        ...state,
        list,
    }),
};

const effects = (dispatch: RootDispatch) => ({
    fetchList: async (_: undefined, state: RootState): Promise<void> => {
        dispatch.example.setLoading(true);
        const res = await Promise.resolve(['a']);
        dispatch.example.setList(res || []);
        dispatch.example.setLoading(false);
    },
});

export default createModel<RootModel>()({
    state: defaultState,
    reducers,
    effects,
});
```

## 组件中使用 store

-   优先使用 `useDispatch<RootDispatch>()` 和 `useSelector((state: RootState) => ...)`。
-   新组件默认优先窄选择 `useSelector((state: RootState) => ...)`。
-   历史页面已经基于 tracked 组织，或者组件确实同时依赖多个 model 切片时，再用 useTrackedSelector，避免在叶子组件里把整棵 state 解出来。

### Integration Example

```typescript
import { useDispatch, useSelector } from 'react-redux';
import { RootDispatch, RootState } from '../../modules';

const MyComponent = () => {
    const dispatch = useDispatch<RootDispatch>();
    const access = useSelector((state: RootState) => state.example.access);

    // 组件逻辑和渲染
};
```

### useTrackedSelector Integration Example

```typescript
import { useTrackedSelector } from '../../modules';

const MyComponent = () => {
    const state = useTrackedSelector();
    const { access } = state.example;

    // 组件逻辑和渲染
};
```

## Checklist

1. model 文件名是否符合规范，放在正确目录。
2. model 结构是否包含 State 接口、defaultState、reducers、effects 和 createModel。
3. index 文件中的 store 是否正确引入 model，是否同步更新了 models、RootModel。
4. 是否保持状态最小化，状态内不包含派生值。
5. 避免局部 UI 状态误塞进全局 store。
