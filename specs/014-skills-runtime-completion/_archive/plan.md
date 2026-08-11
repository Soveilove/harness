# 实施计划

> 由 Sovei 阶段生成：plan
> Feature：014-skills-runtime-completion

## 模块边界

### Module 1: MarkdownSkillAdapter（运行时核心）

**文件**：`packages/sovei-core/src/skills/adapter.ts`

**职责**：读取 vendored SKILL.md 文件，解析 YAML frontmatter（name, description, disable-model-invocation）和 markdown body，实现 `SkillAdapter` 接口。

**接口**：
```typescript
export class MarkdownSkillAdapter implements SkillAdapter {
  readonly manifest: SkillManifest;
  constructor(manifest: SkillManifest, skillContent: string);
  async execute(request: SkillRequest): Promise<SkillResult>;
}
```

`execute` 不做真正的 LLM 调用——它返回一个 `SkillResult`，其中 `proposals` 包含 skill body 内容作为"候选 prompt 内容"。`WorkflowEngine.prepareStage` 负责将这个内容注入到 stage prompt 中。

**解析逻辑**：
- 用简单正则分割 `---` frontmatter 边界
- 用 `yaml` 包解析 frontmatter
- body 是 frontmatter 之后的全部内容

### Module 2: SkillInstaller（治理层 - 安装）

**文件**：`packages/sovei-core/src/skills/installer.ts`

**职责**：从 git 仓库或本地路径拉取 skill 文件到 `harness/vendor/`，计算 sha256 checksum，更新 skill-lock.yaml。

**接口**：
```typescript
export class SkillInstaller {
  constructor(storage: StorageBackend, skillManager: SkillManager);
  async installFromGit(repoUrl: string, ref: string, skillPaths: string[]): Promise<InstallResult>;
  async installFromPath(localDir: string, skillId: string): Promise<InstallResult>;
}
```

**git 安装流程**：
1. `git clone --depth 1 --branch <ref> <url>` 到临时目录
2. 复制指定 skill 目录到 `harness/vendor/<vendor-name>/skills/<category>/<skill-name>/`
3. 读取 SKILL.md，解析 frontmatter 获取 name/version
4. 计算 SKILL.md 的 sha256 checksum
5. 调用 `SkillManager.registerGlobalSkill` 或直接写入 lock

### Module 3: SkillUpgrader（治理层 - 升级）

**文件**：`packages/sovei-core/src/skills/upgrader.ts`

**职责**：拉取上游最新版本，生成 diff，人工确认后更新 vendor 和 lock。

**接口**：
```typescript
export class SkillUpgrader {
  constructor(storage: StorageBackend, skillManager: SkillManager);
  async checkUpdate(skillId: string): Promise<UpdateCheckResult>;
  async diff(skillId: string): Promise<string>;
  async upgrade(skillId: string, confirmed: boolean): Promise<UpgradeResult>;
}
```

### Module 4: WorkflowEngine 集成（prompt 注入）

**文件**：`packages/sovei-core/src/engine/workflow-engine.ts`

**变更**：`prepareStage` 方法中，在 `stageDef.execute(ctx)` 返回 result 后：
1. 从 DI 获取 SkillResolver
2. `const binding = resolver.resolve(stageName)`
3. 如果 binding 不为 null，`const adapter = resolver.getAdapter(binding.skillId)`
4. 如果 adapter 不为 null，调用 `adapter.execute(request)` 获取 skill body
5. 组合 prompt：`authorityNotice + skillBody + stageContract`
6. 填充 `result.skillExecutionReport`
7. 如果任何步骤失败，回退到原生 prompt，记录 fallbackReason

### Module 5: Bootstrap 集成

**文件**：`packages/sovei-core/src/providers/bootstrap.ts`

**变更**：读取 skill-lock.yaml，为每个已锁定的外部 skill 创建 `MarkdownSkillAdapter` 并注册到 `SkillAdapterRegistry`。

### Module 6: CLI 命令

**文件**：`packages/sovei-core/src/cli/commands/skills.ts`

**新增命令**：
- `skills install --git <url> --ref <ref> --paths <comma-separated>`
- `skills install --path <dir> --id <skill-id>`
- `skills upgrade <skill-id>`
- `skills diff <skill-id>`

### Module 7: StageResult 扩展

**文件**：`packages/sovei-core/src/stages/define-stage.ts`

**变更**：`StageResult` 接口新增 `skillExecutionReport?: SkillExecutionReport`。

## 数据流

```
skill-map.yaml → SkillAdapterRegistry.bindings
skill-lock.yaml → SkillAdapterRegistry.adapters (via MarkdownSkillAdapter)
                         ↓
WorkflowEngine.prepareStage(stageName)
  → stageDef.execute(ctx) → result.prompt (原生契约)
  → resolver.resolve(stageName) → binding?
    → yes: adapter.execute() → skillBody
           result.prompt = authority + skillBody + contract
           result.skillExecutionReport = { mode: 'third-party', skillId, version }
    → no: result.skillExecutionReport = { mode: 'native', skillId: null }
  → return result
         ↓
CLI → 打印 prompt + skillExecutionReport
```

## 迁移策略

- 不需要迁移现有数据。skill-map.yaml 和 skill-lock.yaml 从 `skills: {}` 更新为包含 7 个绑定。
- 现有 native binding 保留，作为 fallback。
- 不改变任何 stage 的 execute 方法。

## 验证策略

1. **单元测试**：MarkdownSkillAdapter 解析测试、prompt 组合测试、fallback 测试
2. **集成测试**：prepareStage 有 binding 和无 binding 两种路径
3. **回放测试**：使用 specs/011 的 Feature 做 native vs adapter 对比
4. **类型检查**：`pnpm run check` 通过
