# 验证证据

> 由 Sovei 阶段生成：verify
> Feature：011-agents-single-source

## 需求符合性验证

### 场景 1：已有项目重跑 init 不覆盖，并提示用户

- **命令**：`tsx src/cli/index.ts project init <tmp-dir> --blank`（tmp-dir 含预置自定义 AGENTS.md）
- **结果**：输出"· AGENTS.md 已存在，保留现有内容（未被覆盖）"，并打印可复制的 AI 同步指令 + `--force` 逃生说明。AGENTS.md 内容保持不变。
- **证据位置**：终端输出；`project.test.mjs` 测试 `project init does not overwrite an existing AGENTS.md without --force`
- **结论**：通过。

### 场景 2：新项目首次 init 正常生成 AGENTS.md

- **命令**：`node --test test/project.test.mjs`
- **结果**：测试 `project init generates AGENTS.md for a fresh target` 通过，AGENTS.md 含 `## Sovei Workflow` 与完整阶段链。
- **证据位置**：`project.test.mjs`
- **结论**：通过。

### 场景 3：--force 仍覆盖

- **命令**：`node --test test/project.test.mjs`
- **结果**：测试 `project init --force overwrites an existing AGENTS.md` 通过，AGENTS.md 被覆盖为默认声明。
- **证据位置**：`project.test.mjs`
- **结论**：通过。

## 工程质量验证

- **类型检查**：`tsc --noEmit` 通过（重编译 dist 后测试通过）。
- **完整测试**：`node --test test/*.test.mjs` 全部 **77/77 通过**。
- **回归修复**：删除失效的模板测试（引用 007 已删的模板），消除 007 引入的 project.test.mjs 回归。

## 限制
- 测试运行的 CLI 是 `dist/cli/index.js`（编译产物）。需重编译 `dist` 后测试才反映最新源码。本 Feature 已执行 `tsc` 重编译。
- 双重事实源（project.ts 硬编码 vs 实际 AGENTS.md）仍存在，本 Feature 缓解手动修改丢失，模板抽离留待后续。

## 结论
需求符合性与工程质量均验证通过，无阻塞。可进入 learn 阶段。
