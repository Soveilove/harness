---
name: vue2
description: Vue 2 开发规范与最佳实践。当用户开发或维护 Vue 2 项目、使用 Options API、Vuex/Pinia 状态管理、Vue Router 路由时唤起。
---

# Vue 2 开发技能

## 核心规范

### 组件设计
- 统一使用 Options API（data / methods / computed / watch）。
- 单文件组件（SFC）结构顺序固定：`<template>` → `<script>` → `<style scoped>`。
- 组件名使用 PascalCase，文件名与组件名一致。
- props 必须声明 type 与 default，禁止透传未声明的 attribute。
- 公共组件抽离到 `src/components/`，页面级组件放 `src/views/`。

### 状态管理
- 中大型项目优先 Pinia（兼容 Vue 2.7+），历史项目沿用 Vuex。
- Vuex 模块化拆分（namespaced: true），action 处理异步，mutation 同步变更。
- 避免在组件内直接修改 `$store.state`，必须通过 mutation/action。

### 路由
- 使用 Vue Router 3.x，路由懒加载：`() => import('@/views/xxx.vue')`。
- 路由 meta 承载标题、权限标识等元信息。
- 守卫统一在 `router.beforeEach` 处理鉴权与埋点。

### mixins / extends 约束
- mixins 仅用于横切逻辑（如埋点、权限），禁止承载业务状态。
- 同名选项冲突时 mixins 优先级低于组件，显式声明覆盖关系，避免隐式覆盖陷阱。
- 优先用工具函数或高阶组件替代复杂 mixins。

### 响应式注意事项
- 新增对象属性必须用 `Vue.set(obj, key, val)` 或 `this.$set`，避免响应式丢失。
- 数组下标直接赋值不触发更新，使用 `splice` 或 `$set`。
- `Object.assign` 整体替换需重新赋值整个响应式对象。
- 避免在 `data` 中放置大对象/深嵌套结构，必要时用 `Object.freeze` 优化。

### 版本与兼容
- 推荐使用 Vue 2.7（内置 Composition API 支持与 `<script setup>`，便于后续迁移 Vue 3）。
- 新项目不应再选 Vue 2；维护存量项目时遵循上述约束。
