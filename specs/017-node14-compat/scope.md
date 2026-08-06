# 影响范围：017-node14-compat

> Feature：017-node14-compat — 发布产物支持 Node 14 运行

## 目标影响面

本次改造只影响 **打包/发布产物形态** 与 **Node 14 不兼容的运行时 API**，不改任何 CLI 命令契约、不改业务逻辑、不碰持久化结构。影响面按「构建链路」「源码 ESM 特有 API」「运行时语法」三类划分。

## 一、构建链路（4 文件）

### 1. `packages/sovei-core/build-release.mjs`
- **变更**：esbuild `format: 'esm'` → `'cjs'`；`target: 'node20'` → `'node14'`；banner 中 `createRequire` 注入逻辑随 CJS 调整；`:6` 的 `import.meta.dirname` 替换为 `fileURLToPath(new URL('..', import.meta.url))`。
- **架构压力**：构建脚本是单点产物生成器，改产物形态影响所有下游（verify、发布、用户安装）。这是本次改动的核心，需重点验证。
- **证据**：已读源码（build-release.mjs 全文）。`dependencies` 为空 → 单文件零运行时依赖，CJS 产物同样自包含。

### 2. `packages/sovei-core/clean-dist.mjs`
- **变更**：`:4` 的 `import.meta.dirname` 替换（构建脚本仍 Node 20+ 跑，兼容即可）。
- **架构压力**：低，仅路径解析。

### 3. `packages/sovei-core/verify-package.mjs`
- **变更**：校验 shebang / 自包含 / `--version` 的逻辑需确认在 CJS 产物下仍成立（CJS 产物同样有 shebang、同样单文件、同样可执行）。
- **架构压力**：中，是发布前最后一道防线，必须随产物形态同步验证。

### 4. `packages/sovei-core/package.json`
- **变更**：`engines.node` → `>=14.18.0`；`"type": "module"` 需评估是否保留（src 开发用 ESM，产物 CJS；若 `files` 只含 `dist/release/sovei.js`，`type` 字段会影响产物解析方式，需确认）。
- **架构压力**：低，但 `type` 改动需谨慎——若 `files` 中只有单个 CJS 产物，`type` 应为 `commonjs` 或用 `.cjs` 后缀，否则 Node 14 按 ESM 解析会失败。

## 二、源码 ESM 特有 API（3 文件）

### 5. `src/config/version.ts:12`
- **现状**：`createRequire(import.meta.url)` 读 `../../package.json` 的 version。
- **变更**：CJS 产物下 `import.meta.url` 会被 esbuild shim 或需改用 `require('../../package.json')`。需确认 esbuild CJS 模式对 `createRequire(import.meta.url)` 的处理。
- **架构压力**：低。version 是发布号单一来源，改动风险小但必须保持正确（AC2 要求 `--version` 一致）。

### 6. `src/cli/index.ts:18`
- **现状**：`createRequire(import.meta.url)` 读 package.json 版本，传给 commander `.version()`。
- **变更**：同上。影响 CLI 入口启动，必须保证 `--version`/`--help` 正常。
- **架构压力**：低，但它是 CLI 入口，任何启动崩溃都会直接暴露给用户。

### 7. `src/cli/commands/governance.ts:149/213/237`
- **现状**：3 处动态 `import()`。`:149` 动态 import `node:fs/promises`；`:213/:237` 动态 import `../../review/index.js`。
- **变更**：CJS 产物下，动态 `import()` 的处理：
  - `node:fs/promises` → 改静态顶层 import（CJS 下转 require，Node 14 最稳）。
  - `review/index.js`（同源模块）→ esbuild 可内联为静态 require，或保持动态 import（esbuild CJS 支持动态 import 转换）。
- **架构压力**：中。动态 import 是 CJS 转换的常见陷阱，需在 Node 14 上验证 `sovei governance review-pack` 命令不崩。

## 三、运行时语法（2 文件，`.at(-1)` 3 处）

### 8. `src/engine/workflow-engine.ts:380/394`
- **现状**：`events.at(-1)?.revision ?? 0` 读取事件末位 revision（乐观锁用）。
- **变更**：`.at(-1)` → `events[events.length - 1]?.revision ?? 0`。
- **架构压力**：低。乐观锁逻辑不变，仅语法替换。改动后需回归确认乐观锁行为不变。

### 9. `src/config/business-map-scanner.ts:192`
- **现状**：`segments.at(-1)` 取最后一段路径。
- **变更**：`.at(-1)` → `segments[segments.length - 1]`。
- **架构压力**：低。

## 四、验证面

| 验证项 | 方式 | 环境 |
|---|---|---|
| 类型检查 | `tsc --noEmit` | Node 20+ |
| 单元测试 | `node --test test/*.test.mjs`（107 个） | Node 20+ |
| 发布包白名单 | `verify:package` | Node 20+ |
| **Node 14 smoke** | Node 14.18+ 上跑 `--version`/`--help`/`project status` 等真实命令 | Node 14 |

## 五、范围外（明确排除）

- devDeps 降级（tsc/tsx/esbuild/node:test 保持 Node 20+）。
- 测试框架替换（node:test 保留）。
- ESM 双形态发布。
- 任何 CLI 命令名/签名/选项/退出码变更。
- 持久化结构或 schema 变更。
- Node <14 支持。

## 影响面边界结论

影响面**完全可控**，共涉及 9 个文件：4 个构建/发布配置文件 + 3 个源码 ESM 特有 API + 2 个源码 `.at()`。所有改动都是**语法/模块形态级**，不改业务逻辑，不触碰红线（CLI_CONTRACT_STABILITY / PERSISTED_SCHEMA_COMPAT / NO_SILENT_DATA_LOSS 均不受影响）。
