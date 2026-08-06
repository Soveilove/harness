# Reconciliation: 012-external-skills-runtime 外部 Skills 运行时接入

## Need Translation

用户希望第三方 Skills 真正进入 Sovei 的开发流程，并在 CLI 初始化时完成依赖检查或安装，避免分享稿中把“参考过”误说成“已经接入”。

技术上需要建立一条可复现、可审计、可回退的运行时链路：项目声明需要哪些 Skills，lock 固定具体版本，CLI 按锁定信息安装或检查缓存，workflow 阶段通过 Adapter 调用，最终仍由 Sovei 校验产物并决定是否完成阶段。

## Current State

当前 `packages/sovei-core` 已实现十二个 Sovei 原生阶段、WorkflowEngine、Artifact 校验、知识库和 Wayfinder 决策地图。当前 CLI 没有第三方 Skill loader、vendor lock、安装器或运行时 import；OpenSpec、Superpowers、Wayfinder 和 Matt Pocock Skills 是设计参考或候选适配对象。

当前 Feature 已按 Sovei 流程完成 `load`、`grill` 和 `wayfind`。`wayfind` 的决策结论记录在 `wayfinder-events.jsonl` 和决策票中：安装采用缓存加项目 lock，运行时默认 native，首批只验证 `grill` 和 `spec`。

## Solutions

### Solution A: 将第三方 Skills 直接打包进 CLI

- CLI 发布包内携带所有第三方 Skill 内容，安装后立即可用。
- cost: CLI 体积、许可证和上游升级耦合；无法按项目选择版本；容易把第三方实现误当成 Sovei 核心能力；离线和安全审查边界不清晰。

### Solution B: CLI 管理缓存，项目使用 skill-map 和 skill-lock

- CLI 本体只包含协议、Resolver、Adapter 和 native fallback；项目 lock 固定来源、版本、commit、checksum 和许可证；`sovei init` 检查，`sovei skills install --locked` 安装，workflow 只调用已验证绑定。
- cost: 需要增加 lock 解析、缓存治理、适配器、失败回退和历史 Feature 回放；初期实现比直接打包更复杂。
- decision: 采用。它能让 CLI、项目配置和第三方实现分别版本化，并保留可审计的 native fallback。

## Questions

### [product] Q1: 初始化时是否自动下载所有候选 Skills？

- recommendation: 不自动下载所有候选；`sovei init` 只检查并报告，`sovei skills install --locked` 才按项目 lock 安装。
- options: [初始化自动安装已锁定 Skills] [初始化只检查，显式命令安装]
- decision: 采用“初始化只检查，显式命令安装”，避免初始化过程受网络、许可证或上游状态影响。

### [tech] Q2: 外部 Skill 能否直接修改 Feature 产物或宣布阶段完成？

- recommendation: 不能。外部 Skill 只接收只读 Context Pack 并返回候选结果；Artifact Validator 和 WorkflowEngine 保留写入和完成判定。
- decision: 已确认。

### [tech] Q3: 第一批先接入哪些 Skills？

- recommendation: 先验证 `grill-me` / `grilling` 和 `domain-modeling` / `to-spec`；`wayfind` 保持 Sovei 原生。
- decision: 已确认。

## Agent 接入机制（参考 OpenSpec / SpecKit 调研）

已接入的 skills 最终要让开发 Agent（Codex、Cursor、Claude Code 等）在运行时实际使用。调研 OpenSpec 与 SpecKit 后归纳共性：

- **OpenSpec**：单源规则模块（`.openspec/modules/`）→ `sync` 编译出 `CLAUDE.md`、`.cursorrules`、`GEMINI.md`、`AGENTS.md` 等 7+ 种上下文文件。Agent 读取对应文件即获得能力与调用方式；`npx openspec analyze && sync` 一行接入。
- **SpecKit**：初始化骨架后模板注入 `/speckit.*` 斜杠命令（constitution → specify → plan → tasks → implement），Claude Code 等通过斜杠命令驱动流程；也可通过 subagent 自动按序执行。

**本项目决策**（与 Sovei 现有 `AGENTS.md 声明 + CLI 命令` 模型一致）：

1. 复用现有 `adapters/registry.ts` 的 IDE 适配器模型，为每个适配器声明其上下文文件（`AGENTS.md` / `CLAUDE.md` / `.cursorrules`）。
2. `sovei skills sync` 把 skill-map 的绑定渲染进这些文件，用 sentinel 段落 upsert，不覆盖用户已有内容（等价于 OpenSpec 的 sync）。
3. 复用 `sovei workflow <stage> <feature>` 作为 Agent 调用的统一入口：Agent 读到"该阶段绑定哪个 skill"后，仍通过 Sovei CLI 执行，skills 保持只读、产候选、由 Sovei 校验。
4. 不做 SpecKit 式斜杠命令注入：Sovei 已有完整的阶段命令与门禁，斜杠命令会绕过 Sovei 的完成判定，违背"外部 Skill 不拥有工作流状态"的边界。

## Sign-off

- [x] product: 用户已确认按 Sovei 流程推进，并采用显式安装策略。
- [x] tech: Codex 已根据仓库代码、设计文档和 Wayfinder 决策完成技术对齐。

## 停止条件

当前没有会改变用户行为或接入范围的未决事项。具体 Skill 的上游仓库 commit 和 checksum 在实现阶段安装并审查后写入 lock，不在本阶段伪造。
