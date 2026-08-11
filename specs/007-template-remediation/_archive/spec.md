# 功能规格

> 由 Sovei 阶段生成：spec
> Feature：007-template-remediation
> 标题：删除 harness/templates 死模板，消除文档-实现脱节

## 需求翻译（做什么 / 不做什么）

### 做什么
1. 删除 `harness/templates/sovei/` 下 13 个未被任何代码消费的模板文件。
2. 更新 `harness/index.md` 中关于 `templates/` 目录的说明，使其与实现一致（模板由引擎内嵌生成，目录仅为占位）。
3. 保留 `harness/templates/` 目录结构本身（`project init` 依赖创建空目录）。

### 不做什么
- 不改造引擎 `getArtifactTemplate`（引擎内嵌模板功能完备，无需接入外部模板文件）。
- 不修改 12 个阶段的定义或产物契约。
- 不删除 `harness/templates/.gitkeep`（目录占位符）。
- 不改动已生成的历史 feature 产物。

## 用户可见行为（验收标准）

### 场景 1：模板目录不再误导
- **Given** 查看 `harness/templates/sovei/`
- **When** 检查是否存在 `*-template.md` 文件
- **Then** 13 个死模板文件已删除，仅剩 `.gitkeep` 或空目录

### 场景 2：工作流功能不回归
- **Given** 运行任意阶段（如 spec）的 prepare
- **When** 引擎生成产物模板
- **Then** 仍由 `getArtifactTemplate` 内嵌生成，产物含提示契约与占位符，功能不受影响

### 场景 3：文档与实现一致
- **Given** 阅读 `harness/index.md` 的目录说明
- **When** 查看 `templates/` 描述
- **Then** 不再声称提供"文档模板"文件，或明确说明模板由引擎内嵌

## 边界与排除项
- 仅删除 git 追踪的 13 个模板文件 + 更新 index.md 说明。
- 不触碰引擎源码、阶段定义、release 构建逻辑。
- 不删除 `harness/templates/.gitkeep` 和目录结构。
