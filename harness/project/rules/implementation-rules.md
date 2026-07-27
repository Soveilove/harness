<!-- PROJECT-SPECIFIC: 本文件内容为项目专属(pino-front)，换项目时需清空重填。见 project.yaml -->
# 开发规则库（Spec Harness Rules）

> 通用实现规则库，适用于所有 specs 的实现阶段。
> 规则必须具体、可执行、可验证。避免空泛口号。
> 规则状态：stable（已验证）/ staging（观察中）/ deprecated（已废弃）。

## 规则模板

```markdown
### R-XXX: 规则标题

- **状态**: stable / staging / deprecated
- **来源**: `specs/<feature>/` 或 `business-map.md` 某条目
- **触发场景**: 什么情况下这条规则必须生效
- **具体要求**: 必须做什么、禁止做什么
- **常见错误**: 不遵守时 AI/人通常会怎么错
- **验证方式**: 代码审查或运行时如何检查这条规则
- **相关文件**: 典型会涉及的文件/目录
```

## Stable 规则（已验证，开发前必须读）

### R-001: 视频模型切换必须同步 `videoModelKey` 与 `model` ref

- **状态**: stable
- **来源**: `specs/106-seedance-text2video`
- **触发场景**: 任何修改视频模型的地方（弹窗选择、fillParams、URL query 解析等）
- **具体要求**: `videoModelKey` 变更后必须同步 `model.value = getVideoApiModelName(videoModelKey)`；展示名映射必须走 `modelLabel.ts`。
- **常见错误**: 只改 `videoModelKey` 不改 `model`，导致后端提交和前端展示不一致。
- **验证方式**: 全局搜索 `videoModelKey` 的赋值点，检查下一行是否有 `model.value` 同步。
- **相关文件**: `useCanvasVideo.ts`、`task.ts`、`ImageDetails/index.vue`

### R-002: 视频生成必须透传 `inputVideoDuration`

- **状态**: stable
- **来源**: `specs/106-seedance-text2video`
- **触发场景**: 构建任何视频后端请求参数（面板生成、底部栏生成、再次生成、重编辑）
- **具体要求**: 所有构建视频 payload 的函数必须检查是否携带 `inputVideoDuration`，Seedance 服务端需要它计算算力积分。
- **常见错误**: 新增视频路径时遗漏透传，导致 Seedance 算力计算错误。
- **验证方式**: 检查 `buildCanvasVideoPanelPayload`、`buildCanvasVideoGenerateParams` 等函数的返回字段。
- **相关文件**: `helper/video/task.ts`、`useCanvasVideo.ts`、`AdvancedHeroActions.vue`

### R-003: 新增模型/模式时必须同步更新配置和展示名映射

- **状态**: stable
- **来源**: `specs/106-seedance-text2video`
- **触发场景**: 新增视频模型或视频模式
- **具体要求**: 同时更新 `videoGenerationConfig.ts` 的 `VIDEO_MODEL_KEY_TO_API_MODEL` + `getVideoApiModelName`，以及 `modelLabel.ts` 的 `resolveVideoModelLabel`。
- **常见错误**: 只加了 API model，没加展示名映射，导致详情弹窗显示错误。
- **验证方式**: 全局搜索模型 key，确认 3 处都有映射。
- **相关文件**: `videoGenerationConfig.ts`、`modelLabel.ts`

### R-004: 模块 ID/权益口径必须以上游依赖包为唯一来源

- **状态**: stable
- **来源**: `.specify/memory/design-decisions.md` ADR-004
- **触发场景**: 需要用到模块 ID、枚举、权益计算函数时
- **具体要求**: 优先使用 `@xmiles/holopix-types` / `@xmiles/holopix-helper` 的导出；缺少时先升级依赖包，不新增本地兜底常量。
- **常见错误**: 在业务代码里写 `MODULE_ID_XXX = number` 或本地算力公式，导致与后端/其他端口径不一致。
- **验证方式**: 检查新增常量是否出现在 `src/` 内而非来自依赖包；检查 import 来源。
- **相关文件**: `src/constants/`、`src/config/`、各 Panel 文件

### R-005: 按类型分派的逻辑优先用注册表模式，不用条件分支链

- **状态**: stable
- **来源**: `.specify/memory/design-decisions.md` ADR-001
- **触发场景**: 新增一种面板/工具/生成模式/模型时
- **具体要求**: 创建独立模块文件并注册到注册表，调用方通过注册表解析，不扩展 `if/else` 或 `switch` 分支。
- **常见错误**: 在现有组件里加 `if (model === 'vidu') { ... } else if (model === 'seedance') { ... }`。
- **验证方式**: 审查新增功能时，确认没有新增长条件分支，而是通过注册表新增映射。
- **相关文件**: 各 `registry.ts`、`modules/` 目录

### R-006: 视频质量选项必须与图片质量选项独立维护

- **状态**: stable
- **来源**: `specs/017-video-quality-decouple`
- **触发场景**: 任何修改视频质量选项、质量→分辨率映射、或新增视频质量档位时
- **具体要求**:
  1. **类型分离**: 视频模块使用 `VideoQuality`（`"480p" | "720p" | "1080p"`），图片模块使用 `ImageQuality`（`"1K" | "2K" | "4K" | "smart"`），不混用。视频质量 value 必须与 label 一致（`"720p"` → "720p"），禁止 value 为 `"1K"` 而 label 为 `"720p"` 的隐式映射。
  2. **模型差异约束**: Vidu 不支持 480p，其 `qualityOptions` 必须从 `VIDEO_QUALITY_OPTIONS` 中过滤掉 `"480p"`（即使用 `VIDU_QUALITY_OPTIONS = VIDEO_QUALITY_OPTIONS.filter(v => v.value !== "480p")`）。Seedance 支持全部三档。
  3. **单一映射函数**: 所有 `quality → 数值分辨率` 的转换必须通过 `videoGenerationConfig.ts` 导出的 `videoQualityToResolution(quality: VideoQuality): number` 统一函数，禁止在多处内联重复映射常量。
  4. **全入口覆盖**: 新增/修改质量档位时，必须同步检查所有 6 个消费点：底部输入框（`detail/index.vue`）、视频面板（`useCanvasVideo.ts`）、画布拖拽（`useGenerateParamsBuilder.ts`）、再次生成/重编辑（`task.ts` 的 `normalizeCanvasVideoResolution` + `normalizeVideoResolution`）、详情弹窗展示（`ImageDetails/index.vue` 的 `parseVideoResolutionBase`）、算力计算器（`seedancePowerCalculator.ts` / `viduPowerCalculator.ts`）。
  5. **后端接口不变**: 后端 `videoResolution` 字段保持数值型（480/720/1080）。
- **常见错误**:
  - 在 `useGenerateParamsBuilder.ts` 等入口遗漏新增质量档位，导致 fallback 到默认值（如 480p fallback 到 720）。
  - 在详情弹窗的 `parseVideoResolutionBase` 缺少某档位的显式分支，虽然 Number 兜底能解析但不对称。
  - 视频质量 value 借用图片概念（`"1K"`），导致每个提交入口都要做一次映射转换。
- **验证方式**:
  - 全局搜索 `quality → 数值` 映射，确认只有 `videoQualityToResolution` 1 处定义。
  - 搜索 `videoResolution` 字段的所有使用点，确认 6 个消费点都支持全部质量档位。
  - 搜索 `"1K"` / `"2K"` 确认不在视频模块代码中出现（图片模块不受影响）。
- **相关文件**: `videoGenerationConfig.ts`、`generationConfig.ts`、`seedancePowerCalculator.ts`、`viduPowerCalculator.ts`、`detail/index.vue`、`task.ts`、`useGenerateParamsBuilder.ts`、`ImageDetails/index.vue`、`useCanvasVideo.ts`

## Staging 规则（观察中，需更多案例验证）

> 从 rejected-patterns.md 中毕业而来，或从单 feature 提炼但尚未见多场景。
> 达到 3 次有效命中且无严重误报后提升为 stable。

### R-006: 公共组件内部状态的多入口同步与外部 watch 禁止破坏性修改

- **状态**: staging
- **来源**: `rejected-patterns.md#RP-001`（2026-06-30 透明背景切换 bug）
- **触发场景**: 使用 `OriginalManuscript` 等内部维护非受控状态的公共组件时；外部 watch 修改组件依赖的共享数据时
- **具体要求**:
  1. **module ID 与路由 name 一致**：传给公共组件的 `module` prop 必须与路由 name 对应的 module ID 一致，否则基于 `getModuleRouteKeyById` 的路由匹配会失败。`FreePerspectivePanel` 路由 name `'freePerspective'` 对应 module 33，传给 `OriginalManuscript` 必须用 `FREE_PERSPECTIVE_STORE_MODULE_ID`(33)。
  2. **多入口走统一 handler**：公共组件若内部维护非受控状态（如 `originImgSrc`/`curPngBg`），所有修改该组件依赖的共享数据的入口，都必须走该组件的 handler（如 `handleImageSelect`），不能在外部直接赋值后指望组件自动同步。
  3. **禁止外部 watch 破坏性修改共享数据**：外部 watch 不应直接修改组件依赖的共享数据（如 `layoutRefer.image`）导致原始数据不可逆丢失。透明背景填充等不可逆操作应放在组件 handler 内部（保留原始图），或在生成提交时兜底。
- **常见错误**: 
  - 传 module 60 给 `OriginalManuscript`，但路由是 `'freePerspective'`（module 33），导致 `route.query watch` 不触发。
  - 外部 watch 先于组件 handler 执行，把透明图填白变不透明，组件 handler 收到不透明图，原始透明图丢失。
- **验证方式**: 
  - 全局搜索 `OriginalManuscript` 使用处，检查 `:module` 是否与路由 name 对应。
  - 检查是否有外部 watch 直接修改 `layoutRefer.image`，若有需确认是否破坏性。
- **相关文件**: `FreePerspectivePanel/index.vue`、`OriginalManuscript.vue`、`hooks/common.ts`（useInference）

## Deprecated 规则（已废弃，保留历史）

> 曾经生效但因技术栈或业务变更不再适用。保留条目和废弃原因，避免误重新启用。

（待补充）
