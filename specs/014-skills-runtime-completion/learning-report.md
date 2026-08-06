# 学习报告

> Feature：014-skills-runtime-completion
> 阶段：learn

## 观察分类

### 仅项目适用

1. **grill-with-docs vs grilling 的选择**：grill-with-docs 是 grilling 的薄包装（仅一行 "Run a /grilling session, using the /domain-modeling skill"）。直接绑定 grilling 更有效，因为 adapter 注入的是实际内容而非引用。后续如果需要 "with docs" 行为，可以在 grill 阶段同时绑定 grilling + domain-modeling 两个 skill（需要多 binding 支持）。

2. **Matt Pocock skills 的 frontmatter 不包含 version 字段**：lock 中的 version 使用 "1.0.0" 作为占位。真实的版本追踪依赖 git commit hash，这已经足够。

### candidate/pending（单次观察，待验证）

1. **Prompt 注入策略的有效性**：将外部 skill body 注入到 stage prompt 前面，AI 代理是否能正确理解和执行？端到端验证显示 prompt 结构正确，但实际执行效果需要后续 Feature 的真实使用来验证。如果 AI 代理忽略 skill 内容或与 Sovei 契约冲突，可能需要调整注入位置或格式。

2. **SkillInstaller 的 YAML 操作**：当前使用简单的字符串拼接来更新 skill-lock.yaml。如果 lock 文件格式变化或包含注释，可能需要更健壮的 YAML 序列化。

3. **bootstrap 同步读取**：adapter 注册改为同步读取（readFileSync），避免了 async IIFE 的竞态条件。但如果 skill 数量增加或 SKILL.md 文件变大，可能影响启动性能。

### stable 晋升提案

1. **structural-fact vs semantic-annotation 区分**：在本 Feature 中，skill body（来自外部）是 structural-fact（可自动覆盖），而 Sovei 阶段契约是 semantic-annotation（不可覆盖）。这个区分在后续统一关系模型中应该成为核心设计原则。**但这是单次观察，不能直接晋升 stable。**

### 拒绝模式

1. **子代理执行**：确认拒绝。Sovei 是工作流治理引擎，不是 agent 平台。prompt 注入足够传达意图，AI 代理自行决定执行方式。

## 架构债务

暂无。本 Feature 没有引入跨模块的架构问题。

## 建议的后续行动

1. **后续 Feature 使用真实 skill 执行**：在解决问题三（drift detection）或问题二（S0 fast-track）时，观察 Matt Pocock skills 的实际效果。如果 grill 阶段的提问质量明显提升，说明 prompt 注入策略有效。
2. **多 binding 支持**：如果需要在一个阶段注入多个 skill（如 grill 阶段同时注入 grilling + domain-modeling），需要扩展 skill-map schema 和 adapter 逻辑。
3. **Skill 附加文件解析**：domain-modeling 的 CONTEXT-FORMAT.md 和 ADR-FORMAT.md 目前被忽略。如果 spec 阶段需要这些模板，需要扩展 adapter 支持多文件读取。
