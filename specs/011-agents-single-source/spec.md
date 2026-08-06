# 功能规格

> 由 Sovei 阶段生成：spec
> Feature：011-agents-single-source
> 标题：防止 project init 覆盖已存在的 AGENTS.md

## 需求翻译（做什么 / 不做什么）

### 做什么
1. 修改 `packages/sovei-core/src/cli/commands/project.ts` 的 AGENTS.md 生成逻辑：在写入前检查 AGENTS.md 是否已存在且非空。
2. 若 AGENTS.md 已存在且非空：**不覆盖**，并输出一条**提示指令**——告知用户"AGENTS.md 已存在，如需与最新 Sovei 工作流声明同步，请复制指令给你的 AI 助手，由 AI 审查现有内容并决定如何更新"。
3. 若 AGENTS.md 不存在或为空：正常生成（新项目首次初始化）。
4. `--force`：覆盖（用户显式要求）。

### 不做什么
- 不抽离 AGENTS.md 模板为独立文件（决策 D6 拒绝方案 A）。
- 不修改 AGENTS.md 的内容或结构。
- 不改变 `--force` 的语义（force 时仍覆盖）。
- 不修改 `harness/index.md`。

## 用户可见行为（验收标准）

### 场景 1：已有项目重跑 init 不覆盖，并提示用户
- **Given** 项目已存在且 AGENTS.md 已被手动修改（如 008 的门禁澄清）
- **When** 运行 `sovei project init <path>`（无 --force）
- **Then** AGENTS.md 内容保持不变（不被覆盖），且输出一条**提示指令**，指引用户复制给 AI 助手以决定是否同步最新声明

### 场景 2：新项目首次 init 正常生成 AGENTS.md
- **Given** 全新目录，无 AGENTS.md
- **When** 运行 `sovei project init <path>`
- **Then** AGENTS.md 正常生成，含 Sovei Workflow 声明

### 场景 3：--force 仍覆盖
- **Given** 项目已存在
- **When** 运行 `sovei project init <path> --force`
- **Then** AGENTS.md 被重新生成（覆盖手动修改）

## 边界与排除项
- 仅修改 `project.ts` 的 AGENTS.md 生成处。
- 不改 AGENTS.md 内容、`--force` 语义、其他 init 逻辑。
- 不抽离模板、不改 index.md。
