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

## TASK-005：CLI 接入 skills（全局 + 局部），并接入项目初始化

### 文件

- `packages/sovei-core/src/skills/manager.ts`（新增）：SkillManager 服务。
- `packages/sovei-core/src/cli/commands/skills.ts`（新增）：`sovei skills` 命令组。
- `packages/sovei-core/src/cli/index.ts`：注册 skills 命令。
- `packages/sovei-core/src/cli/commands/project.ts`：`project init` 生成 `harness/skills/` 骨架。
- `packages/sovei-core/src/providers/bootstrap.ts`：启动时加载 map/lock 初始化 SkillRegistry。
- `packages/sovei-core/src/providers/tokens.ts`：新增 SkillRegistry / SkillManager token。
- `packages/sovei-core/src/skills/config.ts`：允许 path source 的 ref/commit 为空字符串。

### 行为

- `sovei project init` 自动创建 `harness/skills/`（skill-map.yaml + skill-lock.yaml，仅 native 绑定），使 skills 成为初始化流程的一部分。
- 新增 `sovei skills` 命令组：
  - `skills init`：显式创建骨架（幂等）。
  - `skills status`：展示局部（项目 harness/skills）+ 全局（`~/.sovei/skills`）接入状态，及配置校验结果。
  - `skills bind --stage <s> --skill <id> [--enable]`：局部绑定，写项目 skill-map。
  - `skills use --global <dir>`：从全局池接入 skill 到本地 lock（path source）。
  - `skills global list`：列出全局池中的可用 skills。
- 全局接入通过 `~/.sovei/skills/<id>/skill.json` manifest 读取，绕过项目 storage 的路径包含限制（项目外访问用 Node fs 直达）。
- `bind --enable` 会同步 lock 中对应 skill 状态为 enabled，保证 map 与 lock 一致。
- bootstrap 启动时读取 map/lock，将非 native 绑定注册进 SkillAdapterRegistry；skill 配置异常不阻断 CLI 其它命令。

### 验证

- `pnpm run check` 通过。
- 在临时项目实测完整闭环：`project init` → `skills status`（有效/native）→ `skills use --global`（接入 lock）→ `skills bind --enable`（启用）→ `skills status`（有效，grill 阶段显示 external skill）。
- 校验逻辑正确拦截"map 中 enabled 但 lock 中 candidate"的不一致状态。

## TASK-006：将已接入 skills 渲染进开发 Agent 上下文文件

### 背景

参考 OpenSpec（`analyze → sync` 编译出多格式上下文文件）与 SpecKit（模板注入斜杠命令），项目已接入的 skills 需要变成各开发 Agent（Codex/Cursor/Claude Code 等）运行时能读到的指令。缺失这一步，skills 只存在于 `harness/skills/`，Agent 不会自动知道"grill/spec 阶段该调用哪个 skill"。

### 文件

- `packages/sovei-core/src/skills/sync.ts`（新增）：SkillAgentSync，编译 map → 各 Agent 上下文文件。
- `packages/sovei-core/src/adapters/registry.ts`：每个 IDE 适配器增加 `contextFile` + `renderSkillDirectives`。
- `packages/sovei-core/src/cli/commands/skills.ts`：新增 `sovei skills sync` / `sovei skills clean`。
- `packages/sovei-core/src/skills/index.ts`：导出 SkillAgentSync。

### 行为

- `sovei skills sync`：把 skill-map 的绑定渲染成各 Agent 上下文文件：
  - `AGENTS.md`（Codex / CodeBuddy）：CLI 指令风格。
  - `CLAUDE.md`（Claude Code）：斜杠命令风格。
  - `.cursorrules`（Cursor / Trae）：CLI 指令风格。
- 用 sentinel 段落（`<!-- sovei-skills:start -->`...`<!-- sovei-skills:end -->`）upsert，**不覆盖用户已有的 AGENTS.md 其它内容**。
- `sovei skills sync --dry-run`：预览不落盘。
- `sovei skills clean`：移除这些文件中的 sovei skills 段落，保留其余内容。
- 同一上下文文件被多个适配器共享时（如 AGENTS.md）去重，避免重复写入。

### 验证

- `pnpm run check` 通过。
- 临时项目实测：`use`（接入全局 skill）→ `bind --enable`（启用 spec 阶段）→ `sync` 渲染出 AGENTS.md/CLAUDE.md/.cursorrules，原 Sovei Workflow 内容保留；重复 `sync` 不重复添加段落（幂等）；`clean` 正确移除段落并保留其余内容。

## 剩余工作

- TASK-007 至 TASK-013：具体 Adapter、只读 Context Pack、回退测试、阶段完成事件约束测试和 Feature 回放。
