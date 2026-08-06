# 变更清单

> 由 Sovei 阶段生成：implement
> Feature：011-agents-single-source

## TASK-001：project.ts 加入 AGENTS.md 存在性保护与提示

**文件**：`packages/sovei-core/src/cli/commands/project.ts`

**行为变更**：
- `project init` 的 AGENTS.md 生成处（第 223 行）加入存在性保护：
  - AGENTS.md 已存在且非空且非 `--force` → 不覆盖，输出提示指令（含可复制 AI 指令 + `--force` 逃生说明）。
  - `--force` → 覆盖写入。
  - 不存在/为空 → 正常生成。
- 采用 `opts.force` 与 `storage.exists('AGENTS.md')`，与 project.config.json 第 165-167 行的保护模式一致。

**测试/验证**：待 TASK-002 新增断言后运行 project.test.mjs；并用 tsx 临时目录验证三种路径。

## TASK-002：新增 project.test.mjs 断言 + 修复 007 遗留的模板测试回归

**文件**：`packages/sovei-core/test/project.test.mjs`

**行为变更**：
1. 新增 3 个测试：
   - `project init does not overwrite an existing AGENTS.md without --force`
   - `project init --force overwrites an existing AGENTS.md`
   - `project init generates AGENTS.md for a fresh target`
2. **删除失效的模板测试**（`static Sovei Markdown templates...`）：该测试引用 `harness/templates/sovei/*-template.md`，而这些文件已被 **007-template-remediation 删除**，导致 project.test.mjs 在 007 之后出现 1 个回归失败（007 当时只验证了 workflow.test.mjs，遗漏了 project.test.mjs）。

**验证**：重编译 dist 后 `node --test test/*.test.mjs` 全部 77/77 通过；运行时 tsx 验证 AGENTS.md 保护三种路径正常。

**剩余工作**：全部任务完成。
