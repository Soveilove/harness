# 影响范围

## 入口与消费者

- 项目初始化：`project onboard` → ProjectScanner → Rules adaptation / redline seed / business map。
- 规则命令：`rules adapt|validate|activate|list|resolve`，新增 `deprecate`。
- 上下文：ContextBuilder 将 active required Rules 放入 required，将 active advisory Rules 放入 suggested。
- 发布：根发布脚本 → check → test/build → tarball 白名单 → npm OTP 发布。
- 自举：根 package.json 的本地 file 依赖 → `pnpm exec sovei`。

## 数据与状态

- Rules 文档：`harness/project/rules/*.rules.json`，Schema 版本 1。
- Rules 审计：`harness/project/rules/rule-events.jsonl`，追加式事件。
- 生命周期：candidate → active → deprecated；允许 candidate → deprecated 以驳回候选。
- 发布产物：本地 dist 可含测试模块和声明，但不得含 map；npm 仅含 release bundle。

## 兼容与恢复

- 标准 JSON 行为不变；BOM/JSONC 是兼容扩展。
- 非法 JSON 或非法 Rules Schema 继续失败关闭。
- 废弃保留原文件、provenance 与事件，可审计但不参与 resolve/context。
- 发布脚本默认阻止脏工作区；本轮不执行 npm publish。

## 架构压力

- JSON 解析目前在 Scanner、Rules Repository、adaptation 中重复，属于可消除的一致性压力。
- Rules 模块边界清晰，无需扩大到工作流阶段或知识仓库重构。
- 发布脚本与测试构建存在同一 dist 的竞争风险，采用不递归删除整个 dist 的最小修复。
