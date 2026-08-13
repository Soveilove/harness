<!-- sovei-adapter-installed -->

### Quick Channel (Claude Code)

快速通道与完整 Sovei 工作流是**二选一关系**，不叠加：

- **快速通道**：低风险、范围明确的临时代码变更（不在正式 Feature 工作流内）。使用 `/sovei-quick` slash command 或直接运行 `sovei quick "<变更描述>" --paths <文件>`（排除路径自动从 .gitignore 读取）→ 完成编辑 → 运行测试。
- **完整工作流**：已注册 Feature 并走 13 阶段流程时，代码在 `implement` 阶段完成，由 converge/verify 门禁治理，**不需要再跑 quick**。
