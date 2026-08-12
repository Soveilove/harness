# Spec — 029-feature-summary

> Feature：`sovei feature summary <id>` — 生成聚合人可读视图（P1-2）
> 阶段：spec（需求翻译与验收定义）

## 问题

Feature 目录里有 `workflow-events.jsonl`（事件流）、`workflow-state.yaml`（状态）、十几个阶段产物 `.md` 文件，但**没有一个跨阶段聚合的人可读视图**让人一眼看懂"这个 Feature 做了什么、走到哪、改了什么、怎么验证的"。查看一个 Feature 的来龙去脉需要人工翻阅多个文件。

`feature archive`（P1-1）已把过程产物折叠到 `_archive/`，进一步增大了"想看懂但找不到入口"的困难。

## 目标（做什么）

新增 `sovei feature summary <id>` 命令，从 Feature 的事件流 + 各阶段产物生成一个聚合的 `summary.md`，按"需求 → 决策 → 变更 → 验证 → 经验 → 结论"的故事线组织，让人一眼看完整个 Feature。

支持 `--json` 输出结构化视图，供脚本/CI 消费。

## 不做什么（边界）

- **不**实现"独立 docs 系统"（DEV_BACKLOG 已否决：docs 不进 git 会引入 clone 后不可见问题）。
- **不**做跨 Feature 的聚合索引（如"列出所有 Feature 的 summary"），本次只做单 Feature。
- **不**改写各阶段产物本身（只读不改），summary 是只读聚合视图。
- **不**引入任何第三方依赖（零运行时依赖约束）。
- **不**要求 Feature 必须 completed（对 in_progress 也生成进度快照）。

## 用户可见行为

1. 运行 `sovei feature summary <id>`：
   - 在 Feature 目录顶层生成/覆盖 `summary.md`。
   - 控制台打印 summary.md 的路径 + 简短的生成摘要（含多少阶段、多少决策、多少任务、多少门禁覆盖）。
2. 运行 `sovei feature summary <id> --json`：
   - 控制台打印结构化 JSON（不写文件），含：featureId、status、riskLevel、stages（按序含产物）、decisions、tasks、overrides、artifacts 清单。
3. 对不存在的 Feature ID：报错"Feature 不存在"。
4. 对产物缺失/阶段未执行：对应章节降级显示"未执行"/"无"，不崩溃。

## 验收标准

- **AC1**：对已完成 Feature（027-quick-overdefense-fix 等真实样例），`feature summary <id>` 生成 `summary.md`，包含"需求/决策/变更/验证/经验/结论"六个核心章节，且内容与实际产物一致。
- **AC2**：归档后的 Feature（过程产物在 `_archive/`），summary 仍能还原"变更/验证"等依赖过程产物的章节（验证 D5 回退逻辑）。
- **AC3**：`--json` 输出是合法 JSON，含 `featureId`、`stages`、`decisions`、`tasks`、`overrides` 字段。
- **AC4**：对 in_progress Feature，能生成进度快照，未执行阶段显示"未执行"，不报错。
- **AC5**：对不存在的 Feature，报清晰错误且退出码非 0。
- **AC6**：`summary.md` 写入走 `StorageBackend.write`（红线 STORAGE_WRITE_DISCIPLINE），非裸 `node:fs` 覆盖。
- **AC7**：全部既有测试不回归（179+ 通过），新增 feature-summary 测试覆盖 completed / 归档后 / in_progress / 不存在 / --json。

## 排除项

- 不做跨 Feature 聚合索引。
- 不做 summary 内容的二次 AI 蒸馏（只做确定性数据组装 + 段落提取，不做大模型改写）。
- 不改动 archive 的持久文件白名单逻辑（summary.md 是新增顶层产物，与 archive 共存）。
