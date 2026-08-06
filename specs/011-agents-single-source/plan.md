# 实施计划

> 由 Sovei 阶段生成：plan
> Feature：011-agents-single-source

## 模块边界

修改面封闭在：
1. `packages/sovei-core/src/cli/commands/project.ts` — AGENTS.md 生成逻辑加入存在性保护与提示。
2. `packages/sovei-core/test/project.test.mjs` — 新增断言"已存在时不覆盖并提示"。

不涉及：AGENTS.md 内容、模板抽离、`--force` 语义、其他 init 逻辑。

## 数据流

- `project init` → 读取 `harnessPath` → 检查 `AGENTS.md` 存在性：
  - 不存在/为空 → `storage.write('AGENTS.md', agentsMd)`（正常生成）
  - 已存在且非空且非 `--force` → 跳过写入，`console.log` 提示指令
  - `--force` → 覆盖写入

## 代码修改（project.ts 第 182-223 行附近）

在 `storage.write('AGENTS.md', agentsMd)` 前插入存在性判断。提示指令文本（中文，对齐项目语言）：

```text
检测到 AGENTS.md 已存在，已保留现有内容（未被覆盖）。

如需将其与最新的 Sovei 工作流声明同步，请复制以下指令给你的 AI 助手，由它审查 AGENTS.md 并决定如何更新：

「请审查本项目的 AGENTS.md，确认其 Sovei Workflow 部分（Key Commands、Workflow Stages、Confirmation Gates、Reconciliation）是否与最新声明一致。若缺失或过期，请补充/更新；若无需变更，请保留现状。不要凭空删除现有内容。」

（如需强制覆盖生成默认 AGENTS.md，可重新运行：sovei project init <path> --force）
```

## 迁移策略
- 无数据迁移。`--force` 提供逃生通道。

## 验证方式
1. **单测**：在 `project.test.mjs` 新增用例——模拟 AGENTS.md 已存在，断言 init 不覆盖且输出提示；模拟不存在，断言生成。
2. **运行时**：用 tsx 在临时目录跑 `project init` 验证存在/不存在/--force 三种路径。
3. **回归**：跑 `project.test.mjs` 全量确认。
