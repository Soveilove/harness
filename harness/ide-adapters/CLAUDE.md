# 项目开发约束

> 本文件由 Harness 中枢自动分发，请勿在项目内手动修改。
> 修改请到 `E:\memory\harness\ide-adapters\CLAUDE.md`，然后重新分发。
> 完整宪法见 `.specify/memory/constitution.md`，完整偏好见 `.specify/memory/user-preferences.md`。

## 一、架构原则（不可违反）

1. **显式优于隐式** — 代码必须自解释，命名直接传达意图。禁止魔术值、缩写、深层嵌套。
2. **模块化扩展** — 新增按类型/模块/场景变化的实现时，用注册表或策略模式，禁止扩展条件链。
3. **架构边界清晰** — 组件只做展示和交互编排，业务逻辑下沉到 composables/services。组件接收 props、emit 事件，不直接做请求或全局副作用。
4. **稳定 API 表面** — 外部导出通过 `index.ts`/`service.ts`，内部实现可自由演进。
5. **边界类型安全** — 所有输入输出必须有 TypeScript 类型。`any` 禁止使用（除非对接无类型第三方代码）。

## 二、Vue 开发红线

1. **Props 类型必须内联定义** — `defineProps<T>()` 中不能 `import type`，Vue SFC 编译器无法解析外部类型导入。复杂类型在组件内部定义 interface。
2. **模板事件只调用封装好的语义化函数** — `@click` 中不写赋值或组合调用，用 `handleXxx()`。
3. **Composition API only** — 使用 `<script setup lang="ts">`，禁止 Options API。
4. **reactive 解构必须用 `toRefs()`** — 直接解构 reactive 对象会丢失响应性。
5. **watchEffect 副作用必须清理** — 定时器、事件监听、WebSocket 必须在 `onCleanup` 中清理。

## 三、编码偏好

1. **中文注释** — 只解释"为什么"，不翻译代码。
2. **组件薄、逻辑下沉** — 容器组件负责数据获取和模块选择，展示组件只接收 props/emit。
3. **不默认生成 barrel `index.ts`** — 单个 composable/service 默认不新增 `index.ts`，直接从具体文件 import。
4. **改动优先级**：业务逻辑改动优先于底层架构改动。Layout 布局模板不能随便改，优先在业务组件内部解决。

## 四、环境约束

1. **终端是 Git Bash** — 禁止使用 PowerShell 专属命令（`New-Item`/`Copy-Item`/`Remove-Item`/`Out-Null`）。
   - 创建目录：`mkdir -p path/to/dir`
   - 复制文件：`cp src dest`
   - 删除文件：`rm path/to/file`
2. **不默认运行全量 type-check** — 项目有历史类型错误，全量 `vue-tsc` 输出会掩盖本次改动质量。类型检查优先用文件级诊断。
3. **不默认运行 `git diff`/`git status`** — 对当前流程没有收益。
4. **不默认运行 Vitest** — 除非用户明确要求或任务必须验证。

## 五、知识加载

当任务涉及具体业务域时，先读 `.specify/` 下的知识库：

1. **入口**：`.specify/index.md` — Harness 总入口
2. **知识索引**：`.specify/memory/MEMORY.md` — 可用文件清单
3. **按需加载**：
   - Bug 修复 → `.specify/memory/vue-pitfalls.md` + `.specify/workflows/systematic-debugging.md`
   - 架构讨论 → `.specify/memory/constitution.md` + `.specify/memory/project-architecture.md`
   - 技术决策 → `.specify/memory/design-decisions.md`
   - 实现任务 → `.specify/spec-harness/implementation-rules.md`
   - 代码导航 → `.specify/codegraph/` 下对应地图

宁可多读，不要漏读。加载知识后简要说明用了哪些来源，然后继续任务。
