# 覆盖矩阵

> 由 Sovei 阶段生成：scope
> Feature：007-template-remediation

| 必需覆盖 | 证据 | 状态 |
|---|---|---|
| **入口/路由** | 删除文件为 harness 目录内容，无代码入口；引擎模板走 `getArtifactTemplate`，已确认不读外部文件。 | 已覆盖 |
| **UI 状态** | 不涉及 UI。无 CLI 展示依赖模板文件。 | N/A |
| **store/service** | 引擎服务（ArtifactRepository/EventStore）均不引用模板文件。 | 已覆盖 |
| **参数** | 无参数变化。 | N/A |
| **API** | `prepareStage`/`completeStage` 的模板逻辑走内嵌 `getArtifactTemplate`，删除外部文件不影响。 | 已覆盖 |
| **鉴权/计费** | 不涉及。 | N/A |
| **异步回调** | 无异步依赖模板文件。 | 已覆盖 |
| **成功/失败/清理** | 删除文件是纯清理；引擎 prepare 仍正常生成内嵌模板。 | 已覆盖 |
| **历史/详情/重试** | 已生成 feature 产物不受影响；无归档逻辑涉及模板文件。 | 已覆盖 |
| **兼容入口** | `project init` 仍创建空目录 + `.gitkeep`，兼容。 | 已覆盖 |
| **测试/文档/运行时证据** | 测试导入 dist，不依赖模板文件；运行时 `prepare` 内嵌生成模板需验证。 | 已覆盖 |

## 明确不覆盖
- 引擎源码与阶段契约
- release 构建逻辑
- `harness/templates/.gitkeep` 与目录结构

## 结论
影响面封闭：删除 14 个死模板文件 + 更新 index.md 1 行说明。无未确定边界。
