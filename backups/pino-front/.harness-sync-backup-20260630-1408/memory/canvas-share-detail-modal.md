---
name: canvas-share-detail-modal
description: 自由画布作品详情弹窗（分享/查看详情）跨 module 字段映射规范
metadata:
  type: project
  created: 2026-06-23
---

# 自由画布作品详情弹窗字段映射规范

**问题/偏好**：自由画布每个 module（万能渲染、一键成稿、局部修改、相似图裂变等）生成的作品都会走详情弹窗展示创作参数。不同 module 的参数字段位置和语义不同，直接用 `imageList`/`prompt`/`module` 会导致参考图错位、提示词含系统文本、模型名显示成场景标识。

**Why**：
1. 分享/作品详情接口返回的 `input`（`getChatMessageDetail.data.input`，JSON 字符串）是后端归类后的数据，`module` 是场景标识（如局部修改=63），真实生图模型在 `_inpaintModelId` 等子字段
2. 局部修改的 `imageList[0]` 是「原图+反色轮廓线」合成参考图，不是原图；`prompt` 含系统前后缀，用户原始输入在 `_inpaintPrompt`
3. 依赖包 `@xmiles/holopix-components` 的 `showModalGenerationDetail` 需要按 module 差异化取值，否则每个 module 都会踩同样的坑

**How to apply**：

## 入口与数据来源

- 分享页：`src/views/workspace/board/share/hooks/useShareMediaInteraction.ts` → `boardShareApi.getChatMessageDetail(clientId)` → `showModalGenerationDetail({ input, output })`
- 画布内：`src/views/workspace/board/detail/components/ImageDetailEntryButton/ImageDetailEntryManager.vue` → `useDetailDataResolver` → `ImageDetails` 组件
- `input`/`output` 是 JSON 字符串，依赖包需先 `JSON.parse`，失败降级为 `showModalMediaViewer`

## 场景识别（用 module）

```ts
import { ModuleId } from "@xmiles/holopix-types";
// 本仓库 src/constants/index.ts 已有：
isCanvasRenderModule(moduleId)    // 万能渲染
isCanvasDraftModule(moduleId)     // 一键成稿
isCanvasFissionModule(moduleId)   // 相似图裂变
isCanvasLocalRefineModule(moduleId) // 局部修改 === 63
```

> 注意 module 双层语义：画布内提交时 `module = 用户选的模型`；后端存储/分享返回时后端归类为场景 ID（局部修改=63），真实模型移到 `_inpaintModelId`。

## 各 module 字段映射差异

| 字段 | 万能渲染/普通 | 一键成稿 | 局部修改（63） |
|---|---|---|---|
| 参考图 | `imageList` 或 `attach.imageList` | `layoutRefer.image` | **`originImgUrl`**（不能用 `imageList`） |
| 提示词 | `prompt` | `prompt` | **`_inpaintPrompt`** / `_description`（不能用 `prompt`） |
| 使用模型 | `module` | `module` 或 `modelList` | **`_inpaintModelId`**（`module` 是 63） |
| 蒙版 | 无 | 无 | `_inpaintMaskDataUrl`（二值图，单独标注展示） |
| 模型列表 | `modelList` / `attach.moduleList` | `attach.moduleList` | 无（单模型） |

通用参考图取值顺序（非局部修改，见 `useImageDetailScene.ts`）：
`imageList` → `attach.imageList` → `layoutRefer.image` → `attach._imageRefs` → `attach._referenceMap` → `getReferenceImage`

## 局部修改特有坑点

1. **`imageList[0]` 不是原图**：是「原图+反色轮廓线」合成参考图，参考图必须用 `originImgUrl`
2. **`prompt` 含系统前后缀**：展示用 `_inpaintPrompt` 或 `_description`
3. **`module`(63) 不是真实模型**：展示「使用模型」取 `Number(_inpaintModelId) || ModuleId.CanvasLocalRefine`；本仓库 `useImageDetailScene.ts` 在 `module===63` 时回退展示为 Monkey
4. **`attach` 是 JSON 字符串**：需 `JSON.parse`，`_inpaintTargetCid`/`_inpaintRestoreConfig` 都在里面
5. **分享页不支持一键同款/重新编辑**：局部修改依赖画布元素 CID，非编辑环境无法还原

## 完整参考

依赖包开发用的完整字段速查、伪代码、坑点清单见根目录：`自由画布局部修改-详情弹窗参考.md`

**Related**:
- [[project-architecture]] - 工具栏注册表、面板入口
- [[canvas-generate-button-reuse]] - 功能面板生成按钮复用
- `.codegraph/board-code-map.md#局部修改inpaintpanel`
- `.codegraph/board-code-map.md#图片详情入口按钮查看详情`
