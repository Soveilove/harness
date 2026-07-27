<!-- PROJECT-SPECIFIC: 本文件内容为项目专属(pino-front)，换项目时需清空重填。见 project.yaml -->
# 近期需求 Code Map

> 目标：支撑当前首页改版与自由画布局部修改的并行小步尝试。只记录近期高频入口，不追求覆盖全仓库。

## 同步信息

| 项 | 内容 |
|---|---|
| Code Map 版本 | `2026-06-15.1` |
| 同步范围 | `.specify/codegraph/recent-work-code-map.md` |
| 使用方式 | 多个独立分支文件夹之间手动复制同步 |
| 同步策略 | 以版本号较新的文件为主；若两个文件都改过，先合并“新增入口/链路”，再提升版本号 |
| 不同步内容 | `.specify/codegraph/*.db`、`cache/`、日志、运行时文件 |

## 当前 Feature

| 项 | 内容 |
|---|---|
| 当前 feature | `specs/001-home-responsive-header` |
| feature 指针 | `.specify/feature.json` |
| 主要目标 | 首页响应式顶部栏，重点是 `1024-1279` 档短搜索框、隐藏更新日志、无横向滚动条 |
| 并行上下文 | 自由画布局部修改已在其它分支推进，本地图保留其关键入口，方便跨分支小步尝试 |

## 读取顺序

处理首页 Header 改版时：
1. `specs/001-home-responsive-header/spec.md`
2. `specs/001-home-responsive-header/plan.md`
3. `specs/001-home-responsive-header/quickstart.md`
4. `src/Layout/Header.vue`
5. `src/views/workbench/composables/useViewportBreakpoint.ts`

处理自由画布局部修改时：
1. `.specify/codegraph/board-code-map.md`
2. `src/router/modules/board.ts`
3. `src/views/workspace/board/detail/index.vue`
4. `src/views/workspace/board/detail/hooks/useBoardController.ts`
5. `src/views/workspace/board/detail/hooks/useCanvasEditor.ts`
6. `src/views/workspace/board/detail/helper/store/toolbar.ts`
7. `src/views/workspace/board/detail/components/ImageContextToolbar/`

## 首页改版入口

| 文件 | 职责 | 近期关注点 |
|---|---|---|
| `src/router/routes.ts` | 顶层路由，`/home` 指向 `workbench` | 首页真实入口、layout 类型 |
| `src/Layout/template/HomeLayout.vue` | home layout 包装层 | Header 与 Sider 的布局关系 |
| `src/Layout/Header.vue` | 顶部栏主体 | 搜索框、更新日志、通知、用户入口、VIP 入口 |
| `src/views/workbench/index.vue` | 首页页面容器 | 顶部 Banner 与首页 Tabs 的承载层 |
| `src/views/workbench/components/HomeTabs/` | 首页内容 Tabs | 首页主体改版时从这里继续深入 |
| `src/views/workbench/composables/useViewportBreakpoint.ts` | 首页断点工具 | Header 响应式逻辑的断点来源 |
| `src/components/Notices/index.vue` | 通知铃铛与通知弹层 | Header 通知入口变更时检查 |

首页 Header 数据/行为链路：

```text
/home route
  -> Layout/template/HomeLayout.vue
  -> Layout/Header.vue
      -> SearchBar
      -> HeaderEntrance
      -> VipStatus
      -> Notices
      -> UserInfo / HoverUserCard
```

当前 Header 搜索链路：

```text
SearchBar @search
  -> Header.vue handleKeyChange
  -> routeStore.searchKeyWord
  -> reportEventTracking
  -> router.push({ name: "model" })
  -> $bus.emit("catchSearch")
```

## 自由画布入口

> 自由画布已拆分为专用地图：`.specify/codegraph/board-code-map.md`。本节只保留近期总览入口，复杂链路、参数映射、局部修改和一键成稿细节统一维护在专用地图中。

| 文件 | 职责 | 近期关注点 |
|---|---|---|
| `src/router/modules/board.ts` | 自由画布路由 | `/board/all` 列表、`/board/:boardId` 详情、分享页 |
| `src/views/workspace/board/list/index.vue` | 自由画布列表页 | 创建/进入画板、列表展示 |
| `src/views/workspace/board/detail/index.vue` | 画布详情容器 | 组合画布、图库、工具栏、任务监听 |
| `src/views/workspace/board/detail/hooks/useBoardController.ts` | 画板加载控制 | 拉取画板、恢复画布、绑定监听 |
| `src/views/workspace/board/detail/hooks/useCanvasEditor.ts` | 画布编辑器 hook | Fabric 事件、自动保存、选中态、视口同步 |
| `src/views/workspace/board/detail/hooks/useCanvasTaskListener.ts` | 画布任务监听 | 生成任务结果回填画布 |
| `src/views/workspace/board/detail/components/ImageContextToolbar/` | 图片上下文工具栏 | 局部修改、重绘、扩图、视频、裂变等面板 |
| `.specify/codegraph/board-code-map.md` | 自由画布专用地图 | 复杂链路、参数流、面板细节、常见任务定位 |

自由画布详情高层链路：

```text
/board/:boardId route
  -> board/detail/index.vue
  -> useBoardController.loadBoard
  -> useCanvasEditor.bindCanvasListeners
  -> ImageContextToolbar / generationEngine / useCanvasTaskListener
```

## 常见任务定位

| 任务 | 优先入口 | 注意事项 |
|---|---|---|
| 改首页 Header 响应式 | `src/Layout/Header.vue` | 先看当前 feature 的 spec/plan，PC 档尽量不动 |
| 改首页主体模块 | `src/views/workbench/index.vue`、`HomeTabs/` | 不要误改自由画布列表页 |
| 改通知入口 | `src/components/Notices/index.vue` | 同时检查 Header 与路由设计 |
| 改自由画布列表/新建 | `src/views/workspace/board/list/` | 注意列表页和详情页是不同路由 |
| 改画布详情布局 | `board/detail/index.vue`、`uiLayoutStore.ts` | 先确认影响图库、底部栏、工具栏哪一块 |
| 改选中图片后的工具 | `ImageContextToolbar/`、`helper/imageContext/registry/` | 优先沿用注册表，不在调用方堆分支 |
| 改局部重绘/局部修改 | `ImageContextToolbar/RepaintUpscalePanel/` 或相关 Panel | 追参数、任务创建、结果回填三段链路 |
| 改任务结果回填画布 | `useCanvasTaskListener.ts`、`taskEvents.ts` | 注意自动保存、历史记录、图层 store 同步 |
| 改画布初始化/恢复 | `useBoardController.ts`、`helper/init/` | 小心竞态、多标签切换、视口同步 |
| 改一键成稿面板 UI | `DraftPanel/index.vue` | 模型选择弹窗是 FissionModelSelector（共享） |
| 改一键成稿模型过滤 | `DraftPanel/useCanvasDraft.ts` | 看 `draftModelCkptType` 和 `draftLoraTypeList`；`checkModelAvailability` 清理旧数据 |
| 改一键成稿生图参数 | `DraftPanel/useCanvasDraft.ts`、`types.ts` | UI→API 字段映射在 types.ts 注释和上方参数映射表 |
| 改模型选择弹窗过滤 | `FissionPanel/components/FissionModelSelector/index.vue` | ckptType/ckptTypeList/loraTypeList 三个 API 参数 |

## 多文件夹同步

- 不在独立工作目录之间直接复制 Code Map 或 Memory。
- 稳定内容经中枢审查和晋级后统一分发；具体边界只以 `E:\memory\SYNC.md` 为准。
- 数据库、缓存、日志、运行时文件和工程实例状态永不进入稳定分发。

## 维护边界

- 这份地图只维护近期高频入口，超过当前需求范围的模块先不展开。
- 新增复杂模块时，优先追加“入口 + 数据流 + 常见任务定位”，不要复制完整目录树。
- 自由画布复杂链路统一维护在 `.specify/codegraph/board-code-map.md`，近期地图只保留入口索引。
