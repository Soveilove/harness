# Pino Front — 中枢 Harness 记忆索引

> 所有 `.specify/memory/` 文件都是合并产物，与中枢 `E:\memory\harness` 保持一致。各工程（A/B/C）的改进先 merge 到这里，再由这里分发到全部工程。
> **注意**：`AGENTS.md` 和 `CLAUDE.md` 纳入版本管理时，同步时不要处理这两个文件。

## 通用记忆

- [用户偏好](user-preferences.md) — 编码习惯、交互偏好、工程约束
- [Vue 踩坑](vue-pitfalls.md) — Vue/SFC/响应式/组件相关经验
- [开发宪法](constitution.md) — 核心开发原则
- [设计工具](design-tools.md) — 设计工具与 MCP 偏好
- [Figma 配置](figma-config.md) — Figma MCP 配置

## 项目记忆

- [项目架构](project-architecture.md) — 模块结构与核心入口
- [设计决策](design-decisions.md) — ADR 架构决策记录
- [图片详情加载优化](image-details-loading-optimization.md) — 详情页图片加载优化记录
- [画布生成按钮复用规范](canvas-generate-button-reuse.md) — GenerateButton 组件复用
- [画布分享详情弹窗](canvas-share-detail-modal.md) — 分享详情弹窗组件文档

## Skills（本地可复用能力）

- [添加画布模块面板](skills/add-canvas-module-panel/SKILL.md)
- [画布视频面板](skills/canvas-video-panel/SKILL.md)

## 配套 Harness 文件

- `../spec-harness/implementation-rules.md` — 正式规则库
- `../spec-harness/pending-rules.md` — 候选规则池
- `../spec-harness/rejected-patterns.md` — 失败模式记录
- `../spec-harness/failure-taxonomy.md` — 失败分类
- `../codegraph/index.md` — 代码地图索引

## 设计文档（中枢专属，不分发）

架构设计文档在中枢统一存放，不复制到项目 `.specify/memory/`：
- `E:\memory\design-docs\CROSS_IDE_MEMORY_SOLUTION.md` — 跨 IDE Memory 共享方案
- `E:\memory\design-docs\SDD-MEMORY-INTEGRATION.md` — SDD + Memory 集成指南

## 同步约定

- `E:\memory\harness` 是中央 merge 中转站（各工程改进 merge 到这里，再分发回各工程）。
- 分发时保护各工程的 `.specify/feature.json`、`specs/`、`index.md` 自标识与工程独有文件。
- **AGENTS.md / CLAUDE.md**：纳入 Git 版本管理时，同步操作**不要**将其加入 .gitignore 或从版本库移除。
