<!-- PROJECT-SPECIFIC: 本文件内容为项目专属(pino-front)，换项目时需清空重填。见 project.yaml -->
# 自由画布视频生成模块 Code Map

> 目标：沉淀自由画布视频生成（图生视频 / 首尾帧 / 参考图生视频）的稳定链路、参数映射、图层模块、任务回填、展示名映射和常见坑点。视频深水区优先看本文件，`board-code-map.md` 只保留入口索引。

## 同步信息

| 项 | 内容 |
|---|---|
| Code Map 版本 | `2026-06-24.1` |
| 同步范围 | `.specify/codegraph/board-video-code-map.md` |
| 上级索引 | `.specify/codegraph/board-code-map.md`、`.specify/codegraph/recent-work-code-map.md` |
| 维护原则 | 本文件记录视频模块稳定链路；通用生成链路见 `board-code-map.md` 的「生成统一链路」小节 |

## 阅读策略

| 任务类型 | 先读 | 再展开 |
|---|---|---|
| 视频生成参数问题 | `VideoPanel/useCanvasVideo.ts` | `videoGenerationConfig.ts`、`helper/video/task.ts` |
| 视频结果不回填画布 | `helper/video/task.ts` 的 `executeVideoGeneration` | `useCanvasTaskListener.ts` 视频分支 |
| 视频模型展示名错误 | `CreationListItem.vue` / `CreationTagsComposer.vue` 的 `resolveVideoModelLabel` | `ImageDetails/index.vue`、`ImageInfo/modules/video.vue` |
| 视频 mode 能力（比例/时长/画质） | `videoGenerationConfig.ts` 的 `VideoModeCapability` | `generationConfig.ts` 的 `SEEDANCE_*` 常量 |
| 视频图层创建/交互 | `helper/video/factory.ts`、`FabricVideo.ts` | `helper/video/meta.ts`、`interaction.ts` |
| 视频重新编辑回填 | `VideoPanel/index.vue` 的 `consumePendingVideoReEditParams` | `toolbar.ts` 的 `pendingVideoReEditParams` |
| 底部输入框视频生成 | `AdvancedHeroActions.vue`、`referenceUploadFormHelper.ts` | `videoGenerationConfig.ts` |

## 模块概览

自由画布视频生成支持两个模型 × 三种模式：

| 模型 (VideoModelKey) | API model 字段 | 展示名 | 支持模式 |
|---|---|---|---|
| `vidu-2-pro` | `vidu-q2-pro` | Vidu Q2 Pro | 图生视频 / 首尾帧 / 多模态参考 |
| `seedance-2-0` | `seedance-2-0` | Seedance 2.0 | 图生视频 / 首尾帧 / 参考图生视频 |

| 模式 (VideoModeValue) | 含义 | 首帧 | 尾帧 | 视频 | 最大图片 |
|---|---|---|---|---|---|
| `image-to-video` | 图生视频 | 必须 | — | — | 1 |
| `start-end` | 首尾帧 | 必须 | 可选 | — | 2 |
| `multimodal` | 多模态参考（Vidu） | 可选 | — | 可选 | 7 |
| `reference` | 参考图生视频（Seedance） | 可选 | — | 可选 | 6 |

> `image-to-video` 和 `start-end` 在 `useCanvasVideo.ts` 中统一走首尾帧表单（`isHeadTailLikeMode`），UI 上用同一套 HeadTailForm。

## 顶层入口与文件索引

### 面板层

| 文件 | 职责 | 关注点 |
|---|---|---|
| `ImageContextToolbar/VideoPanel/index.vue` | 面板 UI 主组件 | 模型/模式下拉、provide videoState、聚焦工具激活、消费重新编辑参数 |
| `ImageContextToolbar/VideoPanel/useCanvasVideo.ts` | 核心 composable | 参数状态管理、模型/模式切换、首尾帧上传校验、生图请求构建 |
| `ImageContextToolbar/VideoPanel/HeadTailForm.vue` | 首尾帧表单 | 图生视频 + 首尾帧模式共用，首帧来自选中图层，尾帧手动上传 |
| `ImageContextToolbar/VideoPanel/MultimodalForm.vue` | 多模态/参考表单 | 多模态参考模式，图片+视频混合上传 |

### 配置层

| 文件 | 职责 | 关注点 |
|---|---|---|
| `board/list/components/AdvancedHeroActions/videoGenerationConfig.ts` | 视频**模型/模式**配置中枢 | VideoModelKey、模式能力表、moduleId 映射、API model 名映射 |
| `board/helper/generationConfig.ts` | 视频**比例/画质**常量 + 模型卡片 | `SEEDANCE_RATIO_OPTIONS`、`SEEDANCE_QUALITY_OPTIONS`、Seedance 三模型卡片 |
| `board/list/components/HeroActions/VideoModelSelector.vue` | 模型选择器类型 | `VideoModelOption` 类型 |
| `board/list/components/HeroActions/VideoModeSelector.vue` | 模式选择器类型 | `VideoModeValue`、`VideoModeOption` 类型 |
| `board/helper/hooks/useSupportedModels.ts` | 模型可用性 | `ALWAYS_VISIBLE_MODEL_IDS` 含 3 个 Seedance 视频模块，始终可见 |

### 生成与图层层

| 文件 | 职责 | 关注点 |
|---|---|---|
| `helper/video/index.ts` | 视频图层模块统一入口 | barrel 导出所有视频能力 |
| `helper/video/task.ts` | AI 视频生成全链路 | `executeVideoGeneration`、参数规范化、结果解析、图层配置构建 |
| `helper/video/factory.ts` | 视频图层工厂 | `createVideoLayerConfig`、`createVideoLayer`、`isVideoLayer` |
| `helper/video/meta.ts` | 元数据解析与缓存 | `parseVideoData`、`getVideoLayerInfo`（带 `__videoMetaCache` 缓存） |
| `helper/video/types.ts` | 类型定义 | `VideoLayerMetaV1`、`VideoLayerInfo`、`CanvasVideoMode`、`CanvasVideoPanelPayload` |
| `helper/video/FabricVideo.ts` | Fabric 视频类 | `ensureFabricVideoRegistered`、播放图标命中检测 |
| `helper/video/interaction.ts` | 鼠标交互 | `setupVideoInteraction` |
| `hooks/useCanvasTaskListener.ts` | 任务结果回填 | 视频占位符替换为视频图层 |

### 展示层（创作记录 / 详情弹窗）

| 文件 | 职责 | 关注点 |
|---|---|---|
| `GalleryPanel/components/creation/CreationListItem.vue` | 创作记录列表项 | `resolveVideoModelLabel` 映射、`videoTags` 标签计算 |
| `GalleryPanel/components/creation/list-view/CreationTagsComposer.vue` | 创作记录标签组合 | `resolveVideoModelLabel` 映射、`videoTagParts` 计算 |
| `components/Image/ImageDetails/index.vue` | 详情弹窗 | 视频模型 map 映射（约 L1010）、`isBoardCanvasVideoProject` |
| `components/Image/ImageDetails/components/ImageInfo/modules/video.vue` | 详情弹窗视频模块 | `videoModelLabel` map 映射 |

### 底部高级输入框（非画布面板入口）

| 文件 | 职责 | 关注点 |
|---|---|---|
| `board/list/components/AdvancedHeroActions/AdvancedHeroActions.vue` | 底部输入框主体 | 视频模式生成分支、attach 字段 |
| `board/list/components/AdvancedHeroActions/referenceUploadFormHelper.ts` | 参考图/视频上传表单 | 多模态视频限制（最多 2 段）、Seedance start-end/reference 表单差异 |

## 视频生成统一链路

```text
VideoPanel/useCanvasVideo.ts handleGenerate()
  → buildVideoParams()                          收集内部 ref
  → getVideoGenerateModuleId(modelKey, mode)    决定实际后端 moduleId
  → 组装 generateParams { module, imageList, videos, attach, videoModel, ... }
  → executeVideoGeneration(generateParams, { onComplete, onError })
      → normalizeVideoResolution(quality)       1K→720, 2K→1080
      → useArtworkGenerationTaskManager.startTask()
      → onClientId: taskEventStore.emit('start', { clientId, canvas_trigger: 'canvas_video' })
      → onProgress: emit('progress', { status: QUEUING | GENERATING })
      → onComplete:
          → normalizeVideoCompleteResult()      提取 videoUrl/coverUrl/images
          → createVideoLayerConfig({ videoUrl, coverUrl, duration, title })
          → taskEventStore.emit('complete', { clientId, images, extraLayerProps })
      → onError: emit('failed', { clientId, message })
  → useCanvasTaskListener 监听 complete
      → dispatchTaskCompletedResult()
      → replaceGenerationPlaceholder()           占位符 → 视频图层
```

## 模型/模式配置中枢

**文件**: `videoGenerationConfig.ts`

### VideoModelKey → API model 映射

```ts
const VIDEO_MODEL_KEY_TO_API_MODEL: Record<VideoModelKey, string> = {
  "vidu-2-pro": "vidu-q2-pro",
  "seedance-2-0": "seedance-2-0",
};
export const getVideoApiModelName = (modelKey: VideoModelKey): string => ...
```

### VideoModelKey + VideoModeValue → moduleId 映射

| 函数 | 作用 |
|---|---|
| `getVideoGenerateModuleId(modelKey, mode)` | 真正发请求时用的 moduleId |
| `getVideoDisplayModuleId(modelKey, mode)` | UI 展示用的代理 moduleId（底部输入框） |
| `resolveVideoModelKeyByModuleId(moduleId)` | moduleId → VideoModelKey |
| `resolveVideoModeByModuleId(moduleId)` | moduleId → VideoModeValue |

`getVideoGenerateModuleId` 完整映射：

| modelKey | mode | moduleId |
|---|---|---|
| `vidu-2-pro` | `image-to-video` | `CanvasImage2Video` |
| `vidu-2-pro` | `start-end` | `CanvasStartEndVideo` |
| `vidu-2-pro` | `multimodal` | `CanvasReferenceVideo` |
| `seedance-2-0` | `image-to-video` | `SeedanceImage2Video` |
| `seedance-2-0` | `start-end` | `SeedanceStartEndVideo` |
| `seedance-2-0` | `reference` | `SeedanceReferenceVideo` |

### VideoModeCapability（模式能力表）

每个模型×模式组合的能力：

```ts
interface VideoModeCapability {
  mode: VideoModeValue;
  maxImages: number;
  ratioOptions: RatioOption[];      // 来自 SEEDANCE_RATIO_OPTIONS 或其子集
  qualityOptions: QualityOption[];  // 来自 SEEDANCE_QUALITY_OPTIONS
  durationOptions: number[];        // Vidu: 1-8/1-10; Seedance: 4-15
  defaultRatio: string;             // 默认 "16:9"
  defaultQuality: ImageQuality;     // 默认 "1K"
  defaultDuration: number;          // Vidu: 5; Seedance: 8
}
```

查询函数：`getVideoModeCapability(modelKey, mode)` → 返回能力对象，其余 `getVideoRatioOptions`/`getVideoQualityOptions`/`getVideoDurationOptions`/`getVideoDefault*` 都是它的封装。

## 参数映射表

### VideoPanel → 后端 generateParams

| 面板 ref / 字段 | generateParams 字段 | 说明 |
|---|---|---|
| `videoModelKey` | （经 `getVideoGenerateModuleId` 转换）→ `module` | 决定后端 moduleId |
| `model` | `videoModel` | API 模型名，`getVideoApiModelName(videoModelKey)` 生成 |
| `mode` | `videoMode` | `image-to-video` / `start-end` / `multimodal` / `reference` |
| `quality` | `videoResolution` | 经 `normalizeVideoResolution` 转为数字：1K→720, 2K→1080 |
| `aspectRatio` | `videoRatio` | 如 `16:9` |
| `duration` | `videoDuration` | 秒数 |
| `firstFrameUrl` | `firstImageUrl`（首尾帧模式） + `imageList[0]` | 首帧 |
| `lastFrameUrl` | `lastImageUrl`（首尾帧模式） + `imageList[1]` | 尾帧 |
| `multimodalImageUrls` | `multimodalImageUrls` + `imageList` | 多模态图片 |
| `multimodalVideoUrls` | `multimodalVideoUrls` + `videos` | 多模态视频 |
| `selectedVideoUrl` | 含在 `videos` 数组首位 | 选中的视频 |
| `movementAmplitude` | `movementAmplitude` | 仅首尾帧模式 |
| `bgm` | `bgm` | 仅首尾帧模式 |
| `originImgUrl` | `originImgUrl` | 原始源图，再次生成定位用 |
| `videoTargetCid` | `_videoTargetCid` | 目标图层 cid，再次生成用 |
| — | `attach` | `JSON.stringify({ _videoTaskSource: "video_panel" })` |

### imageList / videos 组装规则

| 模式 | imageList | videos |
|---|---|---|
| `image-to-video` | `[firstFrameUrl]` | — |
| `start-end` | `[firstFrameUrl, lastFrameUrl?]` | — |
| `multimodal` / `reference` | `[...multimodalImageUrls]`（firstFrameUrl 不重复时 unshift 到首位） | `[selectedVideoUrl?, ...multimodalVideoUrls]` |

## 视频图层模块（helper/video/）

### 模块结构

```text
helper/video/
├── index.ts          # barrel 导出（统一对外 API）
├── types.ts          # 类型定义（最底层，无依赖）
├── meta.ts           # 元数据解析与缓存（parseVideoData、getVideoLayerInfo）
├── FabricVideo.ts    # Fabric 视频类注册 + 播放图标命中检测
├── factory.ts        # 图层工厂（createVideoLayerConfig、createVideoLayer）
├── interaction.ts    # 鼠标交互（setupVideoInteraction）
└── task.ts           # AI 视频生成全链路（executeVideoGeneration 等）
```

### VideoLayerMetaV1（extraData 序列化格式）

```ts
type VideoLayerMetaV1 = {
  v: 1;
  videoUrl: string;   // 视频 URL
  coverUrl: string;   // 封面图 URL
  duration: number;   // 时长（秒）
  title: string;      // 图层标题
};
```

存储在 fabric 对象的 `extraData` 字段（JSON 字符串）。`getVideoLayerInfo` 读取时带 `__videoMetaCache` 缓存，避免重复 JSON.parse。

### createVideoLayerConfig 输出

```ts
{
  type: 'video',
  name: title,
  src: coverUrl,           // fabric 用封面图作为 src
  originalSrc: coverUrl,
  extraData: JSON.stringify(meta),  // VideoLayerMetaV1
}
```

### executeVideoGeneration 关键逻辑

1. **参数规范化**：`videoResolution` 经 `normalizeVideoResolution`（1K→720, 2K→1080）
2. **任务启动**：`onClientId` 回调 emit `start`，写入 `canvas_trigger: 'canvas_video'`
3. **进度**：`INITIALIZING`/`QUEUING` 阶段 → `QUEUING`，其余 → `GENERATING`
4. **完成**：
   - `normalizeVideoCompleteResult` 兼容多种后端返回格式提取 `videoUrl`/`coverUrl`/`images`
   - `createVideoLayerConfig` 构建视频图层配置
   - emit `complete`，`extraLayerProps` 携带视频图层配置
5. **错误**：`CONCURRENT_TASK` → emit `cancel`（静默），其余 → emit `failed`

## 任务结果回填链路

**文件**: `hooks/useCanvasTaskListener.ts`

### 视频结果判断（`dispatchTaskCompletedResult` L204-L212）

```ts
const isVideoResult =
  extraLayerProps?.type === "video" ||
  isCanvasVideoModuleId(moduleId) ||  // 6 个视频 moduleId 之一
  Boolean(versionMeta?.videoUrl);
```

### 视频结果处理分支（L214-L264）

1. 先 `switchGenerationPlaceholderToImagePlaceholder`（占位符转图片占位符）
2. 提取 `videoUrl`：`versionMeta.videoUrl || param.videoUrl || firstUrl`
3. 提取 `coverUrl`：`firstUrl`（非视频URL时）→ `getVideoFirstFrameImageUrl` → `getVideoFrameUrl`
4. 若无 `extraLayerProps`，用 `createVideoLayerConfig()` 构建
5. 若 `extraLayerProps.type === "video"`，解析 `extraData` 已有元数据重新推导
6. `replaceGenerationPlaceholder`（占位符 → 视频图层，传入 `extraLayerProps` + `versionId`）

### 版本列表完成（`handleTaskCompleted` L362-L401）

- 计算已有视频图层数量 → 标题 `视频N`
- 从 `version.param` JSON 解析 `videoDuration`
- `createVideoLayerConfig({ videoUrl, coverUrl, duration, title })`
- 透传给 `dispatchTaskCompletedResult`

## 重新编辑 / 再次生成链路

### 重新编辑（回填面板）

```text
CreationListItem / CreationGalleryView / ImageDetails / CanvasOverlay
  → $bus.emit(BUS_EVENTS.VIDEO_PANEL_RE_EDIT, { _videoTargetCid, clientId, ...params })
  → GalleryPanel/index.vue handleVideoPanelReEdit
  → boardToolbarStore.openVideoPanelWithReEditParams(layerId, reEditParams)
  → VideoPanel/index.vue consumePendingVideoReEditParams()
  → videoState.fillParams(fillData)
```

### fillParams 关键逻辑（`useCanvasVideo.ts`）

1. 解析 `videoModelKey`：
   - `params.videoModelKey`（直接）
   - `params.model` 含 `seedance` → `seedance-2-0`
   - `params.model` 含 `vidu` → `vidu-2-pro`
   - `rawModuleId` 有效 → `resolveVideoModelKeyByModuleId`
   - 兜底当前值
2. **同步 `model` ref**：`model.value = getVideoApiModelName(nextModelKey)`（若 `params.model` 存在则后续覆盖）
3. 解析 `mode`：
   - `rawModuleId` 有效 → `resolveVideoModeByModuleId`
   - `head-tail` → 有尾帧 `start-end`，无尾帧 `image-to-video`
   - `multimodal` + Seedance → `reference`
4. 回填 duration/aspectRatio/quality/prompt/model/mode/firstFrame/lastFrame/multimodal/movementAmplitude/bgm/originImgUrl/videoTargetCid

### 再次生成（直接走生成引擎）

视频记录的「再次生成」不回填面板，直接构建参数调用生成引擎。各入口（CreationListItem / CreationGalleryView / CreationTab / ImageDetailEntryManager）通过 `overrides` 携带完整视频参数。

## 创作记录 / 详情弹窗展示名映射

### 视频记录识别（`isVideoRecord`）

判断条件（CreationListItem / CreationTagsComposer）：
- moduleId 为 6 个视频模块之一
- 或 param 含 `videoDuration` / `videoResolution` / `videoRatio` / `videoMode` / `movementAmplitude` / `bgm` / `videos`

### 展示名映射表（4 处需同步维护）

| 文件 | 函数 / 位置 | 说明 |
|---|---|---|
| `CreationListItem.vue` | `resolveVideoModelLabel` (L538) | 列表视图标签 |
| `CreationTagsComposer.vue` | `resolveVideoModelLabel` (L339) | 标签组合器 |
| `ImageDetails/index.vue` | 视频 model map (L1010) | 详情弹窗 |
| `ImageInfo/modules/video.vue` | `videoModelLabel` map (L70) | 详情弹窗视频模块 |

**当前完整映射**：

| key（小写） | 展示名 |
|---|---|
| `vidu-q2-pro` / `vidu_q2_pro` / `vidu 2.0 pro` / `vidu 2 pro` / `reference_to_video` / `start_end_to_video` / `image_to_video` | Vidu Q2 Pro |
| `seedance-2-0` / `seedance-2.0` / `seedance` | Seedance 2.0 |
| `start_end_to_video_se` | 首尾帧 |
| `image_to_video_se` | 图片转视频 |
| `reference_to_video_se` | 参考图生视频 |

### rawModel 提取优先级

```ts
const rawModel = isBackendModelKey   // /^[a-z0-9_-]+$/i
  ? backendModel                      // message.backendModel 是 key 形式时直接用
  : String(p.videoModel ?? p.model ?? "").trim() || backendModel || String(message.modelName ?? "").trim();
```

### videoTags 字段

| 字段 | 来源 | 示例 |
|---|---|---|
| `modeLabel` | `getModuleLabelById(moduleId)` | 图生视频 / 首尾帧 / 多模态参考 |
| `modelLabel` | `resolveVideoModelLabel(rawModel)` | Seedance 2.0 |
| `durationLabel` | `videoDuration` → `${n}S` | 8S |
| `ratioLabel` | `videoRatio ?? aspectRatio` | 16:9 |
| `resolutionLabel` | `videoResolution` → `${base}P` | 720P |
| `isHeadTail` | moduleId 为首尾帧/图生视频模块 | boolean |

> 首尾帧模式（`isHeadTail`）时不展示 ratio 标签。

## 底部高级输入框视频部分

底部输入框（`AdvancedHeroActions.vue`）与画布 VideoPanel **共用** `videoGenerationConfig.ts` 配置，但生成入口不同：

| 维度 | 画布 VideoPanel | 底部输入框 |
|---|---|---|
| 生成入口 | `useCanvasVideo.handleGenerate` → `executeVideoGeneration` | `AdvancedHeroActions` 内部 → 通用生成引擎 |
| 参考图上传 | HeadTailForm / MultimodalForm（选中图层 + 手动上传） | `referenceUploadFormHelper.ts`（表单构建器） |
| moduleId | `getVideoGenerateModuleId` | `getVideoDisplayModuleId`（代理 ID，发请求时再切换） |
| 默认模型 | `vidu-q2-pro`（需手动切换） | `getDefaultVideoModelKey()` = `seedance-2-0` |

### referenceUploadFormHelper 关键约束

| 约束 | 值 |
|---|---|
| 多模态视频上限 | `MULTIMODAL_VIDEO_LIMIT = 2` |
| 单段视频 | < 8 秒 |
| 两段视频 | 每段 < 5 秒 |
| 含视频时图片上限 | 4 张 |
| Seedance `start-end` | 走图片上传，业务含义为首尾帧 |
| Seedance `reference` | 走图片上传，业务含义为参考图 |

## 工具栏 Store 视频状态

**文件**: `helper/store/toolbar.ts`

| State / Action | 行号 | 说明 |
|---|---|---|
| `isVideoPanelVisible` | L55 | 面板可见性 |
| `videoTargetCid` | L58 | 目标图层 cid |
| `pendingVideoReEditParams` | L60 | 重新编辑回填参数 |
| `videoPanelPrefill` | L62 | 面板预填充（mode + imageUrls + videoUrls） |
| `openVideoPanel(cid)` | L228 | 打开面板 |
| `openVideoPanelWithReEditParams(cid, reEditParams)` | L233 | 打开面板 + 重新编辑参数 |
| `closeVideoPanel()` | L239 | 关闭面板（清空所有状态） |
| `toggleVideoPanel(cid)` | L246 | 互斥切换 |
| `setVideoPanelPrefill(payload)` | L254 | 设置预填充 |
| `clearVideoPanelPrefill()` | L266 | 清除预填充 |

面板互斥：`isVideoPanelVisible` 的 watcher 会在其他面板打开时关闭视频面板（L396-L515 多个 watcher）。

## 常见任务定位

| 任务 | 优先入口 | 注意事项 |
|---|---|---|
| 改视频模型展示名 | 4 处 `resolveVideoModelLabel` / map（见上表） | **4 处必须同步**，否则不同入口显示不一致 |
| 改视频生成参数 | `useCanvasVideo.ts` 的 `buildVideoParams` / `handleGenerate` | `videoModelKey` 变更时必须同步 `model.value = getVideoApiModelName(key)` |
| 改视频模式能力（比例/时长/画质） | `videoGenerationConfig.ts` 的 `VideoModeCapability` | Vidu 和 Seedance 分别维护两套能力表 |
| 改视频结果回填 | `useCanvasTaskListener.ts` 的 `dispatchTaskCompletedResult` 视频分支 | 注意 coverUrl 优先级、extraLayerProps 解析 |
| 改视频图层元数据 | `helper/video/types.ts` + `meta.ts` + `factory.ts` | 改 `VideoLayerMetaV1` 要同步 `parseVideoData` 和 `createVideoLayerConfig` |
| 改视频重新编辑回填 | `useCanvasVideo.ts` 的 `fillParams` | `videoModelKey` 解析后同步 `model.value`；mode 映射 head-tail/multimodal |
| 改视频算力 | `getCanvasReferenceVideoConsumePower` / `getCanvasStartEndVideoConsumePower` | 多模态 vs 首尾帧分别计算 |
| 改底部输入框视频参考图 | `referenceUploadFormHelper.ts` | 多模态视频限制（2 段、秒数约束） |
| 新增视频模型 | `videoGenerationConfig.ts` + 4 处展示名 map + `useSupportedModels.ts` | 见下方坑点 |
| 改视频播放交互 | `FabricVideo.ts` + `interaction.ts` | 播放图标命中检测、双击播放 |

## 坑点

### 1. videoModelKey 与 model ref 必须同步

**问题**：`useCanvasVideo.ts` 的 `handleVideoModelSelect` 只更新 `videoModelKey`，未同步 `model` ref（提交后端的 `videoModel` 字段），导致 Seedance 生成的记录 `videoModel` 仍是默认值 `vidu-q2-pro`。

**解决**：`handleVideoModelSelect` 和 `fillParams` 中 `videoModelKey` 变更后，必须同步 `model.value = getVideoApiModelName(nextModelKey)`。

**Why**：`videoModelKey` 是 UI 选择用 key，`model` 是提交后端的 API model name，两者通过 `getVideoApiModelName` 映射，不同步会导致展示名错误。

### 2. 展示名映射表 4 处不同步

**问题**：`resolveVideoModelLabel` / 视频 model map 分散在 4 个文件，新增模型时只改了部分，导致列表视图、标签组合器、详情弹窗、详情视频模块显示不一致。

**解决**：新增视频模型时，4 处映射表必须同步更新（见「展示名映射表」小节）。

### 3. 视频模块不在发布白名单

**现状**：`CANVAS_PUBLISH_MODULE_ID_WHITELIST`（`constants/index.ts` L54-L67）**不包含**任何视频模块（CanvasImage2Video / CanvasStartEndVideo / CanvasReferenceVideo / Seedance*），视频记录无法发布作品。

**影响**：
- 列表/网格 hover 无发布按钮
- 详情弹窗无发布按钮
- 无一键同款回填链路

**如需支持发布**：按 `add-canvas-module-panel` skill 的检查清单逐项补充（发布白名单 + 一键同款 sessionStorage 回填 + 参考图展示）。

### 4. 视频模块不在一键同款回填链路

**现状**：`canvasCloneNavigation.ts` 和 `canvasShareParamAdapter.ts` 中**没有**视频模块分支，视频作品（若未来支持发布）的一键同款会走通用 `q` 参数 → `AdvancedHeroActions.fillParams`，而非打开 VideoPanel。

### 5. videoResolution 双向转换

**问题**：前端用 `quality`（`1K`/`2K`），后端用数字（`720`/`1080`），转换分散在多处。

**转换点**：
- `useGenerateParamsBuilder.ts` L196-L199：`SEEDANCE_QUALITY_TO_RESOLUTION`（1K→720, 2K→1080）
- `helper/video/task.ts` `normalizeVideoResolution`：同上
- 展示侧 `resolveVideoResolutionLabel`：数字 → `${base}P`

**注意**：`buildCanvasVideoGenerateParams`（task.ts）输出的 `videoResolution` 是数字，而 `useCanvasVideo.handleGenerate` 输出的 `videoResolution` 是 `quality` 字符串（由 `normalizeVideoResolution` 在 `executeVideoGeneration` 内转换）。

### 6. Seedance multimodal vs reference 模式差异

**问题**：Vidu 的多模态模式叫 `multimodal`，Seedance 的叫 `reference`，UI 表单相同（都用 MultimodalForm）但 mode 值不同。

**注意**：
- `fillParams` 中 `multimodal` + Seedance → 自动转 `reference`
- `getVideoModeOptions` 按模型返回不同模式列表
- `getVideoGenerateModuleId` 按模型+模式返回不同 moduleId

### 7. image-to-video 和 start-end 共用 HeadTailForm

**问题**：`isHeadTailLikeMode`（`image-to-video` || `start-end`）统一走首尾帧表单，但两者 moduleId 不同。

**注意**：`getVideoGenerateModuleId` 中 `image-to-video` 和 `start-end` 是不同的 moduleId，`hasLastFrame` 决定是走 `start-end` 还是 `image-to-video`。

### 8. 拖拽上传存在两套并行实现，需同步维护

**问题**：视频参考素材的拖拽上传在两处各写了一套 `handleDrop`，未复用公共 `useDragDrop` hook，规则改动需要双写：

| 入口 | 文件 | 实现 |
|---|---|---|
| 底部高级输入框 | `AdvancedHeroActions.vue` | 复用 `board/helper/hooks/useDragDrop.ts`（公共 hook），onDrop/onDropUrl 回调分发 |
| 画布视频面板 MultimodalForm | `VideoPanel/MultimodalForm.vue` | 自写 `handleDrop`，files 分支过滤图片/视频 + JSON 分支 + URL 兜底 |

**关键差异**：
- `useDragDrop.ts`（公共 hook）：JSON 数据优先于 files 解析（避免浏览器拖 `<img>` 自动生成 File 对象误判），`mediaType`/`videoUrl` 由 JSON 携带。
- `MultimodalForm.vue`：files 优先于 JSON，自写 image/video 文件过滤（`["png","jpg","jpeg","webp"]` / `["mp4","mov"]`），未识别文件需手动 toast。

**维护要求**：
1. 改拖拽文件格式校验（如禁用 svg/gif、不支持的视频格式提示）时，**两处都要改**：
   - `AdvancedHeroActions.vue` 的 `handleDroppedFiles` + `isImageFile` / `isVideoFile`
   - `MultimodalForm.vue` 的 `handleDrop` files 分支 + `validateImageFile` / `validateVideoFile`
2. 改 JSON 拖拽数据结构（`mediaType`/`videoUrl` 字段）时，两处的解析逻辑都要同步。
3. 新增不支持格式的 toast 提示时，两处都要补（`AdvancedHeroActions` 用 `showCanvasToast`，`MultimodalForm` 同样用 `showCanvasToast`）。

**Why**：两套实现独立演化，曾出现 `useDragDrop` 修复了 files/JSON 优先级而 `MultimodalForm` 未同步、以及一处补了不支持格式 toast 另一处漏补的情况。

**相关文件**：`board/helper/hooks/useDragDrop.ts`、`AdvancedHeroActions.vue`、`VideoPanel/MultimodalForm.vue`

## 维护边界

- 本文件只维护视频模块稳定链路，通用生成链路见 `board-code-map.md`。
- 新增视频模型时，同步更新本文件的「模块概览」「模型/模式配置中枢」「展示名映射表」三节。
- 视频模块如需支持发布/一键同款，按 `add-canvas-module-panel` skill 补充后，更新本文件「坑点」第 3、4 条状态。
