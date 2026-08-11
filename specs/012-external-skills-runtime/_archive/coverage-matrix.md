# 覆盖矩阵

| 影响面 | 当前入口/组件 | 目标行为 | 证据 | 状态 |
|---|---|---|---|---|
| CLI 初始化 | `project init`、后续新增 `skills install --locked` | 检查 Skill Map/Lock；显式安装锁定依赖；重复初始化不重复下载 | `packages/sovei-core/src/cli/commands/project.ts`、`spec.md` | planned |
| 工作流阶段 | `cli/commands/workflow.ts`、`engine/workflow-engine.ts` | Resolver 按阶段选择 native 或已验证 Adapter | `packages/sovei-core/src/cli/commands/workflow.ts`、`packages/sovei-core/src/engine/workflow-engine.ts` | planned |
| 上下文输入 | `context/builder.ts`、`context/snapshot.ts` | 外部 Skill 只读取受控 Context Pack，不读取任意项目路径 | `packages/sovei-core/src/context/` | planned |
| 产物写入 | `artifacts/repository.ts`、各阶段 Artifact 校验 | 外部结果只能作为候选产物，不能直接改写事实源 | `packages/sovei-core/src/artifacts/`、`stages/index.ts` | planned |
| 状态与完成 | `engine/state-machine.ts`、`engine/event-store.ts` | 只有 WorkflowEngine 追加阶段完成事件；Skill 失败可回退 native | `packages/sovei-core/src/engine/` | planned |
| 版本与来源 | 新增 `harness/skills/skill-map.yaml`、`skill-lock.yaml` | 校验 source/ref/commit/checksum/license，拒绝未锁定依赖 | 设计文档 8、Feature spec | planned |
| 首批适配器 | 新增 `skills/adapters/` | 先支持 `grill`、`spec` 候选适配；`wayfind` 保持 native | Wayfinder D-003、Feature plan | planned |
| 失败路径 | Resolver、Adapter Registry、CLI 报告 | 超时、非法输出、版本不兼容时记录原因并 fallback | Feature spec、Feature tasks | planned |
| 宿主兼容 | Codex/Claude/CodeBuddy/Trae 适配边界 | 适配器协议与宿主调用分离，CLI 不绑定单一 Agent | 设计文档 4/8 | candidate |
| 测试回放 | `packages/sovei-core/test/`、现有 `specs/001-011` | native 与 adapter 对比，验证产物、证据和事件一致性 | Feature spec/plan | planned |
| 文档与发布 | `README.md`、CHANGELOG、发布脚本 | 说明安装、lock、缓存和当前实际启用 Skills | `release-sovei.ps1`、README | planned |

## 当前不在范围

- 不修改业务模块、业务红线和已有 Feature 的历史事实源。
- 不在第一阶段接入 OpenSpec 或 Superpowers 的完整运行时。
- 不自动更新第三方 Skill，不跟随上游 latest。
