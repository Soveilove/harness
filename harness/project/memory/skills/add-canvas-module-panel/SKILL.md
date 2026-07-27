---
name: "add-canvas-module-panel"
description: "自由画布新增模块面板的完整检查清单。当需要新增一个画布子面板（如局部修改、扩图、裂变、万能渲染、一键成稿等）或修改已有面板的重新编辑/再次生成/发布能力时调用。"
---

# 自由画布新增模块面板检查清单

## 何时使用

当出现以下任一情况时，必须按本清单逐项检查：

- 新增一个画布子面板（如 InpaintPanel、OutpaintPanel、RenderPanel、FissionPanel、DraftPanel 等）
- 为已有面板补充"重新编辑""再次生成""发布"等能力
- 排查"某模块的重新编辑回填到了输入框"类缺陷

## 核心原则

**每个画布模块面板必须在以下 5 个能力上与万能渲染（CanvasRender）保持对齐：**

1. **重新编辑** — 打开对应面板回填参数，**不回填到底部输入框**
2. **再次生成** — 构建面板特有参数直接走生成引擎，**不回填到底部输入框**
3. **发布作品** — 在创作记录列表/网格、详情弹窗、我的资产中显示发布按钮
4. **失败占位符重新编辑** — 从画布失败占位符点击重新编辑时打开对应面板
5. **发布作品后一键同款回填** — 作品发布后点击"一键同款"时打开对应面板回填参数，**不回填到底部输入框**

---

## 检查清单（按文件分组）

### 1. 事件总线 — `src/views/workspace/board/detail/components/ChatPanel/constants.ts`

添加 `XXX_PANEL_RE_EDIT` 事件常量到 `BUS_EVENTS`：

```ts
/** XXX：重新编辑回填参数到XXX面板 */
XXX_PANEL_RE_EDIT: 'xxxPanel:reEdit',
```

**缺失后果**：没有独立事件，重新编辑会走 default 分支回填输入框。

---

### 2. 工具栏 Store — `src/views/workspace/board/detail/helper/store/toolbar.ts`

添加三组状态 + 三个方法：

```ts
// State
const isXxxPanelVisible = ref(false);
const xxxTargetCid = ref('');
const pendingXxxReEditParams = ref<XxxReEditParams | null>(null);

// Actions
function openXxxPanel(cid: string, reEditParams?: XxxReEditParams | null) {
  isXxxPanelVisible.value = true;
  xxxTargetCid.value = cid;
  pendingXxxReEditParams.value = reEditParams || null;
}
function closeXxxPanel() { /* 清空三组状态 */ }
function toggleXxxPanel(cid: string) { /* 互斥逻辑 */ }
```

**还需检查**：

- 在 return 中导出所有新增 state 和 actions
- 在 Watchers 区域添加**面板互斥逻辑**（新面板打开时关闭其他面板，其他面板打开时关闭新面板）
- `xxxTargetCid` 用于面板定位目标图层

**缺失后果**：面板无法打开，无法传递重新编辑参数。

---

### 3. 重新编辑处理器 — `src/views/workspace/board/detail/components/GalleryPanel/index.vue`

添加 `handleXxxPanelReEdit` 处理器，并注册/注销事件监听：

```ts
const handleXxxPanelReEdit = (payload: any) => {
  const { _xxxTargetCid, clientId, ...editParams } = payload;
  const sourceLayer = _xxxTargetCid ? getLayer(_xxxTargetCid) : undefined;
  if (!sourceLayer) {
    showCanvasToast({ message: "重新编辑失败，原图已从画布移除", duration: 3000, closable: true });
    return;
  }
  const layerId = (sourceLayer as any)?.id;
  if (layerId) {
    centerObjectInViewport(sourceLayer as any);
    highlightLayer(layerId);
    performBatchCanvasOperation((canvas) => { canvas.setActiveObject(sourceLayer as fabric.Object); });
    nextTick(() => { boardToolbarStore.openXxxPanel(layerId, { _xxxTargetCid, ...editParams }); });
  }
};

// onMounted / onUnmounted 中注册和注销
$bus.on(BUS_EVENTS.XXX_PANEL_RE_EDIT, handleXxxPanelReEdit);
$bus.off(BUS_EVENTS.XXX_PANEL_RE_EDIT, handleXxxPanelReEdit);
```

**缺失后果**：重新编辑事件发出后无人接收，面板不会打开。

---

### 4. 列表视图重新编辑 — `CreationListItem.vue` 的 `handleReEdit`

在 `handleReEdit` 函数中，于 default 分支之前添加独立分支：

```ts
// 画布XXX记录走独立的回填路径（不回填到输入框）
if (mergedMessageParam.value._xxxTargetCid) {
  const param = mergedMessageParam.value;
  $bus.emit(BUS_EVENTS.XXX_PANEL_RE_EDIT, { clientId: props.message.clientId, ...param });
  return;
}
```

**关键**：检测条件使用 `mergedMessageParam.value._xxxTargetCid`，这是面板在提交生成时写入创作记录的私有字段。

**缺失后果**：列表视图"重新编辑"走 default 分支，回填到输入框。

---

### 5. 网格视图重新编辑 — `CreationGalleryView.vue` 的 `handleReEdit`

同上，在 `handleReEdit` 中添加独立分支：

```ts
if (renderParam._xxxTargetCid) {
  $bus.emit(BUS_EVENTS.XXX_PANEL_RE_EDIT, { clientId: message.clientId, ...renderParam });
  moreMenuVisible.value = false;
  openMoreItemId.value = null;
  return;
}
```

**缺失后果**：网格视图"重新编辑"走 default 分支，回填到输入框。

---

### 6. 详情弹窗重新编辑 — `ImageDetails/index.vue` 的 `fillChatInput`

添加 `isXxxRecord` 计算属性 + `fillChatInput` 分支：

```ts
const isXxxRecord = computed(() => {
  const p = mergedRecordParam.value;
  if (!p) return false;
  return !!p._xxxTargetCid; // 或 p.module === ModuleId.XxxModule
});

// fillChatInput 中，在其他面板分支之后、default 之前
if (isXxxRecord.value) {
  const p = mergedRecordParam.value;
  $bus.emit(BUS_EVENTS.XXX_PANEL_RE_EDIT, { clientId: props.version?.clientId, ...p });
  open.value = false;
  return;
}
```

**缺失后果**：详情弹窗"重新编辑"走 default 分支，回填到输入框。

---

### 7. 失败占位符重新编辑 — `SmartCanvas/CanvasOverlay.vue`

在 `handleReEdit` 中添加分支（直接调用 `toolbarStore.openXxxPanel`，不走 bus 事件）：

```ts
if ((params as any)._xxxTargetCid) {
  const param = params as any;
  const targetCid = String(param._xxxTargetCid || '');
  const sourceLayer = targetCid ? getLayer(targetCid) : undefined;
  if (sourceLayer) {
    centerObjectInViewport(sourceLayer);
    highlightLayer((sourceLayer as any).id);
    scheduleHighlightCleanup((sourceLayer as any).id);
    performBatchCanvasOperation((c) => { c.setActiveObject(sourceLayer as any); });
    nextTick(() => { toolbarStore.openXxxPanel((sourceLayer as any).id, { ...param }); });
  } else {
    antdMessage.warning('原图已变更，无法重新编辑');
  }
  return;
}
```

**关键**：失败占位符直接操作画布对象，不需要走 bus 事件中转。

**缺失后果**：失败占位符"重新编辑"走 default 分支，回填到输入框。

---

### 8. 发布作品白名单 — `src/constants/index.ts`

将模块的 `ModuleId` 加入 `CANVAS_PUBLISH_MODULE_ID_WHITELIST`：

```ts
export const CANVAS_PUBLISH_MODULE_ID_WHITELIST: number[] = DISABLED_BOARD_SHARE ? [] : [
  // ... 已有模块
  ModuleId.XxxModule, // ← 新增
];
```

**影响范围**（一处改动，自动覆盖所有位置）：

| 位置 | 文件 | 判断方式 |
|------|------|----------|
| 列表视图 hover 遮罩 | `CreationListResultBlock.vue` | `isCanvasPublishModule(message.module)` |
| 网格视图 hover 遮罩 | `CreationGalleryView.vue` | `:show-publish="isCanvasPublishModule(item.module)"` |
| 详情弹窗操作栏 | `ImageActions.vue` | `isCanvasPublishModule(currentModuleNum)` |
| 我的资产 | 同上 | 同上 |

**缺失后果**：所有位置的发布按钮不显示。

---

### 9. 列表视图再次生成 — `CreationListItem.vue` 的 `handleRegenerate`

在 `handleRegenerate` 中添加独立分支（在 video 之后、default 之前）：

```ts
if (mergedMessageParam.value._xxxTargetCid) {
  const param = mergedMessageParam.value;
  // 构建面板特有参数
  const mergedOptions = { modelId: ..., module: ..., _xxxTargetCid: ..., ... };
  // 检查算力
  const cost = calcGenerateConsumePower({ ... });
  if (powerNumber.value < cost) { /* 算力不足提示 */ return; }
  // 直接 emit regenerate，跳过输入框回填
  emit("regenerate", { prompt: ..., description: ..., referImages: ..., options: mergedOptions, isComfyUI: false, regenerateClientId: props.message.clientId });
  return;
}
```

**关键**：不调用 `getResolvedReEditOptions()`（那是给输入框回填用的），直接构建面板参数 emit。

**缺失后果**：再次生成走 default 分支，参数不包含面板私有字段，生成可能失败或行为异常。

---

### 10. 详情弹窗再次生成 — `ImageDetails/index.vue`

添加 `regenerateXxx` 函数 + 更新 v-if 和 click handler：

```ts
const regenerateXxx = () => {
  const p = mergedRecordParam.value;
  if (!p || !Object.keys(p).length) return;
  const referImages = Array.isArray(p.imageList) ? [...p.imageList] : [];
  const options = { modelId: ..., _xxxTargetCid: ..., ... } as ChatPayloadOptions & Record<string, any>;
  const cost = calcGenerateConsumePower({ ... });
  if (!ensureEnoughPower(cost)) return;
  emits('chatRegenerate', { prompt: ..., description: ..., referImages, options, regenerateClientId: props.version?.clientId });
  open.value = false;
};
```

模板更新：

```vue
v-if="(canRegenerate || isCanvasRenderRecord || ... || isXxxRecord) && !isCanvasRepaintUpscaleRecord"
@click="... ? regenerateXxx() : ..."
```

**缺失后果**：详情弹窗不显示"再次生成"按钮。

---

### 11. 父组件再次生成拦截 — 3 个父组件

`chatRegenerate` 事件被 3 个父组件接收，每个都需要添加 `isCanvasXxx` 判断来跳过 `FILL_BOTTOM_HERO_PARAMS`：

#### CreationTab.vue — `handleRegenerate`

```ts
const isCanvasXxx = !!(options as any)?._xxxTargetCid;
if (!isComfyUI && !isCanvasRender && !isCanvasFission && !isCanvasDraft && !isCanvasXxx) {
  $bus.emit(BUS_EVENTS.FILL_BOTTOM_HERO_PARAMS, { ... });
}
```

#### GalleryPanel/index.vue — 内联 `@chat-regenerate`

```ts
const isCanvasXxx = !!p.options?._xxxTargetCid;
if (!isComfyUI && !isCanvasRender && !isCanvasDraft && !isCanvasXxx) { ... }
```

#### ImageDetailEntryManager.vue — `handleChatRegenerate`

```ts
const isCanvasXxx = !!(options as any)?._xxxTargetCid;
if (!isComfyUI && !isPSDType && !isCanvasRender && !isCanvasXxx) { ... }
```

**缺失后果**：再次生成时参数回填到输入框，而不是直接生成。

---

### 12. 发布作品后一键同款回填 — `canvasCloneNavigation.ts` + `canvasShareParamAdapter.ts` + `board/detail/index.vue`

> 作品发布后，用户在作品详情页/个人中心/模型详情等入口点击"一键同款"，需根据模块类型将参数回填到自由画布的**对应面板**，而非底部输入框或传统生图路由。每个面板模块必须独立实现这条链路。

#### 12.1 参数转换 + sessionStorage 存取 — `src/utils/canvasShareParamAdapter.ts`

新增一组（3 个函数 + 1 个常量 + 1 个接口）：

```ts
export const PINO_CANVAS_XXX_PARAMS = 'PINO_CANVAS_XXX_PARAMS'

export interface CanvasXxxFillPayload {
  sourceImageUrl: string
  // ... 面板特有回填字段
}

/** 将 artworkPublishDetail.param 转换为 XXX 面板回填参数 */
export function convertPublishParamToXxxPayload(
  paramJson: string | undefined | null,
  sourceImageUrl = '',
): CanvasXxxFillPayload | null { /* ... */ }

/** 写入 sessionStorage */
export function saveXxxParamsToSession(payload: CanvasXxxFillPayload): void { /* ... */ }

/** 读取并清除 sessionStorage */
export function consumeXxxParamsFromSession(): CanvasXxxFillPayload | null { /* ... */ }
```

**关键**：
- `sourceImageUrl` 通过 `resolveCanvasPanelSourceImageUrl` 提取，优先级：`layoutRefer.image` → `attach.imageList[0]` → `param.originImgUrl` → fallback
- 转换函数返回 `null` 时跳转仍发生，但不写入 sessionStorage（降级到空画布）

**缺失后果**：一键同款走通用 `q` 参数分支，参数回填到底部输入框，面板不打开。

#### 12.2 模块判断函数 — `src/constants/index.ts`

```ts
export function isCanvasXxxModule(moduleId: number | undefined | null): boolean {
  if (moduleId == null) return false;
  return Number(moduleId) === ModuleId.XxxModule;
}
```

**缺失后果**：`navigateToCanvasClone` 无法识别该模块，走通用分支。

#### 12.3 导航分流 — `src/utils/canvasCloneNavigation.ts`

在 `navigateToCanvasClone` 中新增 `else if` 分支：

```ts
} else if (isCanvasXxxModule(module)) {
  const sourceImageUrl = originImgUrl || ''
  const xxxPayload = convertPublishParamToXxxPayload(paramJson, sourceImageUrl)
  if (xxxPayload) {
    saveXxxParamsToSession(xxxPayload)
  }
  router.push({ path: '/board/new' })
}
```

**关键**：必须在 `isCanvasPublishModule(module)` 通过后、通用 `q` 参数分支之前。

**缺失后果**：该模块的一键同款走 `q` 参数 → `AdvancedHeroActions.fillParams`，面板不打开。

#### 12.4 画布详情消费 — `board/detail/index.vue`

三处改动：

```ts
// 1. import
import { consumeXxxParamsFromSession, type CanvasXxxFillPayload } from "@/utils/canvasShareParamAdapter";

// 2. 暂存 ref
const pendingCanvasXxxIdentical = ref<CanvasXxxFillPayload | null>(null);

// 3. onMounted 消费
pendingCanvasXxxIdentical.value = consumeXxxParamsFromSession();

// 4. applyPending 函数
const applyPendingCanvasXxxIdentical = async () => {
  const xxxParams = pendingCanvasXxxIdentical.value;
  if (!xxxParams?.sourceImageUrl) return;
  pendingCanvasXxxIdentical.value = null;
  await insertImageWithViewportFit(xxxParams.sourceImageUrl);
  const activeObj = getEditor()?.fabricCanvas?.getActiveObject?.();
  const cid = (activeObj as any)?.id;
  if (!cid) return;
  const { sourceImageUrl: _, ...fillData } = xxxParams;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      boardToolbarStore.openXxxPanel(cid, fillData);
    });
  });
};

// 5. watch isLoading 触发
watch(isLoading, (loading) => {
  if (!loading) {
    // ... 已有模块
    if (pendingCanvasXxxIdentical.value) {
      void nextTick(() => applyPendingCanvasXxxIdentical());
    }
  }
});
```

**关键时序**：`onMounted` 时画布未初始化，必须暂存 ref → `watch(isLoading)` 等 loading 变 false → `applyPending` 插入图片并打开面板。直接在 `onMounted` 插入会被 `resetBoard` 清空。

**缺失后果**：sessionStorage 数据被消费但面板不打开，或插入时机错误被清空。

#### 12.5 作品详情参考图展示 — `useImageDetailScene.ts`

如果面板的 `param.imageList` 不是原图（如局部修改的合成参考图），需在 `referenceImagePreviewUrls` 中特殊处理：

```ts
const referenceImagePreviewUrls = computed(() => {
  const params = parsedParam.value
  if (!params) return []
  // XXX 模块：imageList 是合成图，用 originImgUrl 展示原图
  const moduleId = imageDetail.value?.module
  if (isCanvasXxxModule(moduleId)) {
    const originImgUrl = get(params, 'originImgUrl') as string | undefined
    if (typeof originImgUrl === 'string' && originImgUrl) return [originImgUrl]
    return []
  }
  // ... 通用提取逻辑
})
```

**缺失后果**：作品详情页参考图显示合成图/蒙版图，而非原图。

#### 12.6 一键同款入口传参 — 所有调用 `navigateToCanvasClone` 的位置

确保传入 `originImgUrl`（来自 `param.originImgUrl` 或 `layoutRefer.image`）：

```ts
navigateToCanvasClone({
  paramJson: detail?.param,
  module: param?.module,
  originImgUrl: param?.originImgUrl,  // ← 必传
  isHideReferenceImage: detail?.isHideReferenceImage,
  router
})
```

**已有入口**（无需改动，仅核对）：`sectionDetail.vue`、`sectionDetail2.vue`、`WorkItem.vue`、`ArtworkItem.vue`、`InspirationWorkItem.vue`

**缺失后果**：`sourceImageUrl` 为空，转换函数返回 `null`，面板不打开。

#### 坑点速查

| 坑点 | 规避方式 |
|---|---|
| 新画布元素位置与原始快照不同，`checkTransformDrift` 误报 | 构建 `AttachPayload` 时用当前元素实际变换值填充 `elementSnapshot` |
| `onMounted` 直接插入图片被 `resetBoard` 清空 | 暂存 ref → `watch(isLoading)` → `applyPending` |
| `param.imageList` 是合成参考图不是原图 | 参考图展示和回填参数都用 `originImgUrl` / `layoutRefer.image`，跳过 `imageList` |
| `module` 字段不固定（局部修改） | 用 `isCanvasXxxModule` 判断，不用 `module === 具体模型` |

---

## 识别方式速查

| 模块 | module ID | 私有字段前缀 | 识别方式 |
|------|-----------|-------------|----------|
| 万能渲染 | `CanvasRender` | `_renderTargetCid` | `canvas_trigger === 'canvas_render'` 或 module ID |
| 相似图裂变 | `CanvasFission` | `_fissionTargetCid` | module ID |
| 一键成稿 | `CanvasDraft` | `_draftTargetCid` | module ID 或 `canvas_trigger === 'canvas_draft'` |
| 智能扩图 | `VisualExpansionV2` | `_outpaintTargetCid` | module ID |
| 局部修改 | `CanvasLocalRefine` | `_inpaintTargetCid` | `_inpaintTargetCid` 字段（module ID 可能是用户选的模型） |
| 超清放大 | `CanvasRepaintUpscale` | — | `canvas_trigger === 'canvas_repaint_upscale'` 或 module ID |

**注意**：局部修改的 `module` 字段是用户选择的模型 ID（如 Monkey/SeedDream/KleinFast），不是固定值，因此必须通过 `_inpaintTargetCid` 字段识别。

---

## 面板目录结构参考

```
ImageContextToolbar/
├── XxxPanel/
│   ├── index.vue              # 面板主组件（薄层展示）
│   ├── types.ts               # 类型定义（AttachPayload、Session 等）
│   ├── constants.ts           # 常量（ModuleId、笔刷范围、点数规则等）
│   ├── useXxxSession.ts       # 会话管理 composable（状态 + 子 composable 组合）
│   ├── useXxxSubmit.ts        # 提交生成 composable（构建参数 + 调用 generationEngine）
│   ├── useXxxReEdit.ts        # 重新编辑 composable（消费 pendingXxxReEditParams）
│   └── components/            # 子组件（输入框、模型选择器、生成按钮等）
```

---

## 提交生成时写入创作记录的关键字段

面板在 `useXxxSubmit.ts` 中调用 `generationEngine.generate()` 时，必须将面板私有字段写入 `overrides`：

```ts
const overrides: Record<string, unknown> = {
  modelId: modelId.value,
  module: modelId.value,
  // ... 通用字段
  _xxxTargetCid: targetCid.value,
  _xxxPrompt: prompt.value,
  _xxxModelId: String(modelId.value),
  _description: prompt.value,  // 展示用
  _xxxRestoreConfig: { ... },  // 重新编辑还原用
};
```

这些字段会被后端存入创作记录的 `param` 中，后续重新编辑/再次生成时从 `mergedMessageParam` 提取。

---

## 快速验证流程

新增面板后，按以下步骤验证完整性：

1. **生成一张图** → 确认创作记录出现
2. **列表视图"重新编辑"** → 确认打开对应面板，不回填输入框
3. **网格视图"重新编辑"** → 同上
4. **详情弹窗"重新编辑"** → 同上
5. **失败占位符"重新编辑"** → 同上
6. **列表视图"再次生成"** → 确认直接生成，不回填输入框
7. **详情弹窗"再次生成"** → 同上
8. **列表/网格 hover 发布按钮** → 确认发布按钮可见
9. **详情弹窗发布按钮** → 同上
10. **发布作品后"一键同款"** → 确认跳转到 `/board/new`，插入原图并打开对应面板回填参数（不回填底部输入框）
11. **作品详情页参考图展示** → 确认参考图显示原图，不是合成图/蒙版图（局部修改需重点验证）
12. **Type-check** → `npm run type-check` 无新增错误
