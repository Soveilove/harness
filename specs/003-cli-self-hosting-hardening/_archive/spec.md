# CLI 自举与初始化加固规格

## 问题

Sovei 已能扫描旧项目并生成 Rules、业务地图和红线候选，但不同模块对 JSON/BOM/JSONC 的处理不一致；Rules 生命周期缺少可审计退出路径；发布包曾暴露 source map 和内部模块结构。

## 用户可见行为

1. `project onboard` 与 `rules adapt/validate/activate/deprecate` 能处理 Windows BOM 的合法 JSON。
2. JSONC 中的注释和尾逗号可被受控解析，字符串中的 `https://` 不得被破坏。
3. `rules deprecate <id> --reviewer <name> --reason <reason>` 将 active 或 candidate 规则标记为 deprecated，并写入事件日志；不删除历史。
4. npm 发布包只包含压缩混淆的 CLI、包声明和说明文件，不包含 map、TypeScript 源码或内部模块。
5. 仓库本地通过 `pnpm exec sovei` 使用当前 `dev.2`，不依赖全局 CLI。

## 验收场景

- 带 BOM、URL 和 JSONC 尾逗号的包声明与规则文件可被解析。
- 重复规则 ID、非法 Schema 继续失败关闭。
- 激活后可废弃，事件日志同时保留激活和废弃证据；重复废弃被拒绝。
- 完整测试连续运行两次均通过。
- 混淆后的发布 CLI 可运行 `--version` 与 `--help`。
- tarball 白名单检查只报告 README、package.json、dist/release/sovei.js。

## 明确排除

- 不声称 JavaScript 获得密码学加密。
- 不发布 `2.1.0-dev.2`。
- 不在本轮重写全部 CLI 文案或接入外部 CodeGraph 服务。
