# React Component Procedure

## Use When

- 新建 `React` 组件。
- 重构组件结构、子组件拆分、`props` 设计或样式组织。
- 评审组件内聚性、渲染结构、`props` 透传深度和 `store` 接入方式。

## Avoid When

- 任务只涉及 `services`、`utils`、`types` 等非 `React` 文件。
- 任务只修改 `Zustand` `store`，本身不改组件。
- 任务只做构建、脚本或工程配置调整。

## Procedures

### Step 1: Confirm Scope

1. 先确认任务核心是否是 `React` 组件，而不是单纯的 `store`、服务或构建改动。
2. 如果任务涉及 `Zustand` `store` 接入，同时读取 `references/zustand-store-standards.md`。
3. 如果任务涉及组件性能或重渲染问题，同时读取 `vercel-react-best-practices`。

### Step 2: Choose Structure

1. 使用函数式组件和 `Hooks`，禁止使用类组件。
2. 一个组件对应一个目录，目录下包含 `index.tsx` 和 `index.less`。
3. 跨页面复用组件放在 `components` 目录，页面组件放在 `views` 下对应页面目录。
4. 导出组件时使用 `memo` 包裹，禁止直接导出裸函数组件。

### Step 3: Design Props And Rendering

1. 组件 `Props` `interface` 命名为 `Props`，并补齐标准 `JSDoc`。
2. 组件参数列表中只允许有 `props`，且类型为 `Props`，禁止在参数列表直接解构 `props`，必须在函数体内解构。
3. 组件内只使用一次的方法直接内联，不单独声明只使用一次的函数。
4. 同一功能或相似渲染优先抽离为子组件，通过 `props` 表达差异，避免重复代码。
5. `Props` 透传不超过 2 层，避免过深透传导致父子组件耦合。

### Step 4: Use Design System And Styles

1. 优先使用 `@workec/ec-design` 或 `@workec/ec-mobile-design` 组件构建界面。
2. 使用组件前，先通过 `ec-design` MCP 服务获取组件文档和类型定义，禁止通过翻旧代码猜用法。
3. 如果不确定组件名称或选型，使用 `vscode_askQuestions` 工具确认，禁止臆测。
4. 样式使用 `Less` 和 `CSS Modules`，类名保持语义化。
5. 删除无业务意义的包裹节点，不为凑样式额外增加无意义 `DOM`。

### Step 5: Control Complexity And Performance

1. 避免过度拆分，不把一个完整功能单元拆成过多子组件。
2. 禁用 `useCallback`，慎用 `useMemo`，禁止为表面性能优化引入额外复杂度。
3. 如果需要性能优化，优先调整渲染边界、数据依赖和组件职责，再考虑 `memoization`。
4. 组件依赖 `Zustand` 时，按依赖范围选择直接使用 `store`、组件外 `selector hook` 或内联 `selector`。
5. `selector hook` 不要手写返回值类型，即便存在 `lint` 提示，也优先依赖 `useShallow` 的类型推断。

## Error Handling

- 如果组件改动同时牵涉 `store` 状态设计，补充读取 `references/zustand-store-standards.md`，避免组件和 `store` 各自为政。
- 如果不确定组件库 API 或组件名，使用 `vscode_askQuestions` 工具确认，不要从旧代码反推后直接照搬。
- 如果子组件拆分后 `props` 透传层级变深或父组件反而更复杂，回退拆分方案，优先保持内聚。

## Reference Example

```typescript
import { FC, memo } from 'react';
import styles from './index.less';

/** 组件属性 */
interface Props {
    /** 用户名 */
    name: string;
    /** 点击回调 */
    onClick?: () => void;
}

const UserCard: FC<Props> = (props:Props) => {
    const { name, onClick } = props;

    return <div className={styles.card} onClick={onClick}>{name}</div>;
};

export default memo(UserCard);
```

## Store Integration Example

```typescript
import { useShallow } from 'zustand/react/shallow';
import useMyStore from '../modules/my_store';
import useCommonStore from '../modules/common_store';
import useAnotherStore from '../modules/another_store';

// 部分状态使用 `selector hook` 获取，注意这个方法禁止设置返回值类型，即便 `eslint` 会报警告，因为 `useShallow` 已经处理了类型推断
const useMyComponent = () => useMyStore(useShallow((state) => ({
    list: state.list,
    loading: state.loading,
})));

const MyComponent = () => {
    const { list, loading } = useMyComponent();
    const error = useCommonStore((state) => state.error);
    const { userInfo, settings, config, init } = useAnotherStore();

    return null;
};
```

## Checklist

1. 是否确认任务属于 `React` 组件开发或重构，而不是其他技术域。
2. 组件目录结构是否正确，是否使用 `index.tsx` 和 `index.less`。
3. 是否使用函数式组件，并以 `memo` 包裹导出。
4. `Props` `interface` 是否命名为 `Props`，且补齐标准 `JSDoc`。
5. 是否优先使用组件库，并通过 `ec-design` MCP 文档确认用法。
6. 是否避免过度拆分、过深 `props` 透传和无意义包裹节点。
7. `useCallback` 和 `useMemo` 的使用是否克制且合理。
8. 如果接入 `Zustand`，是否按依赖范围选择了合适的 `selector` 方式。
