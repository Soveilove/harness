# 任务清单：017-node14-compat

> Feature：017-node14-compat — 发布产物支持 Node 14 运行
> 依赖：plan.md 的实验结论（esbuild CJS 自动去 node: 前缀、createRequire(import.meta.url) 用 banner+define 处理、.at() 必须手动替换）

## 任务

- [x] TASK-001: 源码 `.at(-1)` 替换为 `arr[arr.length - 1]`（workflow-engine.ts 2 处、business-map-scanner.ts 1 处）
- [x] TASK-002: 处理 `createRequire(import.meta.url)` 在 CJS 产物的兼容（build-release.mjs 用 banner+define 注入 `__META_URL__` shim）
- [x] TASK-003: 构建脚本适配（build-release.mjs 改 format cjs / target node14 / 输出 sovei.cjs / externalModules 正则；clean-dist.mjs 替换 import.meta.dirname）
- [x] TASK-004: package.json 声明（engines.node >=14.18.0；files/bin 指向 sovei.cjs；同步 verify-package.mjs、release.test.mjs）
- [x] TASK-005: Node 20+ 全量回归（tsc --noEmit + 107 测试 + verify:package）
- [x] TASK-006: Node 14 smoke 验证（--version/--help/project status/workflow status）+ README 环境要求更新

## 阻塞关系

- TASK-003 依赖 TASK-001、TASK-002（源码改完才能构建）。
- TASK-004 依赖 TASK-003（产物形态先定）。
- TASK-005、TASK-006 依次依赖前序。

## 任务详情（验收依据）

### TASK-001: 源码 `.at(-1)` 替换
- **文件**：`src/engine/workflow-engine.ts`（:380、:394）、`src/config/business-map-scanner.ts`（:192）
- **验证**：`tsc --noEmit` 通过；乐观锁测试、scanner 测试通过。

### TASK-002: `createRequire(import.meta.url)` CJS 兼容
- **文件**：`scripts/build-release.mjs`
- **做法**：`banner: { js: "var __META_URL__ = require('url').pathToFileURL(__filename).href;" }` + `define: { 'import.meta.url': '__META_URL__' }`。源码不改。
- **验证**：`tsc --noEmit` 通过；`--version` 与 package.json 一致（CJS 产物下）。

### TASK-003: 构建脚本适配
- **文件**：`scripts/build-release.mjs`、`scripts/clean-dist.mjs`
- **验证**：`pnpm build` 成功，产出 CJS 单文件。

### TASK-004: package.json 声明
- **文件**：`packages/sovei-core/package.json`、`scripts/verify-package.mjs`、`test/release.test.mjs`
- **验证**：`verify:package` 通过，产物 `.cjs` 且 shebang 正确。

### TASK-005: Node 20+ 全量回归
- **验证**：`tsc --noEmit` + `node --test`（107）+ `verify:package` 全绿。

### TASK-006: Node 14 smoke + README
- **验证**：Node 14.21.3 上 `--version`/`--help`/`project status`/`workflow status` 正常；README 更新。
