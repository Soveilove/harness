# Reconciliation: 011-agents-single-source 防止 project init 覆盖已存在的 AGENTS.md

## Need Translation

**需求来源**（开发者）："AGENTS.md 由 project init 硬编码生成，手动修改（如 008 的门禁澄清）会在重跑 init 时被覆盖，造成文档漂移。用户建议：若已存在，输出提示指令让 AI 自己决定如何处理，而不是静默跳过或武断覆盖。"

**技术理解**：`project.ts:182-223` 将 AGENTS.md 内容硬编码为 `agentsMd` 数组，第 223 行 `storage.write('AGENTS.md', agentsMd)` 无条件覆盖，无存在性检查。修复为：检测到 AGENTS.md 已存在且非空时，不覆盖并输出提示指令，由用户/AI 决定是否同步。

## Current State

- AGENTS.md 生成：`project.ts:182-222` 硬编码内容，`:223` 无条件覆盖，无存在性检查。
- 手动修改风险：008 手动改的 AGENTS.md（门禁澄清）不在硬编码模板里，重跑 init 会丢失。
- 消费方：`redline-scanner.ts:146-150` 将 AGENTS.md 作为 high 权重治理文档扫描；`project-rule-scanner.ts:24` 归为 codex 规则源。
- 测试：`project.test.mjs` 未测试 AGENTS.md 生成内容。
- project.config.json 有 `--force` 保护，AGENTS.md 无。

## Solutions

### Solution B': 检测到已存在时输出提示指令（选定）
- `project.ts` 写入前检查：AGENTS.md 已存在且非空 → 不覆盖，输出提示指令（指引用户复制给 AI 决定是否同步）；不存在/为空 → 正常生成；`--force` → 覆盖。
- **优点**：显式透明，把合并/保留决策交给用户/AI，符合"AI 工作流"理念；改动小。
- **代价**：低。需设计提示指令文本。

### Solution B: 静默跳过
- 已存在时不覆盖，静默保留。
- **缺点**：隐式，用户不知道，可能错过模板更新。已升级为 B'。

### Solution A: 模板抽离为单一事实源
- 把 agentsMd 抽成独立模板文件。
- **缺点**：改动大，抽离后模板与已生成文件仍可能漂移，收益边际。已拒绝。

**选定**：Solution B'。

## Questions

### [tech] Q1: 检测到已存在时，是否输出提示指令交由用户/AI 决定（而非静默跳过）？
- recommendation: 是（B'）。显式提示优于静默跳过，避免用户错过模板更新，也避免 CLI 武断覆盖手动修改。
- options: [是，输出提示指令] [否，静默跳过]

## Sign-off
- [x] product: by: developer date: 2026-08-06 ref: 用户提出"检测存在后输出提示指令让 AI 解决"的方案
- [x] tech: by: developer date: 2026-08-06 ref: 源码事实 D1-D6 已核实，方案 B' 已定
