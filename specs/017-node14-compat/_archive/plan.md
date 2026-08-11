# 实施计划：017-node14-compat

> Feature：017-node14-compat — 发布产物支持 Node 14 运行

## 关键技术事实（实验证实）

以下通过 esbuild `format:'cjs'` + `target:'node14'` 实验确认：

1. **esbuild CJS 模式自动去掉 `node:` 前缀**：静态 `import {readFile} from 'node:fs/promises'` → `require("fs/promises")`；动态 `import('node:fs/promises')` → `await import("fs/promises")`。→ Node 14 原生支持，**无需改动**。
2. **`createRequire(import.meta.url)` 在 CJS 下必须改**：esbuild 警告 `import.meta` 在 CJS 下为空。需改为 `createRequire(__filename)` 或直接 `require(...)`。
3. **`.at()` 是 API 不是语法**：esbuild target 只降级语法（可选链等），**不会 polyfill API**。`.at(-1)` 必须手动替换为 `arr[arr.length-1]`。

## 模块边界

- **构建层**：`build-release.mjs`（format/target/banner）、`clean-dist.mjs`（import.meta.dirname）、`package.json`（type/engines）。
- **运行时层**：`version.ts`、`cli/index.ts`（createRequire）、`workflow-engine.ts`、`business-map-scanner.ts`（.at）。
- **验证层**：`verify-package.mjs`、README、Node 14 smoke。
- **不改**：`governance.ts` 的动态 import（esbuild 自动处理）、`node:test` 测试、devDeps、CLI 契约。

## 实施步骤

### 步骤 1：源码 `.at()` 替换（2 文件 3 处）
- `src/engine/workflow-engine.ts:380`：`events.at(-1)?.revision ?? 0` → `events[events.length - 1]?.revision ?? 0`
- `src/engine/workflow-engine.ts:394`：同上
- `src/config/business-map-scanner.ts:192`：`segments.at(-1)` → `segments[segments.length - 1]`

### 步骤 2：源码 `createRequire(import.meta.url)` 替换（2 文件）
- `src/config/version.ts:12`：`createRequire(import.meta.url)` → `createRequire(__filename)`
- `src/cli/index.ts:18`：同上
- 理由：CJS 产物下 `import.meta.url` 为空，`__filename` 在 CJS 中可用。

### 步骤 3：构建脚本适配（2 文件）
- `scripts/build-release.mjs:6`：`import.meta.dirname` → `fileURLToPath(new URL('..', import.meta.url))`
- `scripts/clean-dist.mjs:4`：同上
- `scripts/build-release.mjs:29`：`format: 'esm'` → `'cjs'`；`target: 'node20'` → `'node14'`
- `scripts/build-release.mjs` banner：当前注入 `createRequire` 使 CJS 依赖可 require。CJS 产物下 `require` 天然可用，**保留 banner 也无害**（esbuild CJS 会处理）；但需确认不报错。候选：保留原 banner（CJS 下 createRequire 仍可用）。

### 步骤 4：package.json 声明（1 文件）
- `engines.node`：`>=20` → `>=14.18.0`
- `"type": "module"`：保持（源码 src 仍是 ESM 开发），产物 `dist/release/sovei.js` 为 CJS。**关键**：`files` 只含 `dist/release/sovei.js`，Node 14 按 package.json 的 `type: module` 会把它当 ESM 解析 → 需将产物改为 `.cjs` 后缀，或把 `type` 改 `commonjs`。**决策**：改产物文件名为 `dist/release/sovei.cjs`，bin 指向 `.cjs`。这样 `type: module` 不影响 `.cjs` 解析，Node 14 按 CJS 执行。

### 步骤 5：验证（verify 阶段）
- Node 20+：`tsc --noEmit` + 107 测试 + `verify:package`
- Node 14：装 Node 14.18+（nvm-windows），跑 `--version`/`--help`/`project status` smoke
- README 更新环境要求

## 迁移策略

无持久化迁移。纯打包/运行形态调整，不改数据、不改 CLI 契约、不改 schema。发布时按 `RELEASE_VERSION_POLICY` 走 patch bump（2.5.4 → 2.5.5），需用户显式声明是否算 breaking（产物形态 ESM→CJS 对终端用户 CLI 使用无感知，但理论上 import 包的库侧用户会受影响；本包以 bin 分发，无库侧 ESM 消费，视为非 breaking）。

## 验证方式

| 项 | 方式 | 环境 |
|---|---|---|
| 类型 | `tsc --noEmit` | Node 20+ |
| 单测 | `node --test test/*.test.mjs`（107） | Node 20+ |
| 产物 | `verify:package` | Node 20+ |
| Node14 smoke | 全局装产物 + `--version`/`--help`/`project status` | Node 14.18+ |

## 风险

- **中**：`type: module` 与 `.cjs` 产物的匹配。缓解：产物改名 `.cjs` + bin 指向 `.cjs` + Node 14 smoke 验证。
- **低**：`createRequire(__filename)` 在 bundle 内对 `./package.json` 的 require 路径。version.ts 注释说明 `../../package.json` 相对 bundle 位置解析正确；CJS 下 `__filename` 指向 bundle，`createRequire(__filename)` 的 `./package.json` 需确认相对 bundle 目录解析。**需在实现时验证** `--version` 输出正确。
- **低**：banner createRequire 冗余。验证不报错即可。
