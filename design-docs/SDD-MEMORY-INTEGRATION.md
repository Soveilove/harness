# SDD + Memory 整合方案

> 在 AI 时代，开发效率的核心是**知识复用**而非重复劳动。本方案整合 SpecKit SDD 流程与 Harness Memory，形成"需求→实现→沉淀→复用"的完整闭环。

## 一、核心理念

### 为什么需要整合？

| 痛点 | 现状 | 整合后 |
|------|------|--------|
| 每次需求从零开始 | AI 没有上下文记忆 | Memory 提供持久上下文 |
| 踩过的坑重复踩 | 知识散落在对话中 | Memory 集中沉淀经验 |
| 偏好每次重新表达 | 用户需要反复说明 | Memory 记录用户偏好 |
| 决策上下文丢失 | 只知道"做什么"不知道"为什么" | Memory 记录决策原因 |

### 两个系统的定位

```
┌─────────────────────────────────────────────────────────┐
│                      分工协作                           │
├──────────────────────┬──────────────────────────────────┤
│   SpecKit (SDD)      │   Harness Memory                 │
│   "如何做"           │   "为什么" + "经验积累"          │
├──────────────────────┼──────────────────────────────────┤
│ • spec.md (规格)     │ • user: 用户偏好                 │
│ • plan.md (计划)     │ • feedback: 踩坑经验             │
│ • tasks.md (任务)    │ • project: 项目上下文            │
│ • 代码实现           │ • reference: 重要决策            │
├──────────────────────┼──────────────────────────────────┤
│ 结构化、可执行       │ 持久化、可复用                   │
│ 单次需求生命周期     │ 跨需求、跨会话                   │
└──────────────────────┴──────────────────────────────────┘
```

## 二、Memory 结构设计

### 目录结构

```
~/.claude/projects/d--holopix-pino-front-c/memory/
├── MEMORY.md                    # 索引文件（自动加载）
│
├── user/                        # 用户画像
│   ├── preferences.md           # 编码偏好
│   ├── workflow-style.md        # 工作风格
│   └── communication.md         # 沟通方式
│
├── feedback/                    # 经验沉淀
│   ├── vue-pitfalls.md          # Vue 踩坑记录
│   ├── performance-lessons.md   # 性能优化经验
│   └── debugging-tips.md        # 调试技巧
│
├── project/                     # 项目上下文
│   ├── architecture.md          # 架构概览
│   ├── key-modules.md           # 核心模块说明
│   ├── api-patterns.md          # API 调用模式
│   └── current-focus.md         # 当前开发重点
│
└── reference/                   # 外部引用
    ├── design-decisions.md      # 重要设计决策
    ├── external-apis.md         # 外部 API 文档
    └── team-conventions.md      # 团队约定
```

### Memory 文件格式

```markdown
---
name: vue-pitfalls
description: Vue 开发中遇到的常见陷阱和解决方案
metadata:
  type: feedback
  created: 2026-06-09
  updated: 2026-06-09
  tags: [vue, debugging, pitfalls]
---

## defineProps 外部类型导入问题

**问题**: Vue compiler-sfc 无法解析 `defineProps<T>()` 中的外部类型导入

**表现**: `Failed to resolve import source`

**解决**: 类型内联定义，不在 defineProps 中导入外部类型

**Why**: Vue SFC 编译器限制

**How to apply**: 所有组件 Props 类型直接内联，复杂类型在组件内部定义

---

## 响应式数据解构丢失响应性

**问题**: 直接解构 reactive 对象会丢失响应性

**解决**: 使用 `toRefs()` 或 `toRef()` 保持响应性

**Why**: 解构操作创建了新变量，切断了与原始响应式对象的链接

**How to apply**: 需要 reactive 对象的单独属性时，使用 `toRefs()`

---

[[related: vue-best-practices]]
```

## 三、工作流整合

### 方案 A：全面整合（自动化）

在每个 SDD 阶段后自动触发 Memory 沉淀：

```
/speckit-specify          /speckit-plan           /speckit-tasks         /speckit-implement
     │                         │                       │                        │
     ▼                         ▼                       ▼                        ▼
  spec.md                   plan.md                 tasks.md                  代码
     │                         │                       │                        │
     └─────────────────────────┴───────────────────────┴────────────────────────┘
                                       │
                                       ▼
                           ┌─────────────────────┐
                           │  Memory 沉淀触发点  │
                           ├─────────────────────┤
                           │ • 需求理解偏差 → 记录偏好
                           │ • 架构决策 → 记录原因
                           │ • 踩坑修复 → 记录经验
                           │ • 性能优化 → 记录技巧
                           └─────────────────────┘
                                       │
                                       ▼
                              Harness Memory
```

### 方案 B：轻量整合（手动）

只在关键节点手动记录：

| 触发点 | Memory 类型 | 示例 |
|--------|-------------|------|
| 完成一个功能 | project | 记录模块结构、关键文件 |
| 踩坑并修复 | feedback | 记录问题、原因、解决方案 |
| 重大决策 | reference | 记录为什么选 A 不选 B |
| 用户纠正 AI | user | 记录用户偏好、习惯 |

### 方案 C：混合模式（推荐）

```
自动化沉淀（后台运行）:
├── SDD 流程中的关键决策 → 自动记录到 reference/
├── 代码审查反馈 → 自动记录到 feedback/
└── Bug 修复 → 自动记录到 feedback/

手动沉淀（按需触发）:
├── 用户主动纠正 → 用户说"记住这个"
├── 项目里程碑 → 手动总结 project/
└── 外部文档引用 → 手动添加 reference/
```

## 四、具体示例

### 示例 1：需求理解偏差 → 沉淀用户偏好

**场景**: AI 理解需求时出现偏差，用户纠正

**触发**: 用户说"不对，我想要的是..."

**沉淀**:
```markdown
---
name: user-preference-component-style
description: 用户对组件开发风格的偏好
metadata:
  type: user
---

## 组件开发偏好

**偏好**: 用户倾向于"模块化拆分 + 注册表模式"，而不是在调用方写条件分支链

**Why**: 用户认为这种方式更易扩展、更易维护

**How to apply**:
- 遇到"按类型选择实现"的需求时，优先使用 registry/策略模式
- 新增模块时，采用"新增文件 + 注册"而非"扩展条件判断"

[[constitution: II. Extensibility via Modules]]
```

### 示例 2：踩坑修复 → 沉淀经验

**场景**: 修复了一个 Vue 相关的 bug

**触发**: Bug 修复完成后

**沉淀**:
```markdown
---
name: vue-watch-effect-cleanup
description: watchEffect 清理函数的正确使用
metadata:
  type: feedback
---

## watchEffect 清理时机问题

**问题**: 在 watchEffect 中创建的定时器没有被正确清理

**原因**: 没有使用 watchEffect 的清理函数

**解决**:
```ts
watchEffect((onCleanup) => {
  const timer = setInterval(() => {}, 1000)
  onCleanup(() => clearInterval(timer))
})
```

**Why**: watchEffect 每次依赖变化都会重新执行，必须清理上一次的副作用

**How to apply**: 所有 watchEffect 中的副作用（定时器、事件监听、WebSocket）都必须在 onCleanup 中清理

[[vue-best-practices: lifecycle-hooks-synchronous-registration]]
```

### 示例 3：架构决策 → 沉淀决策原因

**场景**: 选择技术方案时做出重要决策

**触发**: 方案确定后

**沉淀**:
```markdown
---
name: decision-canvas-state-management
description: 画布状态管理方案选择
metadata:
  type: reference
---

## 画布状态管理方案决策

**决策**: 使用 Pinia + composables 混合模式

**备选方案**:
1. 纯 Pinia store
2. 纯 composables
3. Vuex (已废弃)

**选择理由**:
- Pinia: 全局共享状态（画布实例、选中对象、历史记录）
- composables: 组件级逻辑封装（事件处理、临时状态）
- 分离关注点，避免 store 臃肿

**How to apply**:
- 跨组件共享状态 → Pinia store
- 单组件/父子组件逻辑 → composables
- 副作用（API、WebSocket）→ service 层
```

## 五、最佳实践

### 1. Memory 写作原则

- **具体不抽象**: "用户喜欢 X" 而非 "用户可能喜欢某些方式"
- **带上下文**: 记录 "为什么" 和 "什么时候适用"
- **可操作**: 明确 "How to apply"
- **关联性**: 使用 `[[]]` 链接相关 Memory

### 2. 触发时机

```
应该记录 Memory 的情况:
├── ✅ 用户纠正了 AI 的理解
├── ✅ 踩坑后找到了解决方案
├── ✅ 做出了重要的技术决策
├── ✅ 发现了项目特有的模式/约定
├── ✅ 性能优化有了显著效果
└── ✅ 用户说 "记住这个"

不应该记录 Memory 的情况:
├── ❌ 通用知识（Vue 语法、TypeScript 类型）
├── ❌ 一次性临时信息
├── ❌ 已经在代码/文档中记录的信息
└── ❌ 敏感信息（密码、密钥）
```

### 3. Memory 与 Constitution 的关系

```
Constitution (宪法)          Memory (记忆)
     │                            │
     │  核心原则                  │  具体应用
     │  不可协商                  │  可演进的
     │  稳定（低频更新）          │  动态（持续积累）
     │                            │
     └────────────────────────────┘
                  │
                  ▼
         Memory 引用 Constitution
         Constitution 指导 Memory

示例:
Constitution: "II. Extensibility via Modules"
Memory: "用户偏好使用注册表模式处理多实现场景"
```

## 六、实施路线图

### Phase 1: 初始化（1天）

1. 创建 Memory 目录结构
2. 编写初始 Memory 文件：
   - `user/preferences.md` - 你的编码偏好
   - `project/architecture.md` - 项目架构概览
   - `project/current-focus.md` - 当前开发重点

### Phase 2: 试运行（1周）

1. 在下一个需求中使用 SDD 流程
2. 在关键节点手动沉淀 Memory
3. 观察效果，调整策略

### Phase 3: 优化（持续）

1. 根据使用体验优化 Memory 结构
2. 建立个人/团队的 Memory 模板
3. 定期清理过时的 Memory

## 七、预期收益

| 指标 | 当前 | 整合后 |
|------|------|--------|
| 需求理解准确率 | ~70% | ~90%+ |
| 重复踩坑次数 | 多次 | 0-1次 |
| 新需求启动时间 | 5-10min 背景 | 即时理解 |
| 代码一致性 | 依赖人工审查 | AI 自动遵循 |

---

**版本**: 1.0.0 | **创建日期**: 2026-06-09 | **作者**: Claude
