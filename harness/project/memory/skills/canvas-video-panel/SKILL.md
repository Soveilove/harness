---
name: "canvas-video-panel"
description: "自由画布视频生成模块（图生视频/首尾帧/参考图生视频）的架构指南与任务清单。当需要修改视频模型展示名、视频生成参数、模式能力、视频图层、重新编辑回填、或新增视频模型时调用。"
---

# 自由画布视频生成模块指南

## 何时使用

当出现以下任一情况时，必须先读本 skill + `.specify/codegraph/board-video-code-map.md`：

- 修改视频模型展示名（如「Seedance 显示为 Seedance 2.0」）
- 修改视频生成参数（videoModel / videoMode / videoResolution / videoRatio / videoDuration）
- 修改视频模式能力（比例选项、时长范围、画质选项、最大图片数）
- 修改视频图层元数据 / Fabric 视频类
- 修改视频重新编辑 / 再次生成回填
- 新增视频模型（如 Seedance 3.0）
- 排查「视频对话记录模型显示错误」「视频结果不回填画布」类缺陷

## 核心架构

### 两模型 × 三模式

| 模型 (VideoModelKey) | API model | 展示名 | 模式 |
|---|---|---|---|
| `vidu-2-pro` | `vidu-q2-pro` | Vidu Q2 Pro | image-to-video / start-end / multimodal |
| `seedance-2-0` | `seedance-2-0` | Seedance 2.0 | image-to-video / start-end / reference |

> Vidu 的多模态叫 `multimodal`，Seedance 的叫 `reference`，UI 表单相同但 mode 值和 moduleId 不同。

### 关键文件索引

| 层 | 文件 | 职责 |
|---|---|---|
| 面板 | `ImageContextToolbar/VideoPanel/useCanvasVideo.ts` | 参数状态、模型/模式切换、生图请求 |
| 面板 | `ImageContextToolbar/VideoPanel/index.vue` | UI 主组件、provide videoState |
| 面板 | `VideoPanel/HeadTailForm.vue` | 图生视频 + 首尾帧表单 |
| 面板 | `VideoPanel/MultimodalForm.vue` | 多模态/参考表单 |
| 配置 | `AdvancedHeroActions/videoGenerationConfig.ts` | 模型/模式配置中枢 |
| 配置 | `board/helper/generationConfig.ts` | SEEDANCE 比例/画质常量 |
| 配置 | `board/helper/hooks/useSupportedModels.ts` | 模型可用性（Seedance 始终可见） |
| 生成 | `helper/video/task.ts` | executeVideoGeneration 全链路 |
| 生成 | `helper/video/factory.ts` | 视频图层工厂 |
| 生成 | `helper/video/meta.ts` | 元数据解析（带缓存） |
| 生成 | `helper/video/types.ts` | VideoLayerMetaV1 等类型 |
| 回填 | `hooks/useCanvasTaskListener.ts` | 视频结果回填画布 |
| 展示 | `CreationListItem.vue` / `CreationTagsComposer.vue` | 创作记录标签 |
| 展示 | `ImageDetails/index.vue` / `ImageInfo/modules/video.vue` | 详情弹窗 |
| Store | `helper/store/toolbar.ts` | 视频面板状态 |
| 底部 | `AdvancedHeroActions.vue` / `referenceUploadFormHelper.ts` | 底部输入框视频 |

> 完整链路图和参数映射表见 `.specify/codegraph/board-video-code-map.md`。

### 生成链路（简）

```text
useCanvasVideo.handleGenerate
  → getVideoGenerateModuleId(modelKey, mode) → moduleId
  → executeVideoGeneration(generateParams)
      → normalizeVideoResolution(1K→720, 2K→1080)
      → startTask → onClientId emit('start')
      → onComplete: normalizeVideoCompleteResult → createVideoLayerConfig → emit('complete')
  → useCanvasTaskListener.dispatchTaskCompletedResult
      → replaceGenerationPlaceholder（占位符 → 视频图层）
```

---

## 任务清单

### 1. 改视频模型展示名

**4 处映射表必须同步修改**，否则不同入口显示不一致：

| # | 文件 | 位置 |
|---|---|---|
| 1 | `GalleryPanel/components/creation/CreationListItem.vue` | `resolveVideoModelLabel` 函数 |
| 2 | `GalleryPanel/components/creation/list-view/CreationTagsComposer.vue` | `resolveVideoModelLabel` 函数 |
| 3 | `components/Image/ImageDetails/index.vue` | 视频 model map（约 L1010） |
| 4 | `components/Image/ImageDetails/components/ImageInfo/modules/video.vue` | `videoModelLabel` 的 map（约 L70） |

**当前映射**：
- `vidu-q2-pro` / `vidu_q2_pro` / `vidu 2.0 pro` / `vidu 2 pro` / `reference_to_video` / `start_end_to_video` / `image_to_video` → `Vidu Q2 Pro`
- `seedance-2-0` / `seedance-2.0` / `seedance` → `Seedance 2.0`
- `start_end_to_video_se` → `首尾帧`、`image_to_video_se` → `图片转视频`、`reference_to_video_se` → `参考图生视频`

**rawModel 提取优先级**：`backendModel`（key 形式时）→ `p.videoModel ?? p.model` → `backendModel` → `message.modelName`

---

### 2. 改视频生成参数

**文件**: `useCanvasVideo.ts`

#### 2.1 改提交字段

`buildVideoParams()`（L297-L318）收集内部 ref → `handleGenerate()`（L323-L407）组装 `generateParams`。

关键：`videoModelKey` 变更时必须同步 `model.value = getVideoApiModelName(nextModelKey)`，否则提交后端的 `videoModel` 不正确。

#### 2.2 改参数组装规则

| 模式 | imageList | videos |
|---|---|---|
| image-to-video | `[firstFrameUrl]` | — |
| start-end | `[firstFrameUrl, lastFrameUrl?]` | — |
| multimodal / reference | `[...multimodalImageUrls]`（firstFrameUrl 不重复时 unshift） | `[selectedVideoUrl?, ...multimodalVideoUrls]` |

---

### 3. 改视频模式能力

**文件**: `videoGenerationConfig.ts`

修改 `VIDU_VIDEO_MODE_CAPABILITIES` 或 `SEEDANCE_VIDEO_MODE_CAPABILITIES` 数组中对应 mode 的 `VideoModeCapability`：

```ts
interface VideoModeCapability {
  mode: VideoModeValue;
  maxImages: number;
  ratioOptions: RatioOption[];      // 来自 SEEDANCE_RATIO_OPTIONS 或子集
  qualityOptions: QualityOption[];  // 来自 SEEDANCE_QUALITY_OPTIONS
  durationOptions: number[];        // Vidu: 1-8/1-10; Seedance: 4-15
  defaultRatio: string;
  defaultQuality: ImageQuality;
  defaultDuration: number;
}
```

比例/画质常量在 `generationConfig.ts`：
- `SEEDANCE_RATIO_OPTIONS`（L151）
- `SEEDANCE_QUALITY_OPTIONS`（L160）

> Vidu 的比例是 Seedance 的子集（`VIDU_RATIO_OPTIONS` 过滤出 `1:1`/`16:9`/`9:16`）。

---

### 4. 改视频图层元数据

**类型**: `helper/video/types.ts` 的 `VideoLayerMetaV1`

```ts
type VideoLayerMetaV1 = {
  v: 1;
  videoUrl: string;
  coverUrl: string;
  duration: number;
  title: string;
};
```

**同步修改 3 处**：
1. `meta.ts` 的 `parseVideoData` — 解析逻辑（含 `video_url`/`cover_url` 兼容）
2. `factory.ts` 的 `createVideoLayerConfig` — 构建逻辑
3. `meta.ts` 的 `getVideoLayerInfo` — 提取逻辑（含 `__videoMetaCache` 缓存）

> fabric 对象的 `extraData` 字段存 JSON 字符串，`type` 为 `'video'`，`src`/`originalSrc` 用 coverUrl。

---

### 5. 改视频重新编辑回填

**链路**:

```text
CreationListItem / CreationGalleryView / ImageDetails / CanvasOverlay
  → $bus.emit(VIDEO_PANEL_RE_EDIT, { _videoTargetCid, ...params })
  → GalleryPanel/index.vue handleVideoPanelReEdit
  → toolbarStore.openVideoPanelWithReEditParams(layerId, reEditParams)
  → VideoPanel/index.vue consumePendingVideoReEditParams
  → videoState.fillParams(fillData)
```

**`fillParams` 关键逻辑** (`useCanvasVideo.ts` L565-L628)：
1. 解析 `videoModelKey`（videoModelKey > model 含 seedance/vidu > moduleId > 当前值）
2. **同步 `model.value = getVideoApiModelName(nextModelKey)`**
3. 解析 `mode`（moduleId > head-tail 转 start-end/image-to-video > multimodal+seedance 转 reference）
4. 回填各参数

---

### 6. 新增视频模型

**必须同步修改的文件**：

| # | 文件 | 改动 |
|---|---|---|
| 1 | `videoGenerationConfig.ts` | `VideoModelKey` 类型加新 key；`VIDEO_MODEL_OPTIONS` 加选项；`VIDEO_MODEL_KEY_TO_API_MODEL` 加映射；新增 `XXX_VIDEO_MODE_CAPABILITIES` 能力表；`getVideoModeOptions`/`getVideoModeCapability`/`getVideoGenerateModuleId`/`resolveVideoModelKeyByModuleId` 加分支 |
| 2 | 4 处展示名 map | 见任务 1 |
| 3 | `useSupportedModels.ts` | `ALWAYS_VISIBLE_MODEL_IDS` 加新 moduleId |
| 4 | `generationConfig.ts` | 如有新比例/画质选项，更新 `SEEDANCE_*` 常量或新增 |
| 5 | `useCanvasVideo.ts` | `fillParams` 的 model 含 seedance/vidu 判断需扩展；`handleVideoModelSelect` 已通过 `getVideoApiModelName` 自动处理 |

**ModuleId 枚举**: 视频相关 moduleId 在 `@xmiles/holopix-types` 的 `ModuleId` 中定义（SeedanceImage2Video / SeedanceStartEndVideo / SeedanceReferenceVideo / CanvasImage2Video / CanvasStartEndVideo / CanvasReferenceVideo）。

---

## 坑点速查

| 坑点 | 规避方式 |
|---|---|
| videoModelKey 与 model ref 不同步 | `handleVideoModelSelect` 和 `fillParams` 中 `videoModelKey` 变更后必须 `model.value = getVideoApiModelName(key)` |
| 展示名 4 处 map 不同步 | 新增模型时 4 处必须同步（见任务 1） |
| videoResolution 双向转换分散 | 前端 `1K`/`2K` ↔ 后端 `720`/`1080`，转换在 `useGenerateParamsBuilder`、`normalizeVideoResolution`、`resolveVideoResolutionLabel` |
| Vidu multimodal vs Seedance reference | mode 值不同、moduleId 不同，`fillParams` 自动转换 |
| image-to-video 和 start-end 共用表单 | `isHeadTailLikeMode` 统一走 HeadTailForm，但 moduleId 由 `hasLastFrame` 区分 |
| 视频模块不在发布白名单 | `CANVAS_PUBLISH_MODULE_ID_WHITELIST` 不含视频模块，无法发布/一键同款 |
| 视频模块不在一键同款链路 | `canvasCloneNavigation.ts` / `canvasShareParamAdapter.ts` 无视频分支 |
| Seedance 模型始终可见 | `useSupportedModels` 的 `ALWAYS_VISIBLE_MODEL_IDS` 含 3 个 Seedance moduleId |

---

## 快速验证流程

修改视频模块后，按以下步骤验证：

1. **切换模型生成** → 确认提交的 `videoModel` 字段与所选模型一致（检查 Network 请求）
2. **创作记录模型名** → 确认列表视图 / 网格视图标签显示正确（Seedance 2.0 / Vidu Q2 Pro）
3. **详情弹窗模型名** → 确认弹窗内模型显示正确
4. **重新编辑** → 确认打开 VideoPanel 并回填正确模型/模式/参数
5. **再次生成** → 确认直接生成，不回填底部输入框
6. **三种模式分别生成** → 确认 imageList / videos 组装正确
7. **视频结果回填** → 确认占位符替换为视频图层，可播放
8. **Type-check** → `npm run type-check` 无新增错误
