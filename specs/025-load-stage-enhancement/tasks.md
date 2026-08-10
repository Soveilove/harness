# 任务清单：load 阶段增强

> Feature：025-load-stage-enhancement

## 任务

- [ ] TASK-001: TASK_TYPE_MAP['general'] 增加 code-map 和 rule
  - 文件：`packages/sovei-core/src/knowledge/store.ts`
  - 变更：`'general': ['constitution', 'preference', 'architecture']` → `['constitution', 'preference', 'architecture', 'code-map', 'rule']`
  - 验收：loadByTaskType('general') 后 getLoadedSources() 包含 knowledge/code-map.json 和 knowledge/rule.json
  - 阻塞：无

- [ ] TASK-002: loadStage 增加 producesArtifacts + postExecute + prompt 探索方法论
  - 文件：`packages/sovei-core/src/stages/index.ts`
  - 变更：
    1. `producesArtifacts: []` → `['load-summary.md']`
    2. 新增 postExecute 钩子（校验 workflow-state 一致性）
    3. prompt 增加探索方法论（现状探索 + 风险识别）
  - 验收：
    - stageRegistry.get('load').contract.producesArtifacts 包含 'load-summary.md'
    - loadStage.postExecute 存在且正常执行
    - prompt 包含「探索」「风险」「现状」关键词
  - 阻塞：无

- [ ] TASK-003: grillStage requiredArtifacts 增加 load-summary.md
  - 文件：`packages/sovei-core/src/stages/index.ts`
  - 变更：`requiredArtifacts: []` → `['load-summary.md']`
  - 验收：stageRegistry.get('grill').contract.requiredArtifacts 包含 'load-summary.md'
  - 阻塞：无

- [ ] TASK-004: 新增测试文件
  - 文件：`packages/sovei-core/test/load-stage-enhancement.test.mjs`
  - 测试项：
    1. TASK_TYPE_MAP['general'] 包含 code-map 和 rule
    2. loadStage.contract.producesArtifacts 包含 load-summary.md
    3. loadStage.postExecute 存在且正常执行（正常状态不抛异常）
    4. loadStage.postExecute 对无效状态抛异常
    5. grillStage.contract.requiredArtifacts 包含 load-summary.md
    6. load prompt 包含探索方法论关键词
  - 验收：全部测试通过
  - 阻塞：TASK-001, TASK-002, TASK-003

- [ ] TASK-005: 构建验证 + 全量测试
  - 命令：`pnpm run sovei:build && node packages/sovei-core/scripts/test.mjs`
  - 验收：tsc --noEmit 通过，全部测试通过（173 + 新增）
  - 阻塞：TASK-004
