---
name: design-decisions
description: 重要的架构决策记录
metadata: 
  node_type: memory
  type: reference
  created: 2026-06-09
  originSessionId: 666b2e67-d2d9-466e-92c1-bcc0931c534e
---
<!-- PROJECT-SPECIFIC: 本文件内容为项目专属(pino-front)，换项目时需清空重填。见 project.yaml -->


## ADR-001: 模块化拆分 + 注册表模式

**日期**: 2026-05-12

**状态**: 已采纳

**背景**: 项目中存在大量"按类型选择不同实现"的场景

**决策**: 使用注册表模式替代条件分支链

**理由**:
1. 新增模块时只需注册，无需修改调度逻辑
2. 每个变体独立、可测试、可独立演进
3. 符合开闭原则

**影响**:
- 目录结构：每个业务域新增 `modules/` 子目录
- 新增功能：创建新模块文件 + 注册映射

**示例**:
```ts
// registry.ts
const registry: Record<ModuleKey, Loader> = {};

export function register(key: ModuleKey, loader: Loader) {
  registry[key] = loader;
}

export function resolve(key?: ModuleKey, fallback?: Component): Component {
  if (key != null && registry[key]) {
    return defineAsyncComponent(registry[key]);
  }
  return fallback;
}
```

---

## ADR-002: 画布状态管理方案

**日期**: 待补充

**状态**: 已采纳

**背景**: 画布状态需要在多个组件间共享

**决策**: Pinia + composables 混合模式

**理由**:
- Pinia: 全局共享状态（画布实例、选中对象、历史记录）
- composables: 组件级逻辑封装（事件处理、临时状态）
- 分离关注点，避免 store 臃肿

**影响**:
- 跨组件共享状态 → Pinia store
- 单组件/父子组件逻辑 → composables
- 副作用（API、WebSocket）→ service 层

---

## ADR-003: SDD + Memory 整合

**日期**: 2026-06-09

**状态**: 试运行

**背景**: AI 开发效率需要知识复用而非重复劳动

**决策**: SpecKit SDD 流程 + Harness Memory 双轮驱动

**理由**:
1. SDD 提供结构化开发流程
2. Memory 提供持久化知识沉淀
3. 形成需求→实现→沉淀→复用闭环

**影响**:
- 新需求：走 SDD 流程
- 关键节点：沉淀到 Memory
- 后续需求：复用 Memory 知识

---

## ADR-004: 依赖包常量优先，禁止本地临时兜底

**日期**: 2026-06-17

**状态**: 已采纳

**背景**: 业务模块依赖 `@xmiles/holopix-types`、`@xmiles/holopix-helper` 等包提供模块 ID、枚举与算力计算函数。如果依赖包缺少导出而在业务代码中临时写本地常量，会造成多处口径不一致，后续依赖升级时也容易遗漏清理。

**决策**: 当依赖包缺少当前功能需要的常量、枚举或 helper 函数时，不允许新增本地临时常量兜底，必须先升级依赖包并使用上游正式导出。

**理由**:
1. 模块 ID、权益口径和算力计算属于跨端/跨模块协议，必须以依赖包为唯一来源
2. 避免本地硬编码与后端、自由画布、一键成稿等链路产生分叉
3. 依赖升级后 TypeScript 能提供统一约束和自动补全

**影响**:
- 新功能接入前必须检查依赖包是否已导出所需常量
- 若缺少导出，先暂停实现并提示升级依赖包
- 不新增 `MODULE_ID_XXX = number` 这类本地兜底常量

---

## ADR-005: 面板生图占位符紧邻参考图 — canvas_trigger 白名单机制

**日期**: 2026-06-23

**状态**: 已采纳

**背景**: 自由画布各面板（万能渲染、局部修改、扩图等）生图时，占位符默认按"满 6 换行 + 右下角参考点"放置，不保证紧邻参考图。测试反馈局部修改的占位符离参考图太远。

**决策**: 每个面板使用独立的 `canvas_trigger`，注册到 `CANVAS_PANEL_INLINE_LAYOUT_TRIGGERS` 白名单后，占位符走 `insertImmediatelyAfterAnchor` 模式，紧邻锚定图右侧插入。

**理由**:
1. 复用其他面板的 trigger（如局部修改复用扩图的 `visual_expansion`）在"再次生成"路径会丢失，因为再次生成的 source 不同
2. 独立 trigger 让所有路径（面板提交、画布再次生成、创作记录再次生成）行为一致
3. 白名单机制是注册表模式，新增面板只需注册，不改调度逻辑

**影响**:
- 新增面板需在 3 处注册：`GenerationSource` 类型、`SOURCE_TO_TRIGGER` 映射、`CANVAS_PANEL_INLINE_LAYOUT_TRIGGERS` 白名单
- 锚定 cid 解析顺序需按面板优先级排列（局部修改 `_inpaintTargetCid` 优先于扩图 `_outpaintTargetCid`）
- 新增面板时沿用本 ADR 的插入位置与兼容约束，并以当前代码链路重新验证。

**关键文件**:
- `domain/generation/types.ts` — `GenerationSource` 联合类型
- `domain/generation/tracking.ts` — `SOURCE_TO_TRIGGER` source → trigger 映射
- `helper/layoutManager.ts` — `CANVAS_PANEL_INLINE_LAYOUT_TRIGGERS` 白名单
- `hooks/useCanvasTaskListener.ts` — 锚定 cid 解析顺序

---

## ADR-006: V2 全面增强模型判断必须用正向匹配 A1

**日期**: 2026-06-23

**状态**: 已采纳

**背景**: 一键成稿 V2「全面增强」三合一功能（`goWorkFlowV2`）原意是仅对 A1 模型启用，但代码中用 `!isFlux`（反向排除 Flux）作为判断条件，导致 Pony、SDXL、Animagine 等其他非 Flux 基础模型也错误走了 V2 逻辑。

**决策**: 所有 V2 全面增强相关的模型判断必须用正向匹配 `ckptType === "A1"`，禁止用 `!isFlux` 反向排除。

**理由**:
1. 模型类型有多种（Flux/A1/Pony/SDXL/Animagine），"排除 Flux"≠"仅 A1"
2. 反向排除会在未来新增基础模型时静默扩大 V2 生效范围
3. 正向匹配 `=== "A1"` 精确限定，新增模型默认不生效，符合最小惊讶原则

**影响**:
- V2 全面增强的判断点分布在 6 个文件共 8 处，修改时需同步检查
- 新增 V2 相关判断点时，必须用 `ckptType === "A1"` 正向匹配
- 详细踩坑记录见 `vue-pitfalls.md`「一键成稿 V2「全面增强」模型判断条件必须用正向匹配 A1」

**受影响的文件**:
- `src/views/workspace/components/ModulePanel/ExplorePanel.vue`
- `src/assets/artwork/module/explore.ts`
- `src/store/artwork/index.ts`
- `src/assets/artwork/vipPackageHandle.ts`
- `src/views/workspace/hooks/index.ts`
- `src/components/Image/ImageDetails/components/ImageInfo/modules/DefaultInfo.vue`

---

## ADR-007: 我的资产框选用左键拖拽，不用右键长按（Mac 兼容）

**日期**: 2026-06-29

**状态**: 已采纳

**背景**: 「我的资产」批量框选最早（commit 6eb5a6f30 之前）采用"右键长按拖拽"触发（`e.button === 2`），松开右键时用 `justDragged` 标志拦截 contextmenu。后续在 macOS 上发现右键框选不可靠，2026-04 重构（6eb5a6f30「重构框选功能为业界标准方案」）改为左键拖拽框选。虚拟滚动重构（5b29e46cc）延续了左键方案。曾被误判为"虚拟滚动导致右键框选失效"，实为 4 月就已变更的交互方式。

**决策**: 框选统一用**左键拖拽**触发（`e.button === 0`），右键仅用于弹出单卡片右键菜单，不参与框选。

**理由**:
1. macOS 右键存在系统级缺陷：触控板"双指点按 / Control+单击"会立即派发 contextmenu，系统/浏览器抢占式弹出右键菜单，"右键按住拖动"难以被网页稳定捕获
2. 部分鼠标/触控板在 mac 上右键 mousedown 与 mouseup 之间不持续派发 mousemove，"右键长按拖拽"在 Mac 上根本拖不动
3. 对齐业界标准：Google Photos、百度网盘等均为左键框选

**影响**:
- `BatchSelectionOverlay.vue` 的 `handleMouseDown`/`handleDocumentMouseUp` 均以 `e.button !== 0` 守卫
- `handleContextMenu` 留空（不再拦截拖拽后 contextmenu），右键 contextmenu 交还浏览器/父组件
- `useBatchSelection.ts` 中 `justDragged` / `checkAndResetJustDragged` 机制对左键框选已无实际作用，属遗留 API，暂保留不删
- 若产品要求恢复右键框选，需评估并接受 Mac 端系统级限制

**关键文件**:
- `src/views/space/components/BatchSelectionOverlay.vue` — 框选触发与命中（文件头注释记录原因）
- `src/views/space/composables/useBatchSelection.ts` — 框选状态机

---

**更新规则**: 新增重要决策时添加 ADR 条目
