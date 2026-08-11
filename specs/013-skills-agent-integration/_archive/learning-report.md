# 学习报告

> 由 Sovei 阶段生成：learn
> Feature：013-skills-agent-integration

## 观察

### O1: "声明式适配器注册 + sync 遍历"模式稳定（candidate → 晋级提案）

- **来源**：012（skills sync 引入）、013（扩展至 7 适配器）。
- **证据**：`adapters/registry.ts` 声明式注册 IDEAdapter，`skills/sync.ts` 通过 `adapterRegistry.list()` 遍历渲染。013 新增 3 个适配器零逻辑改动，sync 自动覆盖，验证 80/80 测试通过、临时项目实测通过。
- **适用范围**：所有"单源 → 多 Agent 上下文"场景。
- **建议目标**：晋级为 stable 知识 —— 未来新增 Agent（如 .codex/rules、Windsurf 插件）仅需注册适配器，无需改动 sync 逻辑。

### O2: sentinel 段落 upsert 重复复用（candidate）

- **来源**：011（不覆盖 AGENTS.md 约束）、012、013。
- **证据**：`<!-- sovei-skills:start/end -->` upsert 在多个 Feature 复用，满足"保留用户内容 + 幂等 + 可清理"。013 验证幂等与 clean 可逆。
- **适用范围**：任何需向用户已有文件注入机器维护片段的场景。
- **建议目标**：保持 candidate；已覆盖 011/012/013，若再被第 4 个 Feature 复用则晋升 stable。

### O3: MCP 扩展为架构债务（candidate/pending）

- **来源**：adapters/registry 的能力画像含 `mcp` 布尔（codex/claude/gemini/windsurf 为 true），但无 MCP server 实现。
- **证据**：013 明确排除 MCP server，仅预留边界；`mcp: true` 字段目前无实际消费方。
- **适用范围**：未来把 skill 暴露为 MCP 工具时。
- **建议目标**：记为 pending 架构债 —— 做 MCP server 前，`mcp` 字段才具有语义；届时需定义工具协议映射与只读约束。

### O4: 拒绝模式：斜杠命令注入

- **来源**：013 决策（参照 SpecKit 调研后拒绝）。
- **证据**：斜杠命令会绕过 Sovei 的阶段完成判定，违背"外部 Skill 只读、不拥有工作流状态"核心契约（012 确认）。
- **适用范围**：任何 Agent 接入方案。
- **建议目标**：拒绝；Agent 统一经 `sovei workflow <stage> <feature>` 调用，保持完成判定归 Sovei。

## 架构债务

- **债务 1**：`mcp` 能力字段目前无消费方（O3）。建议在引入 MCP server 的 Feature 中一并处理，本次不背负实现。

## 结论

无 stable 知识需修改（遵守"修改 stable 前人工审查"）。O1 建议晋级 stable，但需单独的人工审查确认；本次仅记录为提案，不直接晋级。
