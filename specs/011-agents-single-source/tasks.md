# 任务清单

> 由 Sovei 阶段生成：tasks
> Feature：011-agents-single-source

- [ ] TASK-001: project.ts 加入 AGENTS.md 存在性保护与提示指令
- [ ] TASK-002: 新增 project.test.mjs 断言"已存在时不覆盖并提示"

---

## TASK-001：project.ts 加入 AGENTS.md 存在性保护与提示

- **依赖**：无
- **文件范围**：`packages/sovei-core/src/cli/commands/project.ts`
- **修改内容**：在 `storage.write('AGENTS.md', agentsMd)` 前插入存在性判断（详见 plan.md）：
  - AGENTS.md 已存在且非空且非 `--force` → 跳过写入，`console.log` 提示指令（含可复制的 AI 指令 + --force 逃生说明）。
  - `--force` → 覆盖写入。
  - 不存在/为空 → 正常写入。
- **验收标准**：已有 AGENTS.md 时 init 不覆盖且输出提示；新目录正常生成；`--force` 覆盖。
- **验证方式**：tsx 临时目录运行 `project init` 三种路径。

## TASK-002：新增 project.test.mjs 断言

- **依赖**：TASK-001
- **文件范围**：`packages/sovei-core/test/project.test.mjs`
- **修改内容**：新增用例——模拟 AGENTS.md 已存在，断言 init 不覆盖且输出提示；模拟不存在，断言生成。
- **验收标准**：project.test.mjs 全部通过。
- **验证方式**：运行 `node --test test/project.test.mjs`。
