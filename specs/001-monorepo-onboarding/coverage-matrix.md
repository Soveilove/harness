# 覆盖矩阵

| 验收项 | 代码入口 | 验证 |
| --- | --- | --- |
| AC-1~AC-4 Monorepo 扫描兼容 | `config/scanner.ts`、`project.ts` | 现有 scanner/project fixture 与完整测试 |
| AC-5 中文阶段产物 | `workflow-engine.ts`、`stages/index.ts` | 临时 Feature prepare 产物断言 |
| AC-6 中文 CLI | `workflow.ts`、`project.ts`、`cli/index.ts` | 子进程 stdout/stderr 断言 |
| AC-7 静态模板一致 | `harness/templates/sovei/*.md` | 文件扫描，不允许旧英文骨架标题 |
| Wayfinder 中文投影 | `wayfinder/repository.ts` | 现有 Wayfinder fixture 增加 Markdown 断言 |
| 扫描知识中文章节 | `config/scanner.ts` | scanner fixture 断言中文标题 |

UI、网络 API、鉴权、计费与异步回调不适用。本功能的恢复路径是保留机器标识、运行完整回归测试并验证事件回放状态不变。
