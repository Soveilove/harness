# 变更清单

## TASK-001 统一 JSON 解析

- 新增 `parseProjectJson`，基于 `jsonc-parser` 处理 BOM、注释和尾逗号。
- 接入 ProjectScanner、配置加载、Rules 扫描、Repository 与 adaptation。

## TASK-002 Rules 生命周期闭环

- 新增 `rules deprecate` 与 Repository `deprecate`。
- 保留 provenance，追加 `PROJECT_RULE_DEPRECATED`；重复废弃失败。

## TASK-003 发布与自举

- npm 仅发布压缩混淆的 `dist/release/sovei.js`，不发布 map/源码/内部模块。
- 发布包白名单脚本通过，只包含 README.md、package.json、release CLI。
- dist 清理只移除 map 与 release 目录，避免根 file 依赖和本地测试互相删除内部产物。
- 根本地 CLI、Rules resolve 和 Context build 真实运行通过。

## 验证

- 第一轮完整 check/test：51/51 通过。
- 刷新根 file 依赖后第二轮完整 check/test：51/51 通过。
- 两轮 `verify:package` 均通过。
- 本轮未执行 npm publish。

## 剩余工作

无。
