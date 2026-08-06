# 影响范围

> 由 Sovei 阶段生成：scope
> Feature：011-agents-single-source

## 修改入口

`packages/sovei-core/src/cli/commands/project.ts`：
- 第 223 行 `storage.write('AGENTS.md', agentsMd)` 附近，加入存在性检查与提示逻辑。

## 消费者与影响

### project.ts 修改点
- **AGENTS.md 生成逻辑**（`:182-223`）：
  - 写入前检查 `harnessPath/AGENTS.md` 是否已存在且非空。
  - 若已存在且非空且非 `--force`：跳过写入，输出提示指令。
  - `--force`：覆盖写入。
  - 不存在/为空：正常写入。

### 影响面核查
- **其他 init 逻辑**：`project.config.json` 写入、rules 适配、目录创建不受影响。
- **redline 扫描**：`redline-scanner.ts:146-150` 扫描 AGENTS.md——本 Feature 不改 AGENTS.md 内容，仅当已存在时不再覆盖，扫描行为不变。
- **测试**：`project.test.mjs` 未测试 AGENTS.md 生成内容，不影响现有测试。可能需新增断言"已存在时不覆盖"。

## 明确不覆盖
- AGENTS.md 内容/结构。
- 模板抽离。
- `harness/index.md`。
- 其他 project init 逻辑（config/rules/目录）。
- 除 project.ts 外的任何源码。

## 架构压力记录
- 双重事实源（project.ts 硬编码 vs 实际 AGENTS.md）仍是根因，但本 Feature 通过"不覆盖 + 提示"缓解了最痛的手动修改丢失问题，未引入新债务。模板抽离留待后续（决策 A 拒绝）。

## 兼容路径
- 新项目首次 init 行为不变（正常生成）。
- `--force` 语义不变。
- 已存在项目重跑 init：不再覆盖，改为提示（行为变化，符合预期）。
