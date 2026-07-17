---
name: design-decisions
description: 重要的架构决策记录
metadata: 
  node_type: memory
  type: reference
  created: 2026-06-09
  originSessionId: 666b2e67-d2d9-466e-92c1-bcc0931c534e
---

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

**更新规则**: 新增重要决策时添加 ADR 条目
