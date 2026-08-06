# 变更清单

## TASK-001：定义 Skill runtime 类型契约

### 文件

- `packages/sovei-core/src/skills/types.ts`
- `packages/sovei-core/src/skills/index.ts`
- `packages/sovei-core/src/index.ts`

### 行为

- 定义 Skill Manifest、Binding、Context Pack、Request、Result、Artifact Proposal 和 Execution Report。
- 明确第三方 Skill 只读、只能返回候选产物、不能直接宣布阶段完成。
- 定义 Adapter 和 Resolver 的最小接口，为后续 lock、缓存和阶段适配器提供稳定类型边界。

### 验证

- `pnpm run check` 通过。

## TASK-002：增加项目级 Skill Map 与 Lock Schema

### 文件

- `packages/sovei-core/src/skills/config.ts`
- `packages/sovei-core/src/skills/index.ts`
- `harness/skills/skill-map.yaml`
- `harness/skills/skill-lock.yaml`

### 行为

- 解析并校验 Skill Map 的阶段绑定、状态和 native fallback。
- 解析并校验 Skill Lock 的来源、版本、ref、commit、checksum、许可证和状态。
- native 绑定不要求第三方 lock；第三方绑定缺少 lock 时被判为无效。
- 校验 manifest 与 lock 的来源、版本、commit 和许可证一致性。

### 验证

- `pnpm run check` 通过。
- 当前项目仅声明 Sovei native bindings，第三方 lock 为空，不会伪造已安装依赖。

## TASK-003：实现 Skill lock 校验

### 文件

- `packages/sovei-core/src/skills/config.ts`

### 行为

- 校验来源、版本、ref、commit、checksum、许可证和启用状态。
- manifest 与 lock 不一致时返回明确错误。
- 当前只完成配置和元数据校验；真实缓存文件 checksum 比对留给安装器任务。

## TASK-004：实现 Resolver 与 Adapter Registry

### 文件

- `packages/sovei-core/src/skills/registry.ts`
- `packages/sovei-core/src/skills/index.ts`

### 行为

- 只解析显式注册且状态为 enabled 的第三方绑定。
- `sovei/native/*` 绑定返回 native fallback，不伪装成第三方调用。
- 未注册 Adapter 返回 null，由上层继续执行 Sovei 原生 Stage。
- 第三方 Adapter 只能通过 `SkillAdapter` 协议注册。

### 验证

- `pnpm run check` 通过。

## 剩余工作

- TASK-005 至 TASK-012：阶段报告、CLI 初始化、具体 Adapter、回退测试和 Feature 回放。
