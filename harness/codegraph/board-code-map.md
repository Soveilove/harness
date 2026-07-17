# 自由画布 Code Map

> 目标：沉淀自由画布长期高频入口、关键数据流和复杂面板参数链路。近期总览仍保留在 `recent-work-code-map.md`，自由画布深水区优先看本文件。

## 同步信息

| 项 | 内容 |
|---|---|
| Code Map 版本 | `2026-06-24.1` |
| 同步范围 | `.specify/codegraph/board-code-map.md` |
| 上级索引 | `.specify/codegraph/recent-work-code-map.md` |
| 关联地图 | `.specify/codegraph/board-video-code-map.md`（视频模块专用） |
| 维护原则 | 本文件记录自由画布稳定链路；视频模块深水区见专用地图；近期地图只保留入口和跳转 |

## 阅读策略

| 任务类型 | 先读 | 再展开 |
|---|---|---|
| 画布打开/恢复异常 | `detail/index.vue`、`useBoardController.ts` | `helper/init/`、`helper/store/layer.ts`、`useCanvasEditor.ts` |
| Fabric 交互/选中态 | `SmartCanvas/index.vue`、`useCanvasEditor.ts` | `helper/store/layer.ts`、`helper/imageContext/` |
| 选中图片工具 | `ImageContextToolbar/` | 对应 Panel、`helper/imageContext/registry/`、`helper/store/toolbar.ts` |
| 生成参数问题 | 对应 Panel 的 `useCanvasXxx.ts` 或 `useInpaintSubmit.ts` | `domain/generation/engine/index.ts`、`helper/hooks/useGenerateParamsBuilder.ts` |
| 任务回填问题 | `useCanvasTaskListener.ts` | `helper/store/taskEvent.ts`、`helper/imageLayer.ts`、自动保存链路 |
| UI 布局/聚焦工具 | `uiLayoutStore.ts`、具体 Panel | `FOCUS_TOOL_BEHAVIOR_KEY` 注入链路 |

## 顶层入口

| 文件 | 职责 | 关注点 |
|---|---|---|
| `src/router/modules/board.ts` | 自由画布路由 | `/board/all` 列表、`/board/:boardId` 详情、分享页 |
| `src/views/workspace/board/list/index.vue` | 画布列表页 | 创建/进入画板、列表展示 |
| `src/views/workspace/board/list/hooks/useCreateBoard.ts` | 创建画板 | 新建画板、跳转详情 |
| `src/views/workspace/board/detail/index.vue` | 画布详情容器 | 组合画布、图库、工具栏、任务监听 |
| `src/views/workspace/board/detail/components/SmartCanvas/index.vue` | Fabric 画布展示层 | 画布 DOM、Fabric 实例承载与交互显示 |

## 详情加载链路

```text
/board/:boardId route
  → board/detail/index.vue
  → useBoardController.loadBoard
      → getBoardDetail / getLayerList
      → helper/init/loadBoardData
      → boardLayerStore.setFabricCanvasData
      → useCanvasEditor.bindCanvasListeners
      → useCanvasHistory
```

关键文件：

| 文件 | 职责 | 风险点 |
|---|---|---|
| `hooks/useBoardController.ts` | 详情加载控制 | 拉取顺序、失败态、重复进入 |
| `helper/init/loadBoardData` | 画布数据恢复 | Fabric 数据兼容、图层初始化 |
| `hooks/useCanvasEditor.ts` | 编辑器能力入口 | 事件绑定、自动保存、选中态、视口同步 |
| `helper/store/board.ts` | 画板基础状态 | `boardId`、`artworkId`、画板名称 |
| `helper/store/layer.ts` | 图层状态 | 图层列表、当前选中对象、cid 查找 |

## 生成统一链路

```text
Panel/useCanvasXxx 或 useInpaintSubmit
  → generationEngine.generate(request, sourceContext)
  → guards 校验权益/算力/比例
  → buildGenerateParams()
  → useArtworkGenerationTaskManager.startTask()
  → taskEventStore.emit(start/progress/complete/failed)
  → useCanvasTaskListener 回填画布
```

| 文件 | 职责 | 注意事项 |
|---|---|---|
| `domain/generation/engine/index.ts` | 统一生成入口 | `req.images` 是 `params.imageList` 的上游 |
| `domain/generation/guards.ts` | 生成前校验 | 算力、权益、智能比例 |
| `helper/hooks/useGenerateParamsBuilder.ts` | 最终参数构建 | `images` 非空时写入 `generateParams.imageList` |
| `hooks/useArtworkGenerationTaskManager.ts` | 任务发起 | clientId、任务状态、错误处理 |
| `hooks/useCanvasTaskListener.ts` | 任务结果回填 | 图片插入、替换、图层同步、自动保存 |

## 图片上下文工具栏

```text
选中图片
  → helper/imageContext/registry 解析工具
  → ImageContextToolbar 渲染工具入口
  → toolbar store 打开具体 Panel
  → Panel 组合参数并调用 generationEngine 或专用 service
```

| 目录/文件 | 职责 | 常见任务 |
|---|---|---|
| `components/ImageContextToolbar/` | 图片上下文工具栏 | 局部修改、重绘、扩图、视频、裂变等面板 |
| `helper/imageContext/registry/` | 工具注册表 | 新增工具优先注册，不在调用方堆分支 |
| `helper/store/toolbar.ts` | 工具栏状态 | 面板开关、目标图片 cid、快速编辑状态 |
| `helper/store/uiLayoutStore.ts` | 画布 UI 布局 | 图库折叠、底部栏高度、聚焦工具 |

## 局部修改（InpaintPanel）

### 关键入口

| 文件 | 职责 | 关注点 |
|---|---|---|
| `ImageContextToolbar/InpaintPanel/index.vue` | 面板 UI 与事件绑定 | 展示、输入、submit/cancel 触发 |
| `ImageContextToolbar/InpaintPanel/useInpaintSession.ts` | 会话聚合层 | 组合蒙版、合成参考图、提交、重新编辑 |
| `ImageContextToolbar/InpaintPanel/useInpaintMaskCanvas.ts` | 蒙版编辑层生命周期 | 管理 MaskRenderer、蒙版状态、指针层与清理 |
| `ImageContextToolbar/InpaintPanel/mask/MaskRenderer.ts` | offscreen canvas 绘制引擎 | mouseup 后通过 `onMaskChange` 同步 `hasMaskContent` |
| `ImageContextToolbar/InpaintPanel/useInpaintCompositeImage.ts` | 合成参考图/二值蒙版生成 | `generateCompositeImage` 输出原图 + 反色轮廓线 |
| `ImageContextToolbar/InpaintPanel/useInpaintSubmit.ts` | 最终提交生成 | 上传蒙版/合成参考图，并调用 `generationEngine.generate` |

### 生成参数链路

```text
用户点击生成
  → InpaintPanel/index.vue handleSubmit()
  → useInpaintSession.submit()
  → useInpaintSubmit.submit()
      → generateBinaryMask()
          → _inpaintMaskDataUrl 写入 overrides/attach
          → 不上传 OSS，不进入 params.imageList
      → generateCompositeImage()
          → 加载原图 sourceImageUrl
          → getMaskAlphaData() 读取当前蒙版 alpha
          → drawInvertedContour() 生成“原图 + 反色轮廓线”合成参考图
          → dataURL 上传到 inpaint-composites
          → compositeImageOssUrl
      → generationEngine.generate({ images: [compositeImageOssUrl], overrides })
  → generation/engine/index.ts buildGenerateParams({ images: req.images })
  → useGenerateParamsBuilder.ts
      → if (images.length > 0 && images[0]) generateParams.imageList = images
```

### 参数含义

| 字段 | 来源 | 最终去向 | 说明 |
|---|---|---|---|
| `params.imageList` | `[compositeImageOssUrl]` | 后端生图参数 | 合成参考图 OSS 链接，不是纯掩膜图 |
| `_inpaintMaskDataUrl` | `generateBinaryMask()` | overrides + attach | 二值蒙版 data URL，用于重新编辑还原，不上传 OSS |
| `prompt` | `SYSTEM_PROMPT_PREFIX + 用户输入` | `params.prompt` | 提交给模型的完整提示词 |
| `description` / `_description` | 用户输入 | 创作记录展示 | 不含固定系统提示词 |

> 重要：排查局部修改生成参数时，`params.imageList[0]` 应看作“原图 + 反色轮廓线”的参考图；纯蒙版只保存在 `_inpaintMaskDataUrl`，用于重新编辑还原，不会上传 OSS。

### 占位符放置位置

局部修改使用独立的 `canvas_inpaint` trigger（不复用扩图的 `canvas_outpaint`），确保所有生图路径的占位符紧邻参考图右侧。

| 发起入口 | source | canvas_trigger | 紧邻参考图 |
|---|---|---|---|
| InpaintPanel 提交 | `canvas_inpaint` | `canvas_inpaint` | 是 |
| 画布结果图"再次生成" | `canvas_inpaint` | `canvas_inpaint` | 是 |
| 创作记录"再次生成" | `canvas_inpaint` | `canvas_inpaint` | 是 |

关键文件：
- `domain/generation/tracking.ts` — `SOURCE_TO_TRIGGER` 映射 `canvas_inpaint`
- `helper/layoutManager.ts` — `CANVAS_PANEL_INLINE_LAYOUT_TRIGGERS` 白名单含 `canvas_inpaint`
- `hooks/useCanvasTaskListener.ts` — 锚定 cid 解析顺序 `_inpaintTargetCid` 优先于 `_outpaintTargetCid`

### 坑点

| 坑点 | 说明 | 规避方式 |
|---|---|---|
| 再次生成漏传 `description` 暴露系统提示词 | `message.input.prompt` 存的是 apiPrompt（系统前缀+用户输入+后缀）；`handleRegenerate` 的 inpaint 分支若不传 `description`，新记录 `attach._description` 为空，展示时回退到 `input.prompt` 暴露"对图像进行局部修改，修改范围为反色线条标出的内部涂抹区域..." | 再次生成时提取 `renderParam._inpaintPrompt \|\| renderParam._description` 作为 `description` 和 `originPrompt` 传入 `generationEngine.regenerate`；`prompt` 保持 `message.input.prompt`（后端需完整系统提示词） |

## 一键成稿（DraftPanel）

### 目录结构

```text
ImageContextToolbar/DraftPanel/
  ├── index.vue          # 面板 UI：模型列表、参考类型切换、权重滑块、参考颜色开关、生成按钮
  ├── useCanvasDraft.ts  # 核心 composable：参数状态、模型选择规则、生图请求、旧数据清理
  ├── types.ts           # 类型定义：DraftModel、DraftParams、DraftReEditParams、DraftSelectorFilterState
  ├── constants.ts       # 常量：默认参数、参考选项、最大模型数(5)、算力消耗(6)、比例选项
  └── index.ts           # barrel 导出
```

### 参数映射

```text
draftReferType       → sketchType（1=轮廓参考/线稿, 2=色块参考）
imageGuidanceWeight  → layoutReferWeight（0-1）
referenceColor       → colorRefer（boolean）
selectedModels       → loraList（{ modelId, strength }[]）
layoutRefer          → layoutRefer（参考图信息）
layoutReferMode      → 'draft'（固定值）
styleReferType       → 1（固定值）
isFluxModel          → colorSketchVer（Flux=1.1, 其余=1）
```

### 生图链路

```text
用户点击生成
  → canGenerate 校验（需要选模型 + 有参考图）
  → useArtworkTaskManagerWithEnhancement 创建增强虚拟卡
  → taskEventStore.emit('start') 通知画布
  → inferImagePrompt() 调用 improvePrompt 接口反推图片标签
  → queryModelDetails() 获取 A1/V1 模型的 imageGuidanceWeights
  → registerUploadedAsset() 上传参考图到资源系统
  → generationEngine.generate()
  → 成功后 toolbarStore.closeDraftPanel()
  → 结果回填由 useCanvasTaskListener 处理
```

### 模型过滤约束

| 维度 | 规则 |
|---|---|
| ckptType | 只允许 V1（Flux）和 A1；首次/替换首位传 `Flux,A1`，后续跟随第一个模型的基座 |
| loraType | LoRA 与 Style 互斥；Controller 可作为叠加模型 |
| 旧数据清理 | `checkModelAvailability` 会清理未上架或非 Flux/A1 的历史模型 |

## 相似图裂变（FissionPanel）

### 目录结构

```text
ImageContextToolbar/FissionPanel/
  ├── index.vue              # 面板 UI：模型列表、参考类型切换、生成按钮
  ├── useCanvasFission.ts    # 核心 composable：参数状态、模型选择规则、生图请求
  ├── types.ts               # 类型定义：FissionModel、FissionParams、FissionReEditParams
  ├── constants.ts           # 常量：默认参数、参考选项、最大模型数(5)、算力消耗(6)
  └── index.ts               # barrel 导出
```

### 参数映射

```text
fissionReferType     → fissionReferType（1=轮廓参考/强, 2=构图参考/弱）
imageGuidanceWeights → imageGuidanceWeights（固定 2.0，前端已移除权重 UI）
referenceColor       → referenceColor（boolean）
selectedModels       → modelList（完整模型对象[]） + loraList（{ modelId, strength }[]）
layoutRefer          → layoutRefer（参考图信息 { id, image, width, height }）
aspectRatios         → aspectRatios（如 "1:1"）
batchSize            → batchSize（生成数量）
module               → ModuleId.CanvasFission（固定值）
```

### attach 字段规范（关键）

相似图裂变发起生图时，**必须将模型列表写入 `attach`**，字段名对齐一键成稿（两者本质相同，统一用 `moduleList`）：

```ts
attach: JSON.stringify({
  moduleList: modelList,     // 完整模型对象列表（含 id/modelName/ckptType/loraType/preview/strength 等）
  imageList: [refer.image],  // 参考图 URL
})
```

**Why**：attach 是前端透传字段，用于创作记录/详情弹窗展示模型列表。一键成稿与相似图裂变本质相同，统一用 `moduleList` 避免展示侧分叉。

**读取侧**：
- `CreationListItem.fissionModelList`：优先 `attach.moduleList`，兜底顶层 `param.modelList`（兼容历史数据）
- `CreationListItem.draftModelList`：`attach.moduleList`
- `useImageDetailScene.canvasReferenceModelList`：API modelDetails → 顶层 `param.modelList` → `attach.moduleList`
- `ImageDetails.canvasDraftStyleLabel`：`attach.moduleList`

> 顶层 `modelList` 仍需保留（后端生图参数），attach 是前端展示用的透传备份。

### 生图链路

```text
用户点击生成
  → canGenerate 校验（需要选模型 + 有参考图）
  → generationEngine.generate({ images: [refer.image], overrides })
  → overrides 含 modelList/loraList/layoutRefer/attach(_fissionTargetCid)
  → 结果回填由 useCanvasTaskListener 处理
```

### 再次生成入口适配

`parseReEditOptionsFromMessage` 返回白名单字段（modelId/ratio/quality/template 等），**不含 fission 的 modelList/loraList/layoutRefer/attach**。因此 fission 再次生成需特殊处理，从 message 的 rawInput/result.param 提取完整 fission 参数构建 overrides：

| 入口 | 文件 | 处理方式 |
|---|---|---|
| 失败占位符再次生成 | `SmartCanvas/CanvasOverlay.vue` | `overrides: params as any`（params 含完整字段含 attach，无需额外处理） |
| 创作记录列表模式 | `GalleryPanel/components/creation/CreationListItem.vue` | fission 分支 mergedOptions 补充 attach（modelList + imageList） |
| 创作记录列表模式（父） | `GalleryPanel/components/tabs/CreationTab.vue` | 增加 fission 分支，从 rawInput/result.param 提取 modelList/loraList/layoutRefer/attach |
| 创作记录图库模式 | `GalleryPanel/components/creation/CreationGalleryView.vue` | fission 分支 mergedOptions 补充 attach（modelList + imageList） |
| 详情弹窗再次生成 | `ImageDetailEntryButton/ImageDetailEntryManager.vue` | 增加 fission 分支，从 rawInput/result.param 提取完整参数，attach 用 modelList |

### 重新编辑回填

重新编辑（非再次生成）通过 `$bus.emit(BUS_EVENTS.FISSION_PANEL_RE_EDIT, ...)` 打开面板回填参数，字段从 rawInput/result.param 顶层读取（`modelList`/`imageGuidanceWeights`/`fissionReferType`/`aspectRatios`/`batchSize`/`_fissionTargetCid`）。

## 一键同款回填链路

> 作品发布后，用户在作品详情页/个人中心/模型详情等入口点击"一键同款"，需根据模块类型将生图参数回填到自由画布对应位置（底部输入区或对应面板），而非传统生图路由。

### 分流路径（按模块类型）

```text
任意一键同款入口
  → navigateToCanvasClone({ paramJson, module, originImgUrl, router })
  → isCanvasPublishModule(module) 判断
      ├─ CanvasRender（万能渲染）   → sessionStorage(PINO_CANVAS_RENDER_PARAMS)    → /board/new
      ├─ CanvasDraft（一键成稿）    → sessionStorage(PINO_CANVAS_DRAFT_PARAMS)     → /board/new
      ├─ CanvasFission（相似图裂变）→ sessionStorage(PINO_CANVAS_FISSION_PARAMS)   → /board/new
      ├─ CanvasLocalRefine（局部修改）→ sessionStorage(PINO_CANVAS_INPAINT_PARAMS) → /board/new
      └─ 其他生图模块（Monkey 等）  → q 查询参数(encodeParams)                     → /board/new?q=xxx
```

### 关键文件

| 文件 | 职责 | 关注点 |
|---|---|---|
| `src/utils/canvasCloneNavigation.ts` | 统一导航函数 `navigateToCanvasClone` | 按模块类型分流，供所有一键同款入口复用 |
| `src/utils/canvasShareParamAdapter.ts` | 参数转换 + sessionStorage 存取 | 每个面板模块一组 `convert/save/consume` 函数 |
| `src/constants/index.ts` | 模块判断函数 | `isCanvasRenderModule` / `isCanvasDraftModule` / `isCanvasFissionModule` / `isCanvasLocalRefineModule` |
| `board/detail/index.vue` | 画布详情消费 sessionStorage | `onMounted` 消费 → 暂存 ref → `watch(isLoading)` 触发 `applyPendingXxxIdentical` |
| `image/detail/composables/useImageDetailScene.ts` | 作品详情展示 | 参考图 URL 提取，局部修改需跳过 `imageList` 用 `originImgUrl` |

### 消费时序（画布详情侧）

```text
/board/:boardId onMounted
  → consumeXxxParamsFromSession() 读取并清除 sessionStorage
  → 暂存到 pendingCanvasXxxIdentical ref
  → watch(isLoading) loading 变 false
  → applyPendingCanvasXxxIdentical()
      → insertImageWithViewportFit(sourceImageUrl)  插入原图并选中
      → 取 activeObject.id 作为 cid
      → 构建 InpaintAttachPayload（一键同款场景用当前元素实际变换填充 elementSnapshot，避免"原图位置已变化"误报）
      → 双 rAF 后 boardToolbarStore.openXxxPanel(cid, fillData)
```

### 各模块回填字段

| 模块 | sessionStorage Key | 转换函数 | 回填目标 | 关键字段 |
|---|---|---|---|---|
| 万能渲染 | `PINO_CANVAS_RENDER_PARAMS` | `convertPublishParamToRenderPayload` | `openRenderPanel` | `sourceImageUrl` / `redrawWeight` / `colorSettings` / `quality` / `style` |
| 一键成稿 | `PINO_CANVAS_DRAFT_PARAMS` | `convertPublishParamToDraftPayload` | `openDraftPanel` | `sourceImageUrl` / `modelList` / `imageGuidanceWeight` / `draftReferType` |
| 相似图裂变 | `PINO_CANVAS_FISSION_PARAMS` | `convertPublishParamToFissionPayload` | `openFissionPanel` | `sourceImageUrl` / `modelList` / `imageGuidanceWeights` / `fissionReferType` |
| 局部修改 | `PINO_CANVAS_INPAINT_PARAMS` | `convertPublishParamToInpaintPayload` | `openInpaintPanel` | `sourceImageUrl` / `_inpaintMaskDataUrl` / `_inpaintPrompt` / `_inpaintModelId` / `_inpaintRestoreConfig` |
| 生图模块 | URL `q` 参数 | `convertPublishParamToQueryPayload` | `AdvancedHeroActions.fillParams` | `prompt` / `description` / `ratio` / `quality` / `model` / `imageRefs` / `templateId` |

### 坑点

| 坑点 | 说明 | 规避方式 |
|---|---|---|
| 局部修改 `imageList` 是合成参考图 | `param.imageList[0]` 是"原图+反色轮廓线"，不是纯原图；作品详情页参考图展示和 `convertPublishParamToInpaintPayload` 都需跳过它 | 作品详情用 `originImgUrl`；回填参数用 `resolveCanvasPanelSourceImageUrl` 优先取 `layoutRefer.image` |
| 局部修改 `module` 不固定 | `module` 是用户选择的模型 ID（Monkey/SeedDream 等），不是 `CanvasLocalRefine`；但后端发布时 `module` 会是 `CanvasLocalRefine=63` | 判断用 `isCanvasLocalRefineModule(module)`，不用 `module === Monkey` |
| 一键同款"原图位置已变化"误报 | 新画布插入图片的位置必然与原始快照不同，`checkTransformDrift` 会误报 | 构建 `InpaintAttachPayload` 时用当前元素实际变换值填充 `elementSnapshot` |
| sessionStorage 消费时序 | `onMounted` 时画布未初始化完成，直接插入会被 `resetBoard` 清空 | 先暂存 ref，`watch(isLoading)` 等 loading 变 false 再 `applyPending` |
| 一键同款入口需传 `originImgUrl` | 万能渲染/一键成稿/裂变/局部修改的参考图 URL 来自 `param.originImgUrl` 或 `layoutRefer.image`，不是 `imageList` | `navigateToCanvasClone` 调用方必须传 `originImgUrl` |

## 图片详情入口按钮（查看详情）

画布上生成结果图右上角的"查看详情"按钮，点击后打开 `ImageDetails` 弹窗展示创作参数。

### 入口文件

| 文件 | 职责 | 关注点 |
|---|---|---|
| `components/ImageDetailEntryButton/index.vue` | 按钮展示组件 | 仅做展示与事件 emit，位置用 transform 定位 |
| `components/ImageDetailEntryButton/ImageDetailEntryManager.vue` | 按钮管理器 | hover 检测、定位计算、详情数据组装、弹窗开关 |
| `components/ImageDetailEntryButton/helper/imageDetailEntry.ts` | 按钮尺寸/定位常量 | `BUTTON_SIZES` |
| `components/ImageDetailEntryButton/helper/imageDetailEntry/types.ts` | 按钮类型 | `ButtonMode`、`ButtonPosition` |

### 详情数据组装链路

```text
hover 画布图片
  → ImageDetailEntryManager 检测 fabric 对象
  → 读取 resultId / clientId（从 fabric 对象自定义属性）
  → 点击按钮 openDetailModal(resultId)
      → resolveVersionRecord(clientId, imageUrl)  匹配版本记录
      → resolveVersionMessage(clientId)            转换为 ChatMessage（用于模式判断）
      → buildImageDetailsList(record, resultId, isPsd, previewImg, imageUrl)
          → resolveDetailParam: 解析 record.param JSON，注入顶层 module/source
          → 用 record.images 构建完整 list（含 type/glb/videoUrl）
      → 打开 ImageDetails 弹窗，传入 id + list + version
  → ImageDetails 内部 imageState.param.module/source 读取「创作场景」「内容来源」
```

### 版本记录匹配策略（复制画布场景关键）

`resolveVersionRecord(clientId, imageUrl)` 的匹配顺序：

1. **clientId 精确匹配**（正常场景）：画布 fabric 对象的 clientId 与 `versionListStore.records` 的 clientId 一致
2. **图片 URL 兜底匹配**（复制画布场景）：clientId 匹配不到时，用图片 URL（去掉查询参数）在所有版本记录的 images 中查找

### 坑点：复制画布后 clientId 不匹配

**问题**：复制画布后，点击"查看详情"弹窗字段显示错误（创作场景丢失、内容来源显示"再迭代"、type/glb/videoUrl 丢失）。

**根因**：
- 复制画布会把原画布的 fabric 对象数据（含 `clientId`、`resultId`）直接复制过来
- 新画布的 `versionListStore.records` 是新生成的记录，clientId 与画布对象上的 clientId **不同**
- 导致 `resolveVersionRecord` 按 clientId 查找返回 `null`，走到兜底逻辑用画布图片对象构建 list，丢失了 module/source/type/glb 等字段

**修复要点**：
1. `resolveVersionRecord` 增加图片 URL 兜底匹配
2. `buildImageDetailsList` 不再要求 resultId 必须在 record.images 中存在，只要 record 匹配到就用 record 数据
3. `resolveDetailParam` 将 `VersionRecord` 顶层的 `module`/`source` 注入到 `param` JSON（versionList 接口的 param JSON 可能不含这两个字段，而 ImageDetails 从 `imageState.param.module/source` 读取）

### 与 CreationTab 的差异

| 维度 | CreationTab（图库创作记录） | ImageDetailEntryButton（画布查看详情） |
|---|---|---|
| 数据来源接口 | `chatMessage/list`（`result.param` 含 module/source） | `versionList`（`param` JSON 可能不含 module/source，需从顶层补全） |
| param 合并 | `buildMergedImageParam`：`rawInput ∪ result.param` | `resolveDetailParam`：解析 param JSON + 注入顶层 module/source |
| images 来源 | `msg.result.images`（含完整字段） | `record.images`（原始 VersionImage，含 type/glb） |
| 匹配方式 | 按 message id | clientId 优先 + 图片 URL 兜底 |

## 常见任务定位

| 任务 | 优先入口 | 注意事项 |
|---|---|---|
| 改自由画布列表/新建 | `src/views/workspace/board/list/` | 列表页和详情页是不同路由 |
| 改画布详情布局 | `board/detail/index.vue`、`uiLayoutStore.ts` | 先确认影响图库、底部栏、工具栏哪一块 |
| 改选中图片后的工具 | `ImageContextToolbar/`、`helper/imageContext/registry/` | 优先沿用注册表，不在调用方堆分支 |
| 改局部修改参数 | `InpaintPanel/useInpaintSubmit.ts` | `imageList` 是合成参考图，纯蒙版看 `_inpaintMaskDataUrl`，不上传 OSS |
| 改一键同款回填 | `canvasCloneNavigation.ts`、`canvasShareParamAdapter.ts` | 新增面板模块需加 sessionStorage 分支 + 画布详情消费逻辑，见"一键同款回填链路"小节 |
| 改作品详情参考图展示 | `useImageDetailScene.ts` 的 `referenceImagePreviewUrls` | 局部修改需跳过 `imageList`（合成图），用 `originImgUrl` |
| 改局部修改蒙版交互 | `InpaintPanel/useInpaintMaskCanvas.ts`、`mask/MaskRenderer.ts` | 注意资源清理、目标对象锁定、`hasMaskContent` 响应式同步 |
| 改一键成稿面板 UI | `DraftPanel/index.vue` | 模型选择弹窗是 FissionModelSelector（共享） |
| 改一键成稿模型过滤 | `DraftPanel/useCanvasDraft.ts` | 看 `draftModelCkptType`、`draftLoraTypeList`、`checkModelAvailability` |
| 改任务结果回填画布 | `useCanvasTaskListener.ts`、`taskEvents.ts` | 注意自动保存、历史记录、图层 store 同步 |
| 改画布初始化/恢复 | `useBoardController.ts`、`helper/init/` | 小心竞态、多标签切换、视口同步 |
| 改查看详情按钮/弹窗字段 | `ImageDetailEntryButton/ImageDetailEntryManager.vue` | 复制画布后 clientId 不匹配，需用图片 URL 兜底；module/source 需从 VersionRecord 顶层注入 param JSON |
| 改视频生成/展示名/图层 | `.specify/codegraph/board-video-code-map.md` + skill `canvas-video-panel` | 视频模块有专用地图和 skill，改模型展示名需同步 4 处映射表 |

## 维护边界

- 新增自由画布复杂面板时，优先在本文件追加“入口 + 参数链路 + 回填链路”。
- `recent-work-code-map.md` 只保留自由画布入口索引和跳转，不再承载完整链路。
- 视频模块的完整链路统一维护在 `.specify/codegraph/board-video-code-map.md`，本文件只保留入口索引。
- 如果参数链路会影响多个面板，应提升到“生成统一链路”小节，而不是重复写在每个 Panel 下。
