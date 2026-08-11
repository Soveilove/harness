# 验证证据

> Feature：014-skills-runtime-completion
> 阶段：verify

## 命令与结果

### 1. TypeScript 类型检查

```
cd d:\project\harness\packages\sovei-core && npx tsc --noEmit
```
结果：通过，零错误。

### 2. 全部测试套件

```
cd d:\project\harness\packages\sovei-core && node --test test/*.test.mjs
```
结果：89 个测试全部通过（含新增 9 个：5 个 adapter 契约测试 + 4 个 runtime 注入测试）。

### 3. Skills 配置状态

```
sovei skills status
```
结果：
- 配置有效性：有效
- 8 个阶段绑定（7 external + 1 native wayfind）
- 6 个已锁定第三方 Skills

### 4. 端到端 Prompt 注入验证

```
sovei workflow grill test-skill-injection
```
结果：
- CLI 输出：`使用 Skill：mattpocock/grilling v1.0.0`
- Prompt 包含 `## 外部 Skill 指令` section
- Skill body 内容：`Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**`
- 来源标注：`来源：mattpocock/grilling v1.0.0`
- Sovei 阶段契约正确出现在 skill 内容之后
- Prompt 结构顺序：权威规则 → 外部 Skill 指令 → 阶段契约

### 5. Implement 阶段 Skill 注入验证

在完成 TASK-001 到 TASK-010 时，每次执行 implement 阶段都显示：
- `使用 Skill：mattpocock/implement v1.0.0`
- Prompt 包含 implement skill 的 body：`Implement the work described by the user in the spec or tickets. Use /tdd where possible...`

## 证据位置

- 新增代码：`packages/sovei-core/src/skills/adapter.ts`, `installer.ts`, `upgrader.ts`
- 测试文件：`packages/sovei-core/test/skill-adapter.test.mjs`, `skill-runtime.test.mjs`
- Vendor 文件：`harness/vendor/mattpocock/skills/`（8 个 SKILL.md）
- 配置文件：`harness/skills/skill-map.yaml`, `skill-lock.yaml`
- 变更清单：`specs/014-skills-runtime-completion/change-manifest.md`

## 限制

1. SkillInstaller 和 SkillUpgrader 的 CLI 命令未做端到端测试（需要真实的 git 仓库操作）。单元逻辑通过代码审查验证。
2. skill 附加文件（如 domain-modeling 的 CONTEXT-FORMAT.md）未解析——本 Feature 只处理 SKILL.md 单文件注入。
3. grill-with-docs 被 vendored 但未绑定——grilling 被绑定到 grill 阶段，因为 grill-with-docs 只是 grilling 的薄包装。

## 结论

所有 14 项验收标准均已满足。外部 Skills 运行时层和治理层实现完成，可以发版。
