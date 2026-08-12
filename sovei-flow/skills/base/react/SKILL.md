---
name: react
description: React 开发规范与最佳实践。当用户开发 React 项目、使用函数组件 + Hooks、Redux/Zustand 状态管理、性能优化、RTL 测试时唤起。
---

# React 开发技能

## 核心规范

### 函数组件 + Hooks
- 默认使用函数组件，禁止新代码使用 Class 组件。
- Hooks 规则：只在顶层调用、不在条件/循环中调用；自定义 Hook 以 `use` 开头。
- 副作用集中放 `useEffect`，依赖数组必须完整且诚实，禁用 ESLint exhaustive-deps 关闭。
- 派生状态用 `useMemo`，事件回调用 `useCallback`，避免无脑包裹造成反优化。

### 状态管理
- 局部 UI 状态用 `useState`/`useReducer`。
- 跨组件共享优先 Zustand（轻量、无 Provider）；大型应用选 Redux Toolkit。
- 服务端状态用 React Query / SWR，避免手写请求缓存逻辑。
- Context 仅用于低频变更的全局值（主题、鉴权、i18n），高频状态走外部 store。

### 性能优化
- `React.memo` 仅在 props 稳定且重渲染昂贵时使用。
- 列表 key 必须稳定唯一，禁止用数组 index 作为 key（除非列表纯展示且不变）。
- 大组件用 `lazy` + `Suspense` 代码分割。
- 避免在 render 中创建新对象/函数引用，移到 useMemo/useCallback 或模块作用域。

### TypeScript 集成
- 组件 props 用 `interface` 或 `type`，事件处理器复用 React 提供的类型（`React.ChangeEvent` 等）。
- hooks 返回值显式标注泛型，避免推断为 `any`。
- 第三方组件 props 用 `ComponentProps<typeof Comp>` 提取。

### 测试
- 使用 React Testing Library（RTL），按"用户视角"查询（getByRole / getByText）。
- 避免测试实现细节，断言行为而非内部状态。
- 异步用 `waitFor` / `findBy*`，mock 放在模块顶层 `vi.mock`。
- E2E 用 Playwright，单元 + 组件测试用 Vitest + RTL。
