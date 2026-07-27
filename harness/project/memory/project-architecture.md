---
name: project-architecture
description: Pino Front 项目架构概览
metadata: 
  node_type: memory
  type: project
  created: 2026-06-09
  originSessionId: 666b2e67-d2d9-466e-92c1-bcc0931c534e
---
<!-- PROJECT-SPECIFIC: 本文件内容为项目专属(pino-front)，换项目时需清空重填。见 project.yaml -->


## 技术栈

- **框架**: Vue 3 + TypeScript
- **构建**: Vite
- **状态管理**: Pinia
- **路由**: Vue Router
- **UI**: 自研组件库 + Fabric.js（画布）

## 目录结构

```
src/
├── views/              # 页面组件
│   └── workspace/      # 工作空间（核心业务）
│       └── board/      # 画布相关
├── components/         # 公共组件
├── composables/        # 组合式函数
├── stores/             # Pinia stores
├── services/           # 服务层（API、WebSocket）
├── utils/              # 工具函数
├── types/              # 类型定义
└── constants/          # 常量
```

## 核心模块

### 画布模块 (board)

- **Fabric.js 实例**: 在 `useCanvas.ts` 中管理
- **状态同步**: 画布状态 ↔ Pinia store 双向同步
- **事件处理**: 在 `hotkeys/` 目录下组织

### 资源上传模块

- **核心 Hook**: `useAssetUpload.ts`
- **上传类型**: `UploadType = 2 | 3 | 4 | 5 | 9 | 10`
  - `2`: 普通上传
  - `10`: 自由画布上传（CANVAS）

### 工具栏模块

- **位置**: `views/workspace/board/detail/components/ImageContextToolbar/`
- **模式**: 使用注册表模式管理不同工具面板

## 开发规范

- **Props 定义**: 类型必须内联，不能导入外部类型
- **模块导出**: 通过 `index.ts` 提供稳定 API
- **副作用管理**: 组件卸载时清理订阅/监听

## UI 资产约定

### 会员图标资源

**问题/偏好**: `src/assets/images/icons/VIP.svg` 这类会员图标资源本身已经包含完整视觉样式。

**Why**: 会员图标在设计资产中已经包含渐变、边框、尺寸等完整视觉表达；如果在业务组件外层再包一层渐变背景、边框或固定样式，会导致重复样式和选中态视觉偏差。

**How to apply**:
- 在 `FreePerspectivePanel` 等尺寸/权益选项中使用会员图标时，直接渲染 `<img :src="badgeVipIcon" />`
- 不要额外为会员图标外层补渐变背景、紫色边框、固定宽高容器等复刻样式
- 业务选项本身的选中态只控制选项容器，不控制会员图标内部视觉

**Related**: `src/views/workspace/components/ModulePanel/FreePerspectivePanel/index.vue`

## 当前开发重点

参见 `.claude/rules/project_rules.md` 中的 `<!-- SPECKIT START -->` 部分

---

**注意**: 此文件需要随项目演进持续更新
