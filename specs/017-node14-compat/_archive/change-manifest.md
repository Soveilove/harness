# 变更清单

> 由 Sovei 阶段生成：implement
> Feature：017-node14-compat — 发布产物支持 Node 14 运行

## 任务完成情况

| 任务 | 状态 | 验证 |
|---|---|---|
| TASK-001 源码 `.at(-1)` 替换 | 完成 | tsc + 107 测试 |
| TASK-002 createRequire 的 CJS 兼容（banner+define） | 完成 | tsc + --version（Node14） |
| TASK-003 构建脚本适配（format/target/import.meta.dirname） | 完成 | 构建成功，产出 sovei.cjs |
| TASK-004 package.json 声明（engines/type/bin） | 完成 | verify:package |
| TASK-005 Node 20+ 全量回归 | 完成 | tsc + 107 测试 + verify 全绿 |
| TASK-006 Node 14 smoke + README | 完成 | Node 14.21.3 实跑 |

## 变更文件

### 源码（运行时）
- `src/engine/workflow-engine.ts`：`.at(-1)` → `arr[arr.length - 1]`（2 处，乐观锁读末位 revision）
- `src/config/business-map-scanner.ts`：`.at(-1)` → `arr[arr.length - 1]`（路径末段）
- `src/config/version.ts`：仅注释更新产物路径 `sovei.js` → `sovei.cjs`

### 构建/发布
- `scripts/build-release.mjs`：
  - esbuild `format: 'esm'` → `'cjs'`，`target: 'node20'` → `'node14'`
  - 新增 `banner` 注入 `__META_URL__` shim + `define: {'import.meta.url': '__META_URL__'}`（让 CJS 产物中 `createRequire(import.meta.url)` 可用）
  - `import.meta.dirname` → `fileURLToPath(new URL('..', import.meta.url))`
  - 输出路径 `dist/release/sovei.js` → `dist/release/sovei.cjs`
  - externalModules 校验正则改为匹配 `require(...)`/`import(...)`
- `scripts/clean-dist.mjs`：`import.meta.dirname` → `fileURLToPath(...)`
- `scripts/verify-package.mjs`：产物路径 `sovei.js` → `sovei.cjs`（3 处）
- `package.json`：`engines.node` `>=20` → `>=14.18.0`；`files`/`bin` 指向 `dist/release/sovei.cjs`

### 测试
- `test/release.test.mjs`：产物路径与 files/bin 断言改为 `sovei.cjs`（3 处）

### 文档
- `README.md`：环境要求 Node >=14.18、产物改为 CJS 单文件 `sovei.cjs`

## 行为变更
- **产物形态**：发布产物从 ESM 单文件改为 **CommonJS 单文件** `dist/release/sovei.cjs`。
- **Node 版本要求**：`>=20` 放宽到 `>=14.18.0`。
- **无 CLI 契约变更**：命令名/签名/选项/退出码均不变（遵守 CLI_CONTRACT_STABILITY 红线）。
- **运行时行为不变**：`.at(-1)` 替换为等价索引访问，乐观锁逻辑、scanner 逻辑语义完全一致。

## 测试执行
- `tsc --noEmit`：通过
- `node --test test/*.test.mjs`：**107/107 通过**，0 失败
- `verify:package`：白名单 + shebang + 自包含 + `--version` 通过
- **Node 14.21.3 smoke**（手动下载验证）：`--version`(2.5.4)、`--help`、`project status`、`workflow status 017-node14-compat` 全部正常，EXIT=0

## 剩余工作
- 无。所有任务完成，无延期项。
- 发版时需走 `release-sovei.ps1`（patch bump 2.5.4 → 2.5.5），并再次在 Node 14 上做最终 smoke 确认。
