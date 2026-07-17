---
name: vue-pitfalls
description: Vue 开发中遇到的常见陷阱和解决方案
metadata: 
  node_type: memory
  type: feedback
  created: 2026-06-09
  originSessionId: 666b2e67-d2d9-466e-92c1-bcc0931c534e
---

## defineProps 外部类型导入问题

**问题**: Vue compiler-sfc 无法解析 `defineProps<T>()` 中的外部类型导入

**表现**: `Failed to resolve import source`

**解决**: 类型内联定义

```ts
// ❌ 错误
import type { SomeProps } from './types';
const props = defineProps<SomeProps>();

// ✅ 正确
const props = defineProps<{
  id: string;
  name: string;
}>();
```

**Why**: Vue SFC 编译器在解析泛型参数中的外部类型导入时会失败

**How to apply**: 所有组件 Props 类型直接内联，复杂类型在组件内部定义 interface

---

## 响应式数据解构丢失响应性

**问题**: 直接解构 `reactive` 对象会丢失响应性

**解决**: 使用 `toRefs()` 或 `toRef()` 保持响应性

```ts
// ❌ 错误
const { count, name } = reactive({ count: 0, name: 'test' });

// ✅ 正确
const state = reactive({ count: 0, name: 'test' });
const { count, name } = toRefs(state);
```

**Why**: 解构操作创建了新变量，切断了与原始响应式对象的链接

**How to apply**: 需要 reactive 对象的单独属性时，使用 `toRefs()`

---

## watchEffect 清理副作用

**问题**: watchEffect 中创建的定时器/监听器没有被清理

**解决**: 使用 onCleanup 回调

```ts
watchEffect((onCleanup) => {
  const timer = setInterval(() => {}, 1000);
  onCleanup(() => clearInterval(timer));
});
```

**Why**: watchEffect 每次依赖变化都会重新执行，必须清理上一次的副作用

**How to apply**: 所有 watchEffect 中的副作用（定时器、事件监听、WebSocket）都必须在 onCleanup 中清理

---

## v-if 与 v-for 同元素使用

**问题**: v-if 和 v-for 在同一元素上使用会导致性能问题

**解决**: 使用 template 包裹 v-for，或使用计算属性过滤

```vue
<!-- ❌ 错误 -->
<div v-for="item in list" v-if="item.active" :key="item.id">

<!-- ✅ 正确方式 1 -->
<template v-for="item in list" :key="item.id">
  <div v-if="item.active">{{ item.name }}</div>
</template>

<!-- ✅ 正确方式 2 -->
<div v-for="item in activeList" :key="item.id">
```

**Why**: v-if 优先级高于 v-for，每次都会重新计算

**How to apply**: 避免在同一元素上同时使用 v-if 和 v-for

---

**持续更新**: 遇到新的坑时追加到此文件

---

## -webkit-line-clamp 与 padding 冲突的「假省略」陷阱

**问题**: 多行省略场景下，元素同时设置 `display: -webkit-box; -webkit-line-clamp: N; height: Hpx` 和 `padding` 时，会出现第二行被裁 + 第三行溢出卡片的诡异现象。

**表现**:
- 标题想截断 2 行（24px × 2 = 48px），加 `padding: 12px 8px 8px` 后，第二行底部被裁。
- 改 `height: auto` 后 line-clamp 行为异常，第 3 行文字继续渲染并溢出卡片。
- 反复调整 `extra-height` 始终无效。

**根因**:
- `-webkit-line-clamp` 计算高度时，**padding 会被计入**。文字可渲染区域 = `height - padding-top - padding-bottom`。
- 例：48px - 20px(padding) = 28px ≈ 1 行多一点，第二行被裁。
- 而 `height: auto` 时，部分浏览器 line-clamp 不再严格生效，文字会突破 2 行限制继续渲染。

**解决**: 用 `margin`（不是 `padding`）撑开视觉间距，标题自身 `padding: 0`。

```vue
<!-- ❌ 错误：padding 撑间距 -->
<p :style="{
  padding: '12px 8px 8px',
  height: '48px',
  display: '-webkit-box',
  '-webkit-line-clamp': 2,
  '-webkit-box-orient': 'vertical',
  overflow: 'hidden',
}">标题</p>

<!-- ✅ 正确：margin 撑间距，padding 归零 -->
<p :style="{
  margin: '12px 8px 8px',
  padding: 0,
  width: 'calc(100% - 16px)',
  height: '48px',
  display: '-webkit-box',
  '-webkit-line-clamp': 2,
  '-webkit-box-orient': 'vertical',
  overflow: 'hidden',
}">标题</p>
```

**配套**: 父级 `HomeWaterfall` 的 `extra-height` 预留空间 = 文字行高 × 行数 + 标题 margin 上下值（如 48 + 20 = 68）。

**Why**:
- `margin` 占用的是父级 flex 容器的空间，不影响标题元素自身的 line-clamp 计算盒子。
- `padding: 0` + `height: 48px` 让 `-webkit-line-clamp: 2` 严格截断到 2 行 + 省略号。

**How to apply**:
- 所有需要多行省略的文本，**视觉间距走 margin，padding 必须为 0**。
- `height` 精确等于 `line-height × 目标行数`。
- 父级布局组件（如 `HomeWaterfall`）的 `extra-height` 同步算上 margin 上下值。

**对应项目代码**:
- `src/views/workbench/components/HomeTabs/AiAcademyTab.vue` 中 `:deep(.article_articleName)` 的实现。
- 公共组件 `src/views/aiAcademy/components/ArticleItem.vue` 中 `.article_articleName` 写死了 `height: 48px`（无 padding 友好），扩展到其他 Tab 复用同一模式时遵循「margin 撑间距，padding 为零」原则。

---

## IntersectionObserver 条件守卫导致登录后滚动加载失效

**问题**: 未登录进首页 → 登录后无法滚动加载更多内容

**根因**: `IntersectionObserver` 只在交叉状态**变化**时触发回调。如果 load-more 处理函数中有条件守卫（如 `!isLogin` 时 return），拦截了实际加载，但触发器元素仍处于 intersecting 状态。登录后条件放开，但 observer 不会重新触发（因为元素没有离开再进入视口），导致滚动加载永久失效。

**复现路径**:
1. 未登录进入首页，数据加载第 1 页
2. 滚动到底部，observer 触发 load-more，但被 `!isLogin` 守卫拦截
3. 触发器元素保持 intersecting，内容未增长
4. 用户登录，watch 回调调用 refetch() 只刷新现有页
5. observer 不重新触发 → 无法加载第 2 页及后续

**解决**: 登录后条件放开的时机，手动调用 `fetchNextPage()` 绕过 observer：

```ts
watch(
  () => userStore.isLogin,
  (isLogin) => {
    handleResetList();
    if (isLogin) {
      // 登录后主动加载下一页，绕过 observer 不重新触发的问题
      if (hasNextPage.value) {
        fetchNextPage();
      }
    }
  }
);
```

**Why**: IntersectionObserver 的设计是"状态变化触发"，不是"持续满足条件时持续触发"。一旦元素进入 intersecting 状态且回调已被调用，只要元素不离开视口，就不会再次触发。

**How to apply**: 任何在 IntersectionObserver 回调中使用条件守卫（如登录态、权限、开关）拦截加载的场景，必须在条件放开时主动触发一次加载，不能依赖 observer 自动重触发。

**Related**: [[vue-pitfalls]]

---

## 一键成稿 V2「全面增强」模型判断条件必须用正向匹配 A1

**问题**: 一键成稿 V2「全面增强」三合一功能（`goWorkFlowV2`）的模型判断条件写成 `!isFlux`（非 Flux 模型），导致 Pony、SDXL、Animagine 等其他非 Flux 基础模型也错误地走了 V2 新版逻辑（显示"全面增强"UI 并执行三合一参数同步），而这些模型应该走旧版三个独立开关逻辑。

**表现**:
- 选择 Pony/SDXL/Animagine 模型时，一键成稿面板错误地显示"全面增强"开关
- `faceDetail` 开关被错误地当作"全面增强"主开关，同步控制 `enablePerturb` 和 `hdFix`
- 算力计算、会员参数检测、图片详情展示等链路均受影响

**根因**:
- 需求是"仅 A1 模型启用 V2 逻辑"
- 但代码用 `!isFlux`（排除 Flux）作为判断条件，语义不等于"仅 A1"
- `!isFlux` 覆盖了 A1、Pony、SDXL、Animagine 等所有非 Flux 模型，扩大了生效范围

**解决**: 所有 V2 全面增强相关的模型判断必须用正向匹配 `ckptType === "A1"`，不能用反向排除 `!isFlux`。

**受影响的判断点（6 个文件，共 8 处）**:
- `src/views/workspace/components/ModulePanel/ExplorePanel.vue` — `isWorkFlowV2` 计算属性
- `src/assets/artwork/module/explore.ts` — `getExploreGenerateParam` 三合一参数同步
- `src/store/artwork/index.ts` — `resetModuleParams` 旧数据兼容逻辑
- `src/assets/artwork/vipPackageHandle.ts` — 会员参数检测/重置/功能列表（3 处）
- `src/views/workspace/hooks/index.ts` — `useFaceDetail` 计算属性
- `src/components/Image/ImageDetails/components/ImageInfo/modules/DefaultInfo.vue` — 图片详情展示

**Why**: 模型类型有多种（Flux/A1/Pony/SDXL/Animagine），"排除 Flux"≠"仅 A1"。反向排除会在新增基础模型时静默扩大 V2 生效范围；正向匹配 `=== "A1"` 才能精确限定。

**How to apply**:
- 任何与 V2 全面增强相关的模型判断，必须用 `ckptType === "A1"` 正向匹配
- 禁止用 `!isFlux` / `!isFluxModel` 作为 V2 判断条件
- 新增 V2 相关判断点时，在上述 6 个文件中同步检查是否需要添加 A1 条件

**对应项目代码**: 见上方"受影响的判断点"列表

**Related**: [[design-decisions]] ADR-005

---

## 复制画布后版本记录 clientId 不匹配导致详情弹窗字段错误

**问题**: 自由画布通过分享链接"复制画布"后，点击图片右上角"查看详情"按钮，弹窗中「创作场景」丢失、「内容来源」显示"再迭代"、图片类型/3D模型/视频URL 等字段缺失。

**根因**:
- 复制画布会把原画布的 fabric 对象数据（含 `clientId`、`resultId` 自定义属性）直接复制到新画布
- 新画布的 `versionListStore.records` 是新生成的记录，其 `clientId` 与画布上 fabric 对象的 `clientId` **不同**
- `resolveVersionRecord` 按 clientId 查找返回 `null`，走到兜底逻辑用画布图片对象构建 list，丢失了 module/source/type/glb 等字段
- 另外即使 record 匹配到，`versionList` 接口的 `param` JSON 可能不包含 `module`/`source`（这两个字段在 `VersionRecord` 顶层），而 ImageDetails 从 `imageState.param.module/source` 读取

**解决**:
1. `resolveVersionRecord` 增加图片 URL 兜底匹配：clientId 匹配不到时，用图片 URL（去掉查询参数）在所有版本记录的 images 中查找
2. `buildImageDetailsList` 不再要求 resultId 必须在 record.images 中，只要 record 匹配到就用 record 数据构建 list
3. `resolveDetailParam` 解析 `record.param` JSON 后，将 `VersionRecord` 顶层的 `module`/`source` 注入（仅当 param JSON 缺少时）

**Why**: 复制画布场景下，画布对象保留原画布标识（clientId/resultId），但版本列表是新记录。跨数据源关联时不能用单一标识匹配，必须有兜底关联键（图片 URL）。

**How to apply**: 任何从画布 fabric 对象关联到版本列表/创作记录的场景，都要考虑复制画布后 clientId 不一致的问题，优先用图片 URL 作为兜底关联键。

**对应项目代码**:
- `src/views/workspace/board/detail/components/ImageDetailEntryButton/ImageDetailEntryManager.vue` 的 `resolveVersionRecord` 和 `buildImageDetailsList`
- 对比 `src/views/workspace/board/detail/components/GalleryPanel/components/tabs/CreationTab.vue` 的 `buildMergedImageParam`（数据来源不同，合并策略不同）

**Related**: [[vue-pitfalls]]
