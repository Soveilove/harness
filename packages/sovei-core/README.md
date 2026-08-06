# Sovei

Sovei 是一个便携式 TypeScript 工作流引擎，提供开发 SOP、类型化项目知识、
决策地图、重大变更控制和演进式架构治理。

## 安装

```bash
npm install -g @soveilove/sovei
sovei --version
sovei --help
```

## 快速上手

### 新项目

```bash
sovei project init ./my-app --framework vue --language typescript
```

创建目录结构，按技术栈写入种子知识，并生成 `AGENTS.md` 让所有 AI agent
（Codex、Claude Code、Cursor 等）自动发现 Sovei。

### 老项目接入

对于已有代码但没有 Sovei 的项目：

```bash
cd your-existing-project
sovei project init . --force
sovei project onboard --evidence-only
```

`--evidence-only` 会采集证据（目录结构、import 关系、正则命中），然后打印一段
**AGENT ONBOARDING GUIDE**。把整段输出复制给你的 AI agent，agent 会：

1. 读取证据文件，对照真实源码验证每个业务能力
2. 读代码识别业务红线（认证、计费、数据完整性等）
3. 通过 Sovei CLI 命令写入候选红线和知识
4. 生成 `harness/project/onboard-report.md` 供人工审核

agent 完成且人工审核后：

```bash
sovei governance redline list
sovei knowledge list --lifecycle candidate
cat harness/project/onboard-report.md
```

审核通过后，才开始正式开发：

```bash
sovei workflow bootstrap 001-first-feature
```

### Feature 开发工作流

每次调用只执行一个阶段：

```text
load → grill → wayfind → spec → scope → plan → tasks → implement
→ converge → verify → learn → sync
```

```bash
# 初始化新 Feature
sovei workflow bootstrap 001-my-feature

# 获取阶段提示词 + 上下文包，交给 AI agent
sovei context build --stage grill 001-my-feature

# 准备阶段（创建产物模板）
sovei workflow grill 001-my-feature

# 完成阶段并推进
sovei workflow grill 001-my-feature --complete
```

### 需求对齐与确认门

spec 阶段产出 `reconciliation.md`（需求对齐文件），还原代码现状、翻译 PM
需求、列出方案代价、提取确认疑问。

渲染技术审查和产品审查两个视图：

```bash
sovei governance review-pack generate 001-my-feature
# 生成 specs/001-my-feature/tech-review.md 和 product-review.md
```

PM 在 product-review.md 签字后导入确认：

```bash
sovei governance review-pack import 001-my-feature
  --product specs/001-my-feature/product-review.md
  --by "张三" --reference "PRD-001"
```

技术负责人单独确认：
```bash
sovei workflow confirm 001-my-feature --stage spec --role tech
  --by "李四" --reference "JIRA-123"
```

确认门在 spec（S2/S3 风险）和 verify（所有风险）后自动阻塞。
可带理由覆盖（审计留存）：
```bash
sovei workflow override-confirm 001-my-feature --stage verify --role product
  --by "王五" --reason "紧急热修复，事后补审"
```

### 跨 Feature 上下文

开发新 Feature 时，加载其他 Feature 的决策日志，让 agent 理解之前做了什么：

```bash
sovei context build --stage spec 002-next-feature --cross-feature
```

## 命令速查

| 命令 | 用途 |
|---|---|
| `sovei project init <path>` | 初始化新项目 |
| `sovei project onboard` | 扫描已有项目并初始化知识 |
| `sovei project onboard --evidence-only` | 采集证据 + 打印 agent 指南 |
| `sovei project status` | 查看项目状态 |
| `sovei project map` | 查看业务拓扑 |
| `sovei workflow bootstrap <feature>` | 初始化新 Feature |
| `sovei workflow <stage> <feature>` | 准备阶段 |
| `sovei workflow <stage> <feature> --complete` | 完成阶段并推进 |
| `sovei workflow confirm <feature> --stage --role --by --reference` | 确认门签字 |
| `sovei workflow override-confirm <feature> --stage --role --by --reason` | 覆盖确认门 |
| `sovei context build --stage <stage> <feature>` | 获取上下文包 |
| `sovei context build --stage spec <feature> --cross-feature` | 包含其他 Feature 决策 |
| `sovei governance redline add/list/update/deactivate` | 管理业务红线 |
| `sovei governance review-pack generate/import` | 需求对齐审查文件 |
| `sovei knowledge add/list/promote` | 管理项目知识 |
| `sovei rules adapt` | 适配已有 Agent/IDE 规范 |
| `sovei architecture scan/status/check` | 演进式架构治理 |

## 架构

- **壳料分离**：`packages/sovei-core/` 是壳（换项目保留），
  `harness/project/` 是料（换项目清空）。
- **状态机**：纯函数 reducer + 事件溯源，所有状态变更通过 EventStore 追加。
- **知识生命周期**：candidate → pending → stable，单次观察不得直接晋级。
- **确认门**：按风险等级自动阻塞，不是第 13 个阶段。
- **三层 agent 模型**：脚本采集证据，agent 做语义判断，人做最终决策。

## 版本

当前稳定版：`2.5.0`，npm `latest` 渠道。

仓库：https://github.com/Soveilove/sovei

## 反馈

- 提交 Bug 或功能建议：[Issues](https://github.com/Soveilove/sovei/issues)
- 讨论与提问：[Discussions](https://github.com/Soveilove/sovei/discussions)