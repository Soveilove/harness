# Pino Front — 中枢 Harness 记忆索引

> 本目录只保存经过审查、可跨工程复用的稳定知识。工程分支中的候选内容不得整目录合并到这里；必须先验证、提炼并人工晋级，再由中枢分发。
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
- `../workflows/sovei/workflow.yaml` — Sovei 1.1 全阶段状态图与 Artifact 契约
- 项目根 `.agents/skills/sovei-workflow/SKILL.md` — Codex 显式工作流入口

## 同步约定

- `E:\memory\harness` 是稳定发布源，不是工程副本的自动 merge 目标。
- 工程改进必须经验证和人工提炼后，才能晋级为中枢稳定知识。
- 分发时保护各工程的 `.specify/feature.json`、`specs/`、`index.md` 自标识与工程独有文件。
- **AGENTS.md / CLAUDE.md**：纳入 Git 版本管理时，同步操作**不要**将其加入 .gitignore 或从版本库移除。
- 具体操作只以中枢根目录 `SYNC.md` 为准。
