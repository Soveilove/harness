# 范围：Monorepo 初始化扫描与中文审核产物

## 调用链

- 扫描：`project onboard -> ProjectScanner.scan -> KnowledgeStore.persist`。
- 阶段产物：`workflow <stage> -> WorkflowEngine.prepareStage -> getArtifactTemplate`，阶段正文来自 `stages/index.ts`。
- 决策地图：`WayfinderRepository.renderMarkdown` 单独生成 `wayfinder.md`。
- CLI：`cli/commands/workflow.ts` 与 `cli/commands/project.ts` 输出审核引导。
- 静态模板：`harness/templates/sovei/*.md` 作为可复用 Harness 模板来源。

## 本轮涉及文件

- 保留 revision 0 已实现的 `config/scanner.ts`、`cli/commands/project.ts` 与扫描测试。
- 中文化 `engine/workflow-engine.ts` 的权威规则、模板包装、阶段完成信息。
- 中文化 `stages/index.ts` 的描述、Prompt Contract 和产物缺失提示。
- 中文化 `wayfinder/repository.ts` 的 Markdown 投影。
- 中文化 `config/scanner.ts` 生成的代码图、架构知识标题和章节。
- 中文化工作流/项目 CLI 的说明性输出，命令和机器值保持不变。
- 中文化 `harness/templates/sovei/` 下 Markdown 模板；状态 YAML 字段不改。
- 增加运行时模板、CLI 输出和静态模板测试。

## 兼容边界

- 文件名、阶段名、任务 ID 正则、JSON/YAML schema、事件数据和命令不变。
- 历史 revision 0 产物保留原文，不批量翻译归档。
- 不扩展到所有内部异常、架构/治理/知识 CLI；本轮覆盖直接生成审核文件和当前初始化工作流的路径。

## 架构压力

无架构快照。修改以文案常量和测试为主，不新增依赖或状态职责；不能仅凭文件较长提出重构要求。
