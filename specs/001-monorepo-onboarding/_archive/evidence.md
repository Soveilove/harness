# 验证证据

## 需求符合性

| 场景 | 证据 | 结果 |
| --- | --- | --- |
| 根目录无清单的 Monorepo 扫描 | scanner/project 临时文件系统 fixture | 通过：识别 `packages/*`、TypeScript 和限定入口 |
| 根身份与候选知识兼容 | project CLI fixture | 通过：根项目身份保留，生成知识仍为 candidate |
| 运行时中文产物 | WorkflowEngine 与 Wayfinder 测试 | 通过：新模板含中文标题、提示契约、权威规则与决策地图章节 |
| 中文 CLI 与 grill 可见性 | Node 子进程 CLI 测试 | 通过：状态、引导和 `grill 已触发` 说明为中文；原 `sovei workflow grill <feature>` 命令不变 |
| 静态模板 | 13 个模板逐文件测试 | 通过：Markdown 审核标题均为简体中文 |

## 工程质量

- `pnpm --dir packages/sovei-core run check`：通过。
- `pnpm --dir packages/sovei-core test`：通过，34/34。
- `git diff --check`：通过。

## 限制

- 没有多语言配置，本版本固定默认简体中文。
- 命令、阶段 ID、状态值、事件和 JSON/YAML 字段仍是英文机器标识。
- 隔离真实 CLI 的临时目录清理命令被运行环境策略拦截且未执行；WorkflowEngine 运行时产物和 CLI 子进程已分别覆盖生成逻辑与入口行为。

## 结论

通过。revision 1 同时保留 Monorepo 初始化扫描能力，并将面向审核的 Sovei 产物和引导默认切换为简体中文。
