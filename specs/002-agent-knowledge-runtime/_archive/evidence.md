# 验证证据

## 需求符合性

| 场景 | 证据 | 结果 |
| --- | --- | --- |
| AC-1 红线候选落盘 | project.ts 写入 redlines-seed.json | 通过 |
| AC-2 红线导入 | governance.ts import 支持 seed 对象 | 通过 |
| AC-3 无 Provider context | context.test.mjs 无外部模型断言 | 通过 |
| AC-4 required 隔离 | context.test.mjs 断言 redline 在 required，candidate 在 suggested | 通过 |
| AC-5 stale 判定 | context.test.mjs 修改后检测 stale | 通过 |
| AC-6 adapter 画像 | agent.test.mjs 四宿主能力差异断言 | 通过 |
| AC-7 回归 | 完整 test 40/40 | 通过 |
| AC-8 版本 | package.json 2.1.0-dev.2 | 通过 |

## 工程质量

- pnpm --dir packages/sovei-core run check：通过
- pnpm --dir packages/sovei-core test：通过，40/40
- git diff --check：通过

## 限制

- 无外部模型配置时使用本地文本匹配，语义检索为可选扩展点。
- 向量数据库、云 LLM SDK、IDE 自动安装、publish 均按计划延期。
- context build CLI 已实现但尚未在子进程测试中验证完整 CLI 流程。

## 结论

通过。下一个开发版具备宿主 Agent 能力画像、版本化知识快照、确定性上下文包、可选 Provider 契约和旧项目红线候选闭环。
