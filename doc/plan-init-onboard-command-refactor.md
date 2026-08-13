# init / onboard 指令化封装重构方案

## 背景与目标

对齐 vt-flow / dingtalk-cli 的心智模型：**CLI = 门禁 + 条件判断 + 指令包生产者；skill/slash = 薄入口；agent = 语义执行者**。

Sovei 的 12 个工作流阶段**已经**是这个模型（`.claude/commands/sovei-<stage>.md` → 调 `sovei workflow` / `sovei context build`）。唯独 `init` / `onboard` 是例外：`onboard --evidence-only` 停留在「打印一大段 AGENT ONBOARDING GUIDE 让用户复制粘贴」的老范式，`init` 完手上没有任何入口指令（需额外 `--adapters` 或 `adapters install`）。

**目标**：把 onboard 纳入统一的指令封装模型，消除这个例外；init 通过交互式（空格勾选）agent 选择器配置平台，并为每个选中的 agent 默认铺好「基础指令」（quick + onboard）；顺手修掉两个已确认的 bug。

## 用户决策（已确认）

1. **GUIDE 处理**：可重构，重点是合理 → 从「打印给人复制」重定位为「指令包」，由 skill/slash 承接。
2. **init 默认安装**：仍触发空格选择 agent；每个 agent 都必须有的基础指令 = 快速模式(quick) + 扫描(onboard)。
3. **范围**：全部处理完（A + B + C）。
4. **覆盖范围**：按平台能力分层——claude/codebuddy 出 slash，codex 出技能包，trae/gemini/aider/windsurf 只在上下文文件里加一行 onboard 指令说明。

## 现状关键事实（已核实）

- 三个生成面：`generateClaudeStageSlashCommands` / `generateCodebuddyStageSlashCommands`（slash 数组）、codex 的 `skillPackage`（技能文件）。均在 [registry.ts](../packages/sovei-core/src/adapters/registry.ts)。
- 安装链路：`installAdapters` → `installSingleAdapter`（[installer.ts](../packages/sovei-core/src/adapters/installer.ts)）：写 quickChannelDirective 到 contextFile（带 `<!-- sovei-adapter-installed -->` 标记幂等）、写 `slashCommand`（单）、`slashCommands`（数组）、`skillPackage`。**无 quickChannelDirective 的适配器直接跳过**（gemini/aider/windsurf 当前 `quickChannelDirective: ''`）。
- 7 个适配器：codex, claude, codebuddy, trae（有 quickChannelDirective）；gemini, aider, windsurf（空 directive，当前被 installer 跳过）。
- **无任何交互式选择器基础设施**，无 TTY prompt 依赖（Sovei 坚持零运行时依赖）。vt-flow 的 `selectCodeAgents`（readline 裸实现）可作参考。
- init 当前 `--adapters` 走 `installAdapters`；无 `--adapters` 时只打印提示不安装。
- onboard 单独跑（未先 init）产出残缺骨架：无 AGENTS.md、无 skills 基座、7 个 knowledge 只建 2 个，且**无任何提示**。
- GUIDE 硬编码在 [project.ts:547-661](../packages/sovei-core/src/cli/commands/project.ts#L547) 的 `console.log` 序列。

## 两个已确认 bug（C）

1. **旧入口提示**：[project.ts:737](../packages/sovei-core/src/cli/commands/project.ts#L737) 完整 onboard 结尾打印 `sovei workflow bootstrap 001-first-feature`（旧入口），与 evidence-only 分支的 explore 入口自相矛盾。
2. **onboard 残缺骨架无提示**：onboard 未检测 init 是否跑过，缺 AGENTS.md/skills 基座时静默产出半成品。

---

## 实施方案

### Part A — onboard 指令化封装

**A1. 新增 onboard 指令生成器**（registry.ts）
- 新增 `generateClaudeOnboardCommand(dir)` 和 `generateCodebuddyOnboardCommand(dir)`，产出 `sovei-onboard.md` slash：
  - 内容 = 薄封装：`运行 sovei project onboard --evidence-only` → 读取 CLI 落盘的三个证据文件 → 按 CLI 输出的指令包执行（清洗业务地图 / 识别红线 / 写回 CLI / 精炼规则候选 / 写 onboard-report.md + business-coverage.md）。
  - 强调「你不是复制这段文字，而是执行 CLI 吐出的指令包」。
- codex：在 `skillPackage.skills` 追加一个 `sovei-onboard.md` 技能（description 写明「分析已有代码库、建立业务基线时唤起」）。

**A2. GUIDE 重定位为指令包**（project.ts）
- 保留 GUIDE 内容（它写得不错），但把定位从「打印给人复制」改为「CLI 指令包输出」——措辞上明确这是给 agent 读的指令包（配合 A1 的 skill：skill 让 agent 跑命令、读这段输出、执行）。
- 内容基本不变，仅调整开头引导语，使其与 skill 封装衔接（不再要求用户手动搬运）。

**A3. 挂到 slashCommands / skillPackage 数组**
- claude/codebuddy 的 `slashCommands` 追加 onboard 项；codex 的 `skillPackage` 追加 onboard 技能。
- trae/gemini/aider/windsurf：见 B3（在 quickChannelDirective 里加 onboard 说明行）。

### Part B — init 交互式选择 + 基础指令默认铺设

**B1. 零依赖 TTY 多选器**（新文件 `packages/sovei-core/src/cli/adapter-selector.ts`）
- 参考 vt-flow `selectCodeAgents`：readline `moveCursor/cursorTo/clearLine`，↑↓ 移动、空格勾选、回车确认。
- 非 TTY 环境（CI/管道）返回 `[]`（回落到「不安装，打印提示」），不阻塞。
- 候选项来自 `adapterRegistry.list()`（展示 name + contextFile）。
- 导出 `parseAdapterOption(value)` 供 `--adapters` 复用（支持 all/none + 校验）。

**B2. init action 接入选择器**（project.ts）
- 无 `--adapters` 且 TTY → 调选择器；有 `--adapters` → `parseAdapterOption`；`--adapters none` 或非 TTY → 不安装。
- 选中的每个 adapter：`installAdapters` 会铺 quickChannelDirective（含工作流节点 + quick + onboard 说明）、slashCommands（12 阶段 + quick + **onboard**）、skillPackage。
- 「基础指令」= quick + onboard，对每个选中 agent 都安装（本就随 slashCommands/skillPackage 一起铺，天然满足）。

**B3. 让 4 个「纯上下文文件」适配器也带 onboard 说明**
- gemini/aider/windsurf 当前 `quickChannelDirective: ''` → installer 跳过。为满足「所有 agent 都要有扫描能力」，给这四个（含 trae）的 contextFile 注入一段最小 onboard + quick 说明文本。
- 方案：为 gemini/aider/windsurf 补一段简短 `quickChannelDirective`（含 quick + onboard 一行说明），使其不再被 installer 跳过；trae 已有 directive，追加 onboard 说明行。
- 保持它们无 slash/skill（平台不支持），仅上下文文件里有文字入口。

### Part C — 修两个 bug

**C1.** project.ts:737 完整 onboard 结尾 → 改为 explore 自然语言入口（与 evidence-only 分支一致）。

**C2.** onboard 开头检测 `sovei-flow/project/project.config.json` 或 `AGENTS.md` 缺失 → 打印警告，引导先 `sovei project init . --force`（或提示 onboard 仅补知识、不建骨架）。不强制中断，只提示。

---

## 涉及文件

| 文件 | 改动 |
|---|---|
| `packages/sovei-core/src/adapters/registry.ts` | A1 新增 onboard 生成器 + 挂载；B3 补 gemini/aider/windsurf directive + trae/codex onboard 说明 |
| `packages/sovei-core/src/cli/adapter-selector.ts` | **新增** B1 零依赖 TTY 多选器 + parseAdapterOption |
| `packages/sovei-core/src/cli/commands/project.ts` | A2 GUIDE 重定位；B2 init 接选择器；C1/C2 修 bug |
| `packages/sovei-core/src/cli/commands/adapters.ts` | (可选) adapters install 无参时也用交互选择器，替代当前「只打印列表」 |
| 本仓库 `sovei-flow/project/project.config.json` | 顺带把自身 workflow.version 3.0.0 → 4.0.0（消除启动警告） |

## 验证计划

1. `pnpm --dir packages/sovei-core run check && build`（Node 24）。
2. 现有测试全绿（210）；为 adapter-selector 的 `parseAdapterOption` + onboard 生成器加单测。
3. 活测：
   - `init` 交互选择（TTY）→ 确认每个选中 agent 有 quick + onboard + 12 阶段 slash/技能。
   - `init --adapters none` / 非 TTY → 不安装、有提示。
   - `onboard --evidence-only` → 指令包措辞与 skill 衔接；`/sovei-onboard` 文件存在且内容正确。
   - onboard 未先 init → C2 警告出现。
   - 完整 onboard 结尾 → C1 指向 explore。
4. 重新生成本仓库 `.claude/commands/`（含新 sovei-onboard.md）+ 各上下文文件，确认无残留旧内容。
5. 清理临时测试目录。

## 不做的事（本轮）

- 不改业务地图/红线扫描算法（上次发现的 #3 单包检测、#4 红线 ID 拼接、#5 rescan 冗余）——留作独立打磨轮，避免本次范围膨胀。
- 不动 12 阶段现有 slash 内容。
