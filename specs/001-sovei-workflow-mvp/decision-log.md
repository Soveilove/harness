# 决策记录

## D-001 外部 Skill 存储

- 决策：采用版本锁文件 + 本地安装缓存，不在 Phase 1 提交完整 vendor 副本。
- 原因：避免许可证、体积和自动更新污染稳定 Harness；任何外部能力都必须固定 ref 并人工升级。
- 状态：accepted

## D-002 Feature 状态文件

- 决策：每个 Feature 使用独立 `workflow-state.yaml`；`.specify/feature.json` 只负责项目当前 Feature 指针。
- 原因：指针与状态机职责不同，混用会让同步保护和会话恢复互相耦合。
- 状态：accepted

## D-003 日常入口

- 决策：Phase 1 使用 `load` 作为唯一入口，不增加 `start` 别名。
- 原因：先验证状态恢复契约；别名没有新增能力，只会扩大未验证 API 表面。
- 状态：accepted

## D-004 Codex 命令形态

- 决策：Codex 使用显式 `$sovei-workflow` Skill；`/sovei-*` 只作为跨 IDE 概念命令名称。
- 原因：Codex 官方已将自定义 slash prompts 标为 deprecated，仓库共享工作流应使用 `.agents/skills`。
- 状态：accepted

## D-005 单阶段调用与 Skill 可替换性

- 决策：每次用户调用只执行一个 Sovei 阶段，即使一次请求多个阶段也不得串联；每个阶段必须从 `skill-map.yaml` 报告实际内部 Skill、实际第三方 Skill、候选和备选。
- 原因：完整工作流无法可靠容纳在单次 AI 上下文中；第三方依赖只有逐项显式登记，后续替换和版本审计才不会依赖隐含提示词。
- 状态：accepted

## D-006 中枢系统 Package

- 决策：使用 `packages/sovei-system` 作为私有 pnpm package，集中保存中枢工具、Node 依赖和 lockfile；该 package 不分发到产品工程。
- 原因：系统需要像普通项目一样持续迭代并可重复安装依赖，同时不能让中枢开发依赖渗透到 A/B/C 的 Harness 运行时。
- 状态：accepted

## D-007 唯一工作流使用指引

- 决策：`harness/workflows/sovei/USAGE.md` 是唯一 Sovei 使用指引，并由 `workflow.yaml`、registry 和 Validator 显式引用；ABC 同步仍只看根目录 `SYNC.md`。
- 原因：阶段命令与系统维护、工程同步属于不同权限边界；统一入口可以防止把 Future 命令、package 命令或 Pull 操作误当成可连续执行的 Feature 阶段。
- 状态：accepted

## Grill-lite 结论

- 任务目标、写入范围和第一阶段边界已经由现有架构基线明确。
- 没有需要用户重新决定的阻塞问题。
- `wayfind`：not_required，本切片文件边界清晰且可在单次上下文完成。
