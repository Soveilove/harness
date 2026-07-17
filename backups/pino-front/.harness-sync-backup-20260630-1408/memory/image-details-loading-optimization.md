---
name: image-details-loading-optimization
description: ImageDetails 详情弹窗图片资源加载链路与性能优化
metadata: 
  node_type: memory
  type: feedback
  created: 2026-06-25
---

## ImageDetails 详情弹窗图片渲染链路

弹窗入口 `src/components/Image/ImageDetails/index.vue`（约 line 2088-2097），根据模块类型分三种预览分支：

- `ImageCompareBox`（对比模式，万能渲染/重绘放大等 `isCompareModeModule`）
- `ImageListPreview`（普通预览模式，非视频）
- `VideoPreview`（视频项目）

---

## 对比模式 ImageCompareBox 三个加载陷阱

**组件位置**: `src/views/workspace/components/ModuleContent/GenerateContent/ImageCompareBox/`

`index.vue` 包含双栏模式（`ReferenceImage` + `GenerateResultImage`）和滑动对比模式（`ImageCompare.vue`），通过 `imageShowMode` 切换。原图来源：watch 监听 params，取 `originImgUrl ?? layoutRefer.image ?? originLayoutRefer.image`（用户上传原始稿件，OSS 完整大图）。

### 陷阱 1：`new Image()` 完整下载原图只为拿宽高

**问题**: `ImageCompare.vue` 原先用 `new Image()` 加载完整原图（可能数 MB）只为获取宽高用于 `imageRenderArea` 计算，且这次下载与 `<img :src="image1">` 的渲染下载是两次独立请求。

**解决**: 改用 `getImageUrlSize(url)`（`src/utils/index.ts`），优先走 `getImageInfo`（OSS `image/info` 接口，只返回 `{size,format,width,height}` 元数据，不下载二进制），失败才回退 `new Image()`。

### 陷阱 2：`resizeImageWithCanvas` 端侧缩放不减传输体积

**问题**: `ReferenceImage/index.vue` 的 `resizeImageWithCanvas` 内部 `new Image()` 仍完整下载原始大图，canvas 缩放只减小渲染内存，**没有减小网络传输体积**，反而多了 onload + canvas 处理开销。

**解决**: `resizeImageWithCanvas` 内部 `img.src` 改用 `generateThumbnail(imageUrl, { width: 1920 })`，让 OSS 服务端先缩放再下载。

### 陷阱 3：watch immediate 时序导致双栏模式永远用原图

**问题**: `ReferenceImage` 的对比模块 watch（约 line 310）是 `immediate: true`，组件 mount 时立即执行。但 `props.targetWidth` 来自 `normalizedImages[0].width`（结果图宽高），此时结果图数据尚未就绪 → `targetWidth = 0` → `hasValidTargetSize = false` → 直接用 `originImgUrl` 原图。之后 targetWidth 有值了，但它不是 watch 依赖，不会重新触发 → **永远用原图**。这也是"双栏模式优化没效果"的根因。

**解决**: 对比模块原图分支不再走 `resizeImageWithCanvas`，直接用 `generateThumbnail(originImgUrl, { width: 1920 })`，和对比模式 `compareOriginImage` 保持一致。左右两栏通过 CSS `object-fit: contain` 保证视觉对齐，无需 canvas 精确缩放。

---

## 普通预览模式 ImageListPreview 资源现状

**组件位置**: `src/components/Image/ImageListPreview/`

链路：`ImageListPreview` → `Carousel`（底部缩略图 + 主图 slot）+ `ImageMouseAction`（通过 slot 替代 Carousel 主图）。

| 位置 | 文件:行 | URL 处理 | 评价 |
|------|---------|----------|------|
| Carousel 底部缩略图 | `Carousel.vue:69` | `getImageWaterMask(..., { width: 240 })` | ✅ 已限宽 |
| Carousel 主图 slot 默认 | `Carousel.vue:14/27` | `width: 1300` | ⚠️ 被 slot 替代不生效 |
| ImageMouseAction 结果图 | `ImageMouseAction.vue:276` | `getImageWaterMask(...)` 不传 width | ❌ 完整大图（详情看高清可接受） |
| ImageMouseAction 双栏参考图 | `ImageMouseAction.vue:230` | `getImageWaterMask(...)` 不传 width | ❌ 完整大图（双栏各占半宽，建议 width:1300） |
| ImageMouseAction 形象样式缩略图 | `ImageMouseAction.vue:266` | `getImageWaterMask(...)` 不传 width | ❌ 完整大图（CSS max-width:100px，最不合理，建议 width:240） |

**核心问题**: `ImageListPreview` 通过 slot 把 `ImageMouseAction` 传入 `Carousel`，替代了 `Carousel` 主图 slot 的默认内容（那个有 `width: 1300` 优化）。而 `ImageMouseAction` 接管主图渲染后，三处 `<HolopixImage>` 都调用 `getImageWaterMask(url)` **不传 width**，走 `generateOriginalWatermarkedImage`（只加水印不缩略），加载完整大图。

---

## 关键工具函数速查

- **`getImageWaterMask(url, { width })`**（`src/utils/image.ts`）：有 width 走 `generateWatermarkedThumbnail`，无 width 走 `generateOriginalWatermarkedImage`（只水印不缩略）
- **`generateThumbnail(url, { width })`**（`@xmiles/holopix-helper`）：OSS 服务端缩略图，width 单位像素，OSS 对小于该宽度的图不会放大；URL 含 `?` 则不处理，`other` 类型原样返回；`width: 1920` 覆盖多数 retina 屏
- **`getImageUrlSize(url)`**（`src/utils/index.ts`）：优先 `getImageInfo`（OSS image/info 接口，只返回元数据不下载二进制），失败回退 `new Image()`
- **`getGeneratorPreviewImage(imageUrl, param)`**（`src/utils/image.ts`）：超清放大(zoom)模块返回 `param.originImgUrl`，其他返回原图

**Related**: [[vue-pitfalls]] [[canvas-share-detail-modal]]
