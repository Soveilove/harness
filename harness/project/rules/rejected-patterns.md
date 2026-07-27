<!-- PROJECT-SPECIFIC: 本文件内容为项目专属(pino-front)，换项目时需清空重填。见 project.yaml -->
# 失败模式 / 负反馈记录（Rejected Patterns）

> 记录 AI 或人在开发过程中做错的事情、修复方案和事后提炼的规则。
> 这是规则库的原料。每一条都应导向 implementation-rules.md 或 pending-rules.md 的更新。

## 记录模板

```markdown
### RP-XXX: 失败标题

- **发生时间**: YYYY-MM-DD
- **相关 spec**: `specs/<feature>/`
- **相关能力**: （business-map 条目）
- **问题描述**: AI/人做了什么错误决策
- **影响**: 产生了什么 bug 或返工
- **修复方案**: 最终怎么改的
- **提炼规则**: 对应 `implementation-rules.md#R-XXX` 或 `pending-rules.md#P-XXX`
- **验证方式**: 以后如何避免同样错误
```

## 失败记录

### RP-001: 公共组件内部状态被多入口绕过 + 外部 watch 破坏性修改共享状态

- **发生时间**: 2026-06-30
- **相关 spec**: 无（线上缺陷修复）
- **相关能力**: AI 创作自由视角（FreePerspectivePanel）/ OriginalManuscript 公共组件
- **问题描述**: 
  1. `FreePerspectivePanel` 给 `OriginalManuscript` 传 module=60（QWEN_FREE_PERSPECTIVE_MODULE_ID），但路由 name 是 `'freePerspective'`（对应 module 33），导致 `OriginalManuscript` 的 `route.query watch` 匹配失败，`handleImageSelect` 不被调用，内部状态 `originImgSrc`/`curPngBg` 不同步。
  2. `FreePerspectivePanel` 的 `watch(layoutRefer.image)` 调用 `ensureOpaqueImage` 直接破坏性修改 `layoutRefer.image`（透明图填白变不透明），先于 `route.query watch` 执行，导致原始透明图丢失。
- **影响**: 上传透明图→切黑底→创作记录"一键抠图结果"用作参考图→变白→点切换黑色背景按钮变成"原来的图片"（最初上传图的背景版）。
- **修复方案**: 
  1. `OriginalManuscript` 的 `:module` 从 60 改为 33（`FREE_PERSPECTIVE_STORE_MODULE_ID`），匹配路由 name。
  2. 移除 `watch(layoutRefer.image)` 的 `ensureOpaqueImage` 直接改 image 逻辑，透明背景处理收敛为三入口（上传/用作参考图走 `handleImageSelect`，编辑复用走 `handleGenerate` 兜底）。
- **提炼规则**: 对应 `implementation-rules.md#R-006`（staging）
- **验证方式**: 
  - 检查所有使用 `OriginalManuscript` 的面板，传入的 `module` 是否与路由 name 对应的 module 一致。
  - 检查是否有外部 watch 直接修改 `layoutRefer.image` 等 `OriginalManuscript` 依赖的共享数据。
  - 复现场景：上传透明图→切背景→用作参考图→切背景，确认切换按钮始终用当前图填背景。

