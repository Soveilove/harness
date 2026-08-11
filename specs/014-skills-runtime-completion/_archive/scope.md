# 影响范围

> 由 Sovei 阶段生成：scope
> Feature：014-skills-runtime-completion

## 受影响模块

### 1. `packages/sovei-core/src/skills/` — 运行时适配器

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `adapter.ts`（新增） | 新增 | `MarkdownSkillAdapter` 类，实现 `SkillAdapter` 接口。读取 SKILL.md，解析 frontmatter，返回 body 内容。 |
| `installer.ts`（新增） | 新增 | `SkillInstaller` 类，支持 git clone 和 path copy 两种安装方式，计算 sha256 checksum。 |
| `upgrader.ts`（新增） | 新增 | `SkillUpgrader` 类，拉取上游最新版本，生成 diff，人工确认后更新。 |
| `types.ts` | 修改 | 新增 `SkillManifestFile` 接口（解析后的 frontmatter + body） |
| `manager.ts` | 修改 | 新增 install/upgrade/diff 方法委托 |
| `index.ts` | 修改 | 导出新模块 |

### 2. `packages/sovei-core/src/engine/workflow-engine.ts` — Prompt 注入

| 位置 | 变更类型 | 说明 |
|---|---|---|
| `prepareStage` 方法 | 修改 | 在 `stageDef.execute(ctx)` 返回 result 后，检查 SkillResolver 是否有当前阶段的外部 skill 绑定。如果有，读取 skill 内容注入到 result.prompt 中。 |
| 构造函数 | 修改 | 注入 SkillResolver 依赖 |

### 3. `packages/sovei-core/src/stages/define-stage.ts` — StageResult 扩展

| 位置 | 变更类型 | 说明 |
|---|---|---|
| `StageResult` 接口 | 修改 | 新增 `skillExecutionReport?: SkillExecutionReport` 字段 |

### 4. `packages/sovei-core/src/providers/bootstrap.ts` — Adapter 注册

| 位置 | 变更类型 | 说明 |
|---|---|---|
| bootstrap 函数 | 修改 | 读取 skill-lock，为每个已锁定的外部 skill 创建 MarkdownSkillAdapter 并注册到 SkillAdapterRegistry |

### 5. `packages/sovei-core/src/cli/commands/skills.ts` — 新增 CLI 命令

| 命令 | 说明 |
|---|---|
| `skills install --git <url> --ref <ref>` | 从 git 仓库安装 skill |
| `skills install --path <dir>` | 从本地目录安装 skill |
| `skills upgrade <skill-id>` | 升级 skill 到上游最新版本 |
| `skills diff <skill-id>` | 展示 vendor 与上游差异 |

### 6. `packages/sovei-core/src/cli/commands/workflow.ts` — 执行报告展示

| 位置 | 变更类型 | 说明 |
|---|---|---|
| stage 命令输出 | 修改 | 显示 `使用 Skill：<skill-id> v<version>` 或 `使用 Skill：native` |

### 7. `harness/vendor/mattpocock/skills/` — Vendor 目录（新增）

```
harness/vendor/mattpocock/skills/
├── engineering/
│   ├── grill-with-docs/SKILL.md
│   ├── domain-modeling/SKILL.md
│   ├── to-spec/SKILL.md
│   ├── to-tickets/SKILL.md
│   ├── implement/SKILL.md
│   └── code-review/SKILL.md
└── productivity/
    └── handoff/SKILL.md
```

### 8. `harness/skills/skill-map.yaml` — 绑定更新

新增 7 个外部 skill 绑定（grill/spec/tasks/implement/converge/verify/learn），保留 native fallback。

### 9. `harness/skills/skill-lock.yaml` — 锁定更新

锁定 7 个 vendored skill 的 source/version/ref/commit/checksum/license。

### 10. `packages/sovei-core/test/` — 测试（新增）

| 文件 | 说明 |
|---|---|
| `skill-adapter.test.mjs` | MarkdownSkillAdapter 契约测试（解析 frontmatter + body） |
| `skill-runtime.test.mjs` | prepareStage prompt 注入测试（native vs adapter vs fallback） |

## 不受影响

- `engine/state-machine.ts` — 状态机逻辑不变
- `engine/event-store.ts` — 事件存储不变
- `engine/types.ts` — WorkflowState 不变（riskLevel 仍为 S1）
- `stages/index.ts` — 12 个 stage 的 execute 方法不变（prompt 注入在 workflow-engine 层）
- `config/scanner.ts` — 扫描器不变
- `change-control/` — 变更控制不变
- `knowledge/` — 知识存储不变
- `wayfinder/` — 决策地图不变
