---
name: canvas-generate-button-reuse
description: 自由画布功能面板统一使用 GenerateButton 组件
metadata:
  type: project
---

# 自由画布功能面板生成按钮组件复用规范

**决策：** 自由画布内的功能面板生成入口统一使用 `GenerateButton` 组件（`src/components/GenerateButton/index.vue`），而非自定义按钮。

## Why

1. **统一行为**：`GenerateButton` 内置登录检测、团队试用检测、加载态、工具提示等功能，保证所有生成入口行为一致
2. **SVIP 渐变样式**：通过 `channel="expedite"` 可启用 SVIP 渐变样式，符合自由画布内功能面板的视觉规范
3. **维护成本低**：避免维护多套按钮逻辑，修改一处即可影响所有生成入口

## How to apply

### 标准用法

```vue
<script setup lang="ts">
import GenerateButton from '@/components/GenerateButton/index.vue'
import { ModuleId } from '@xmiles/holopix-types'
</script>

<template>
  <div class="panel-footer">
    <!-- 取消按钮单独写 -->
    <button class="cancel-btn" @click="handleCancel">取消</button>
    <!-- 生成按钮使用 GenerateButton -->
    <GenerateButton
      :consume-power="pointCost"
      :loading="isGenerating"
      :disabled="!canGenerate"
      :module="ModuleId.Xxx"
      :on-generate="handleGenerate"
      channel="expedite"
    />
  </div>
</template>
```

### 关键 Props

| Prop | 说明 |
|------|------|
| `consume-power` | 点数消耗 |
| `loading` | 加载状态 |
| `disabled` | 禁用状态 |
| `module` | 模块 ID（用于区分图标样式、文案等） |
| `on-generate` | 生成回调 |
| `channel="expedite"` | 启用 SVIP 渐变样式（浅橙色） |

### 已应用的功能面板

- [[fission-panel]] - 相似图裂变（`src/views/workspace/board/detail/components/ImageContextToolbar/FissionPanel/index.vue`）
- [[inpaint-panel]] - 局部修改（`src/views/workspace/board/detail/components/ImageContextToolbar/InpaintPanel/components/InpaintGenerateBar.vue`）

### 相关组件

- `GenerateButtonContent.vue` - 生成按钮内容组件（由 GenerateButton 内部使用）
