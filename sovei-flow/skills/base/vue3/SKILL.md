---
name: vue3
description: Vue 3 开发规范与最佳实践。当用户开发 Vue 3 项目、使用 Composition API / script setup、Pinia、TypeScript 集成、Teleport/Suspense 时唤起。
---

# Vue 3 开发技能

## 核心规范

### Composition API
- 默认使用 `<script setup>` 语法，逻辑组织以"功能"而非"选项类型"划分。
- 复用逻辑封装为组合式函数（composables），命名以 `use` 开头，返回响应式 refs。
- 响应式优先级：基本类型用 `ref`，对象/集合用 `reactive`；解构 `reactive` 时用 `toRefs` 保持响应式。
- `watch` 显式声明依赖，避免监听整个大对象；`watchEffect` 用于自动追踪副作用。

### 状态管理
- 使用 Pinia（setup store 或 option store 均可）。
- store 按业务域拆分，避免单一巨型 store。
- 组件内只读 store 状态，变更通过 store 暴露的 action。

### TypeScript 集成
- `<script setup lang="ts">` 为默认。
- props 用 `defineProps<T>()` 泛型声明，emits 用 `defineEmits<T>()`。
- 公共类型集中放 `src/types/`，避免组件内散落重复定义。
- 模板 ref 用 `ref<InstanceType<typeof Comp>>()` 获取组件实例。

### 内置组件
- Teleport：弹窗/通知/下拉等需要脱离 DOM 层级的场景，必须指定 `to` 为已存在节点。
- Suspense：异步组件加载、数据预取时使用 fallback；不要用 Suspense 处理业务错误，错误走 `onErrorCaptured`。
- KeepAlive：缓存列表/详情切换状态，配合 `include`/`exclude` 精确控制。

### 生命周期与性能
- 组件销毁逻辑放 `onUnmounted` 清理（定时器、事件监听、WebSocket）。
- 大列表用 `v-memo` 或虚拟滚动（vue-virtual-scroller）。
- 避免在模板中写复杂表达式，移入 computed。
