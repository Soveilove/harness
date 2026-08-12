---
name: cli
description: Node.js CLI 工具开发规范。当用户开发命令行工具、使用 commander/yargs、需要零依赖打包、跨平台路径处理、TTY 检测时唤起。
---

# CLI 工具开发技能

## 核心规范

### 参数解析
- 优先 commander（声明式、子命令友好）或 yargs（高级校验、middleware）。
- 必填参数缺失时给出可读错误并打印 `--help`，不要抛裸栈。
- 长短选项成对提供（`-V, --version` / `-h, --help`），遵循 POSIX 风格。
- 环境变量与 flag 可互为 fallback，优先级：显式 flag > 环境变量 > 默认值。

### 零运行时依赖原则
- 核心命令逻辑尽量只用 Node 内置模块（fs/promises、path、child_process、readline）。
- 第三方依赖仅在明显收益时引入，并在 README 列出依赖理由。
- 推荐单文件打包（esbuild bundle，target=node18，platform=node，format=esm/cjs），便于全局分发。
- shebang 首行 `#!/usr/bin/env node`，package.json `"bin"` 字段正确映射。

### 跨平台路径处理
- 始终用 `path.join` / `path.resolve`，禁止字符串拼接路径分隔符。
- 处理 Windows 盘符与大小写差异，文件名避免保留字符（`<>:"/\|?*`）。
- 换行符用 `os.EOL` 或显式 `'\n'`，避免 CRLF/LF 混入。

### TTY 检测与降级
- `process.stdout.isTTY` 判断交互能力，非 TTY 时禁用 spinner、颜色、进度条、清屏。
- 颜色输出用 chalk / picocolors，自动检测 `NO_COLOR` 与 `FORCE_COLOR`。
- 管道场景输出结构化（JSON 行），便于下游工具消费。
- 交互提示（确认、选择）用 prompts / enquirer，非 TTY 时报错或走默认值。

### 退出码约定
- 成功 `exit 0`，错误非零（通用错误 1，参数错误 2，权限错误 126/127）。
- 错误信息输出到 `stderr`，正常输出到 `stdout`，便于重定向。
- `process.exit` 前确保流已 flush，或用 `process.exitCode = 1` 让事件循环自然退出。
- 信号处理：捕获 SIGINT/SIGTERM 做清理后退出（exit code 130 = SIGINT）。
