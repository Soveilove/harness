# 影响范围：SC-001-scanner-polish-02

## 影响模块

- `src/config/scanner.ts`：workspace glob 收集与 package manifest 发现。
- `src/config/json.ts`：已有 JSONC/BOM 解析能力复用。
- `src/config/tech-stack.ts`：包技术栈检测复用。
- `test/scanner.test.mjs`、`test/scanner-polish.test.mjs`：包发现回归。

## 数据流

根 package.json / pnpm-workspace.yaml / lerna.json + directoryMap → workspace globs → package.json manifest paths → package metadata、techStack、entryPoints。

## 边界

仅改变包发现输入覆盖，不改变包输出结构和业务地图 schema。无外部 API、异步回调或运行时持久状态。

## 验收覆盖

根 workspaces、pnpm、lerna、标准目录兜底、嵌套包、malformed manifest 保持兼容。
