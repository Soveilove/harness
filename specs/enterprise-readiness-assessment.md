# Sovei CLI 企业级就绪度评估

> 评估日期：2026-08-10 | 版本：2.5.8 | 测试：164/164

---

## 一、CLI 完整度审计

### 命令树总览：14 个命令组，~75 个子命令

| 命令组 | 子命令数 | 核心能力 | 状态 |
|---|---|---|---|
| `workflow` | 19 | 12 阶段工作流 + 变更管理 + 确认门禁 | ✅ 完整 |
| `context` | 4 | 上下文包构建 + 预算截断 + 子 Agent 契约 | ✅ 完整 |
| `quick` | 1 | 快速通道（.gitignore 自动排除 + --json） | ✅ 完整 |
| `governance` | 7 | 红线 CRUD + branch 隔离 + review-pack | ✅ 完整 |
| `knowledge` | 7 | 知识生命周期（candidate→pending→stable） | ✅ 完整 |
| `project` | 5 | 初始化 + onboard + 业务拓扑 + --adapters | ✅ 完整 |
| `rules` | 7 | 工程规范：校验/适配/激活/精炼/废弃 | ✅ 完整 |
| `architecture` | 6 | 架构健康扫描 + 债务登记 + CI 检查 | ✅ 完整 |
| `skills` | 10 | 外部 Skill 安装/升级/diff/sync | ✅ 完整 |
| `wayfinder` | 10 | 决策地图 + 工单 + fog + 认领 | ✅ 完整 |
| `adapters` | 2 | IDE 适配器安装/列表 | ✅ 完整 |
| `agent` | 2 | 适配器能力画像 | ✅ 完整 |
| `workspace` | 6 | 多工作区注册/sync/promote/preflight | ✅ 完整 |

### `--json` 输出覆盖

| 支持 --json | 不支持 --json |
|---|---|
| adapters list, architecture scan, context build, context cross-feature-index, quick, rules list, rules resolve | governance\*, knowledge\*, project\*, skills\*, wayfinder\*, workflow\*, workspace\* |

**差距**：`workflow`、`knowledge`、`workspace` 等核心命令缺少 `--json` 输出，影响 CI/CD 集成和脚本编排。

---

## 二、企业级能力评估

### ✅ 已具备的企业级能力（9 项）

| # | 能力 | 成熟度 | 说明 |
|---|---|---|---|
| 1 | **结构化开发工作流** | ★★★★★ | 12 阶段闭环 + 确认门禁 + 变更管理 + 返工机制 |
| 2 | **业务红线治理** | ★★★★☆ | CRUD + branch 隔离 + 审计历史 + 人工审查视图 |
| 3 | **知识管理** | ★★★★☆ | trust-but-verify 生命周期 + 自动晋级 + 知识对账 |
| 4 | **上下文预算管理** | ★★★★☆ | scoped 模式 + 字符预算截断 + cross-feature Top-N |
| 5 | **多工作区协作** | ★★★★☆ | Hub-Satellite + 知识同步 + merge preflight |
| 6 | **快速通道** | ★★★★☆ | 六步闭环 + Git diff 验证 + .gitignore 自动排除 |
| 7 | **IDE 适配** | ★★★☆☆ | 4 IDE（Trae/CodeBuddy/CC/Codex）+ slash command |
| 8 | **外部 Skills** | ★★★☆☆ | 安装/升级/diff/sync + 8 阶段绑定 |
| 9 | **架构健康** | ★★★☆☆ | 扫描 + 债务登记 + CI 检查 |

### ❌ 缺失的企业级能力（8 项）

| # | 能力 | 影响 | 优先级 |
|---|---|---|---|
| 1 | **过期感知（L1）** | 个人开发者不知道治理资产是否可信——最核心痛点 | **P0** |
| 2 | **load 阶段太薄** | 不产出文件/无 postExecute/知识加载不全，grill 从零开始 | **P1** |
| 3 | **CI/CD 集成模板** | 企业无法在流水线中强制走 sovei（个人暂不需要） | **P2** |
| 4 | **`--json` 全覆盖** | workflow/knowledge/workspace 等命令无法被脚本消费（个人需求低） | **P2** |
| 5 | **团队协作** | 无多用户角色/权限/审计中心 | **P2** |
| 6 | **统一关系模型** | 业务地图/代码地图/红线/知识分散在不同 JSON | **P2** |
| 7 | **企业文档** | 无部署指南/管理员手册 | **P2** |
| 8 | **备份/迁移** | 无备份恢复工具 | **P2** |

### Drift Detection 为什么不做

**核心判断**：没有强制门禁，drift 一定发生，做检测也没用；有强制门禁，drift 不会发生，不需要检测。

| 层次 | 策略 | 说明 |
|---|---|---|
| **个人** | 过期感知（L1）| `context build` / `quick` 时对比当前 HEAD 和上次 sync 的 baselineRevision，提示"自上次 sync 以来已有 N 个新提交，治理资产可能不可信" |
| **企业** | CI 门禁强制 | CI/CD 模板强制运行 `sovei quick` / `architecture check`，不走就不让合 → drift 不会发生 |
| **不做** | 语义 drift（L3）| 需要统一关系模型 + 影响分析引擎，行业级未解问题（OpenSpec/SpecKit/Superpower 都没解决） |

**个人层面的"过期感知"已有基础设施**：`baselineRevision` 记录在 workflow-state.yaml 和 usage 事件里，只差一个对比提示。个人开发者看到提示后，以当前工作分支为基线重新校准即可。

---

## 三、成熟度评分

| 维度 | 评分 | 说明 |
|---|---|---|
| **功能完整度** | 80/100 | 核心工作流完整，CI/CD 集成和 --json 全覆盖是 P0 缺口 |
| **测试覆盖** | 80/100 | 164 条测试覆盖核心路径，但无 E2E 测试、无压力测试 |
| **文档** | 50/100 | 有 AGENTS.md 和 README，但无企业部署指南、管理员手册 |
| **CI/CD 就绪** | 30/100 | `architecture check --fail-on` 是唯一 CI 入口，无流水线模板 |
| **多团队协作** | 40/100 | Hub-Satellite 架构就位，但无权限/角色/审计中心 |
| **可观测性** | 50/100 | usage.jsonl 事件流 + 架构快照，但无 dashboard/alerting |
| **向后兼容** | 90/100 | 严格向后兼容策略，无 breaking change |
| **零依赖** | 95/100 | 发布产物单文件 CommonJS，零运行时依赖 |

**综合评分：72/100 — 核心引擎成熟，个人级就绪差过期感知 L1**

---

## 四、当前开发任务优先级（个人级就绪优先）

### 必须做（个人级就绪）

| 步骤 | 项 | 理由 | 预估工作量 |
|---|---|---|---|
| **1** | **过期感知（L1）** | 个人开发者最核心痛点——绕过 Sovei 改了代码后，下次用 Sovei 时需要知道"治理资产可能不可信"。对比 HEAD vs baselineRevision，提示重新校准 | 小（已有基础设施） |
| **2** | **load 阶段增强** | 补齐知识加载 + postExecute + 产出 load-summary.md，改善日常使用体验 | 中 |
| **3** | **README 版本同步** | README 仍写 2.5.7，需同步到 2.5.8 | 小 |
| **4** | **Feature 遗留清理** | 4 个 Feature 卡 in_progress，需归档 | 小 |

### 应该做（3.0 后）

| 步骤 | 项 | 理由 |
|---|---|---|
| 7 | 统一关系模型（问题四） | Graph Coding 核心，keystone 能力 |
| 8 | 场景一 P1（spec 分层 git + 归档 + 知识阈值） | 长期项目维护 |
| 9 | 企业文档（部署指南 + 管理员手册） | 降低采用门槛 |
| 10 | 备份/迁移工具 | 数据安全 |

### 不做（第一期）

| 项 | 理由 |
|---|---|
| **Drift Detection（L3 语义级）** | 行业未解问题。没有门禁 drift 一定发生，有门禁不需要检测。个人用 L1 过期感知 + 基线重新校准即可，企业靠 CI 门禁强制。OpenSpec/SpecKit/Superpower 都没解决。 |

---

## 五、结论

### 能否支持个人级？

**接近了。** 核心工作流引擎成熟，快速通道 + 上下文预算 + IDE 适配器已就位。唯一缺口是**过期感知 L1**——个人绕过 Sovei 改代码后，下次用 Sovei 不知道治理资产可能不可信。

### 个人级就绪路径

完成步骤 1-4（过期感知 L1 + load 增强 + README 同步 + Feature 清理）即可达到个人级就绪。

- L1 过期感知是小工作量（已有 baselineRevision 基础设施）
- load 增强是体验改善
- README + Feature 清理是收尾

### 企业级推广路径

个人级就绪后，如果企业有条件推广门禁：
1. 补 `--json` 全覆盖 + CI/CD 模板
2. 流水线强制运行 `sovei quick` / `architecture check`
3. drift 不发生 → 不需要 drift detection

### 版本规划建议

| 版本 | 目标 | 内容 |
|---|---|---|
| **2.6.0** | 个人级就绪 | 过期感知 L1 + load 增强 + README 同步 + Feature 清理 |
| **3.0.0** | 架构升级 | 统一关系模型 v1 |
| **3.x** | 企业级就绪 | --json 全覆盖 + CI/CD 模板 + 企业文档（当企业有推广条件时） |

### Drift Detection 的正确解法

**不是做检测，而是做门禁。**

- 个人：L1 过期感知 → 知道不可信 → 以当前分支为基线重新校准
- 企业：CI 门禁强制走 sovei → 不走不让合 → drift 不发生
- 第一期不做 L3 语义 drift——行业未解问题（OpenSpec/SpecKit/Superpower 都没解决）
