# Pino Front — 项目记忆索引（中转站副本）

> 所有 `.specify/memory/` 文件都是合并产物，与中枢 `E:\memory\` 保持一致。
> **注意**：`AGENTS.md` 和 `CLAUDE.md` 纳入版本管理时，同步时不要处理这两个文件。

## 记忆文件
- [用户编码偏好](user-preferences.md) — 模块化风格、组件开发习惯、注释风格
- [Vue 踩坑记录](vue-pitfalls.md) — defineProps、响应式解构、line-clamp、IntersectionObserver 等
- [项目宪法](constitution.md) — 显式优于隐式、模块化扩展、架构边界等核心原则
- [设计工具配置](design-tools.md) — Figma 使用偏好
- [Figma MCP 配置](figma-config.md) — MCP 接入方式
- [项目架构](project-architecture.md) — 模块结构与核心入口
- [设计决策](design-decisions.md) — ADR 架构决策记录
- [自由画布生成按钮复用](canvas-generate-button-reuse.md) — 功能面板统一使用 GenerateButton 组件
- [自由画布作品详情弹窗](canvas-share-detail-modal.md) — 跨 module 详情弹窗字段映射与局部修改坑点
- [图片详情加载优化](image-details-loading-optimization.md) — 详情页图片加载优化记录

## Skills（本地可复用能力）
- [添加画布模块面板](skills/add-canvas-module-panel/SKILL.md)
- [画布视频面板](skills/canvas-video-panel/SKILL.md)

## Spec Harness（正式规则库）
- `../spec-harness/implementation-rules.md` — 正式规则库
- `../spec-harness/pending-rules.md` — 候选规则池
- `../spec-harness/rejected-patterns.md` — 失败模式记录
- `../spec-harness/failure-taxonomy.md` — 失败分类

## 设计文档（中枢专属，不分发）
架构设计文档在中枢统一存放，不复制到项目 `.specify/memory/`：
- `E:\memory\design-docs\CROSS_IDE_MEMORY_SOLUTION.md` — 跨 IDE Memory 共享方案
- `E:\memory\design-docs\SDD-MEMORY-INTEGRATION.md` — SDD + Memory 集成指南

## 同步例外规则
- **AGENTS.md / CLAUDE.md**：纳入 Git 版本管理时，同步操作**不要**将其加入 .gitignore 或从版本库移除。
