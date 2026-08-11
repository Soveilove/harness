# 实施计划

1. 将运行时产物模板、12 阶段 Prompt Contract、Wayfinder Markdown 和扫描生成知识改为简体中文；保留所有机器标识。
2. 将工作流与项目初始化/扫描 CLI 的标题、状态标签、说明、错误前缀和下一步引导改为简体中文。
3. 将 `harness/templates/sovei/` 的 Markdown 模板改为简体中文，并增加自动化断言，防止运行时与静态模板重新漂移到英文骨架。
4. 继续运行 revision 0 的 Monorepo 扫描测试，新增中文产物/CLI 测试，最后执行 build、check、完整 test 和真实 prepare 产物检查。

## 迁移与回滚

这是显示文本和 Markdown 内容的兼容性变更，不迁移 JSON/YAML schema。回滚可单独恢复文案，不影响已有事件和 Feature 状态。
