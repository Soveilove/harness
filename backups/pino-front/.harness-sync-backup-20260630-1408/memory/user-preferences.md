---
name: user-preferences
description: 用户的编码偏好和开发风格
metadata: 
  node_type: memory
  type: user
  created: 2026-06-09
  originSessionId: 666b2e67-d2d9-466e-92c1-bcc0931c534e
---

## 模块化风格

**偏好**: "模块化拆分 + 注册表/策略模式"

**Why**: 宁可多写结构化代码，也不要把复杂逻辑堆在一个文件里靠大量 if/switch 维持

**How to apply**:
- 遇到"按类型/模块/场景选择不同实现"的需求时，使用 registry/策略模式
- 新增模块时，采用"新增文件 + 注册映射"而非"扩展条件判断"

[[constitution: II. Extensibility via Modules]]

---

## 组件开发偏好

**偏好**: 组件薄、逻辑下沉

**Why**: 组件只做展示与交互编排，业务逻辑下沉到 composables/services

**How to apply**:
- 容器组件：负责数据获取、状态组合、模块选择
- 展示组件：只接收 props/emit，不直接做请求/全局副作用
- 复杂交互：优先写 `useXxx` composable

[[constitution: III. Clear Architectural Boundaries]]

---

## Vue 开发习惯

**偏好**: Vue 3 + TypeScript + Composition API

**How to apply**:
- 使用 `<script setup lang="ts">`
- Props 类型使用 `interface Props + withDefaults(defineProps<Props>(), ...)` 定义，保持可读性与项目现有风格一致
- 使用 `ref`、`computed`、`watch`，避免 Options API

---

## Vue 模板事件偏好

**偏好**: 模板事件只调用脚本中封装好的语义化函数，不在 template 中写赋值、组合调用或业务处理逻辑。

**Why**: 保持模板只负责结构和事件绑定，交互逻辑集中在 `<script setup>` 中，便于类型收口、复用和后续维护。

**How to apply**:
- `@click` 等事件中使用 `handleXxx(...)`，不要写 `foo = value; handleBar()` 这类内联逻辑
- 需要更新状态并埋点时，在脚本中封装独立 handler
- 事件参数需要类型约束时，通过 handler 参数类型收窄，而不是依赖模板推断

---

## 注释风格

**偏好**: 注释用于解释"非显而易见的信息"，且使用中文注释

**Why**: 中文注释对团队更友好，降低阅读理解成本

**How to apply**:
- 生成的代码需要加入适当的中文注释
- 关键业务规则：记录"为什么这样做"
- 非直观实现：记录权衡、绕路、Hack 的原因
- 副作用与边界：记录影响范围、清理时机

**不需要注释**:
- 翻译代码的注释（`i++ // 自增`）
- Vue/TS 语法本身的解释

[[constitution: VIII. Document Non-Obvious Decisions]]

---

## 聚合 index 文件偏好

**偏好**: 不默认生成只做 re-export 的聚合 `index.ts` 文件，尤其是目录内当前只有一个实现文件、没有稳定多入口公共 API 时。

**Why**: 单纯 barrel 文件会增加文件数量和跳转层级，但没有明显降低复杂度；在小模块或早期阶段，直接从具体文件 import 更清晰。

**How to apply**:
- 只有当目录内存在多个稳定公共导出、外部调用方很多、或需要隐藏内部文件结构时，才考虑 barrel
- 单个 composable / 单个 service 默认不新增 `index.ts`
- 如果 spec/task 要求稳定入口，也优先评估是否真的有消费者收益，再说明取舍

[[constitution: IV. Stable API Surface]]

---

## 验证与终端命令偏好

**偏好**: 当前仓库终端按 Git Bash 环境处理；**严禁使用 PowerShell 专属命令**（如 `New-Item`、`Copy-Item`、`Out-Null`、`Remove-Item` 等）；所有 RunCommand 必须使用 gitbash/POSIX 兼容语法。验证只约束本次改动文件，避免被仓库既有全量类型错误干扰；不进行 git diff 等轻量级检查；不执行 `vue-tsc`，除非用户明确提出需要。

**Why**: Trae 终端实际执行环境是 Git Bash，PowerShell 命令会直接报错（`command not found`）导致操作失败；项目内已有较多历史 TypeScript 错误，全量 `type-check` / `vue-tsc` 输出会掩盖本次改动质量；Speckit 通用模板中的 Docker 检查对当前项目没有收益；git diff 等轻量级检查对当前开发流程没有收益。

**How to apply**:
- **创建目录**：`mkdir -p path/to/dir`（不是 `New-Item -ItemType Directory`）
- **复制文件**：`cp src/file dest/file`（不是 `Copy-Item`）
- **删除文件**：`rm path/to/file`（不是 `Remove-Item`）
- **静默输出**：`cmd 2>/dev/null` 或 `cmd > /dev/null 2>&1`（不是 `| Out-Null`）
- 不默认运行 Vitest，除非用户明确要求或任务必须验证测试运行
- 不默认运行项目级 `npm run type-check` / `pnpm type-check` / `vue-tsc`，除非用户明确要求
- 类型检查优先使用文件级诊断，或只针对本次新增/修改文件做轻量验证
- 不为 Speckit 通用流程额外搜索 `Dockerfile*` 或处理 Docker ignore，除非任务明确涉及 Docker
- 不默认运行 `git diff`、`git status` 等轻量级检查命令

[[debugging-tips]]

---

## 改动优先级原则

**偏好**: 业务逻辑代码改动优先于底层架构改动；Layout 布局模板不能随便改动

**Why**: Layout 是全局基础架构，改动影响面大，可能波及所有使用该 Layout 的页面；业务问题应优先在业务组件自身内解决

**How to apply**:
- 遇到滚动/布局问题时，优先在业务组件内部处理（如加 `overflow-y: auto`、`min-height: 0`），而非修改 Layout 模板
- Layout 模板只有在确认所有使用方都需要相同改动时才考虑修改
- 修改 Layout 前必须评估影响范围，列出所有使用该 Layout 的页面

---

## 沟通风格

**偏好**: 简洁、直接、可操作

**How to apply**:
- 先说结论，再说原因
- 提供具体文件路径和代码示例
- 有明确推荐时直接给出推荐，不列举所有选项

---

## Skills 文件夹使用边界

**偏好**: `skills/` 文件夹只放正式的可复用 skill（会被 `update-agents-skills.js` 扫描注册到 AGENTS.md）；个人调试参考文档不要放到 `skills/` 下。

**Why**: skills 文件夹的内容会被自动扫描注册到 AGENTS.md 的 skills 列表，个人参考文档放进去会污染 skill 索引，且不是面向团队复用的正式能力。

**How to apply**:
- 个人调试/参考类文档写到 `.specify/memory/` 记忆文件或 code map 中，不新建 `skills/<name>/SKILL.md`
- 只有确认是团队级可复用能力、需要被其他开发者/agent 通过 `npx openskills read` 加载时，才放到 `skills/` 下
- 误放后删除 `skills/<name>/` 目录并重新运行 `node scripts/update-agents-skills.js` 同步 AGENTS.md
