# 产品确认: 发布产物支持 Node 14 运行

> 本文件由 reconciliation.md 渲染，仅供产品负责人审阅。
> 确认后在签字栏填写信息，或运行 sovei governance review-pack import 导入。

## 这个需求会改变什么

**PM 原话**："突然发现有个问题，这个 nodejs 要 20，目前公司的代码环境大部分是 14，所以需要帮我调整一下"；"反正我是会在公司电脑用 node14 下载我们的 cli 然后跑起来的"。

**技术理解**：
- 目标：npm 发布的 `@soveilove/sovei` CLI（`dist/release/sovei.js`）必须能在 **Node 14** 上 `npm install -g` 后正常运行。
- 范围：**仅发布产物（CLI 二进制）需兼容 Node 14**。开发/构建/测试链路（tsc/tsx/esbuild/node:test）仍在本机 Node 20+ 运行，不强制降级。
- 产品形态：发布产物从 ESM 改为 **CommonJS**（Node 14 对 ESM 支持有缺陷，CJS 最稳）。

## 上次做了什么（你可能不记得了）

**代码为什么是现在这样**：
- 包声明为纯 ESM：`package.json "type": "module"`，发布单文件 `dist/release/sovei.js`。
- `dependencies` 为空 → 运行时零第三方依赖，只依赖 Node 内置 API + JS 语法。这是降级成本低的关键前提。
- 构建由 `build-release.mjs`（esbuild）完成，`target: 'node20'`，`format: 'esm'`，输出单文件 bundle 并混淆。
- 源码用了 3 个 Node 14 不兼容点：
  1. `.at(-1)`：workflow-engine.ts:380/394、business-map-scanner.ts:192（Node 16.6+）
  2. `crypto.randomUUID`：多文件（Node 14.17+，需门槛 >=14.17）
  3. `import.meta.dirname`：build-release.mjs:6、clean-dist.mjs:4（构建脚本，Node 20.11+）
- 源码用 `createRequire(import.meta.url)` 读 package.json（version.ts:12、cli/index.ts:18）——ESM 下读 JSON 的惯用做法，改 CJS 后需调整。
- 源码有动态 `import()`（governance.ts 的 `await import('../../review/index.js')`）——CJS 打包时需确认 esbuild 处理。
- 红线约束：`CLI_CONTRACT_STABILITY`（不能破坏已发布的 CLI 命令契约）、`RELEASE_VERSION_POLICY`（版本递增默认 patch）。本改动不改命令名/签名，符合契约稳定；发布产物内部形态变化不影响 CLI 契约。

**跨 Feature 决策**：无直接相关历史决策。本改动是打包/运行时兼容层的独立优化，不影响其他 Feature 的事件、红线或知识结构。

## 可选方案

- **Solution A: 发布产物改 CommonJS（推荐）**: 将 esbuild `format: 'esm'` 改为 `'cjs'`，`target: 'node20'` 降为 `'node14'`，输出 CJS 单文件。 源码改造： `.at(-1)` → `arr[arr.length-1]`（3 处）。 `createRequire(import.meta.url)` → CJS 下直接用 `require`（esbuild 会把 `import` 转 `require`，`import.meta.url` 需处理或改用 `__filename` 派生）。 动态 `import()`：esbuild CJS 产物中，bundle 内相对模块会内联；`await import('node:fs/promises')` 需改为静态顶层 import 或 `require`（Node 14 无原生动态 import 的 `.mjs` 需求，CJS 用 `require` 更稳）。 构建脚本 `import.meta.dirname` → 用 `fileURLToPath(new URL('..', import.meta.url))`（构建脚本仍在 Node 20+ 跑，只需兼容即可）。 `engines.node`：`>=20` → `>=14.18.0`（Node 14.18.0 起支持 CJS 的 `require('node:')` 前缀；且 >=14.17 满足 randomUUID）。
  - 代价: 中等。改源码 4-6 处 + 构建脚本 2 处 + engines + README。需在 Node 14 上做 smoke 验证。
- **Solution B: 保持 ESM，做 Node 14 ESM 兼容**: 保留 `format: 'esm'`，仅降 target 到 node14，并处理 Node 14 的 ESM 缺陷（`import.meta.dirname` 替换、`node:` 前缀、`createRequire` 行为）。
  - 代价: 高且不稳。Node 14 的 ESM 支持有大量边缘缺陷（`import.meta.url` 在部分场景、条件 exports、`node:` 前缀在 ESM 下需 14.18+），且验证困难。不推荐。
- **Solution C: 双形态发布（ESM + CJS）**: 同时产出 ESM 和 CJS 两份产物，`package.json exports` 条件导出。
  - 代价: 高。本包以 `bin`（CLI 单文件）分发，非库 API，无库侧 ESM/CJS 双态需求。过度设计，不推荐。

## 需要你确认

1. 本次是否需要同步放宽 README 的环境要求说明？
   - 建议: 是。README "版本与发布" 节注明 Node >=14.18、纯 ESM 改为"发布为单文件 CJS"，避免误导用户仍认为需 Node 20。
   [ ] 同步更新 README（推荐）
   [ ] 只改 engines 不改 README

## 签字

- [ ] 产品确认  签字: ____  日期: ____  参考: ____
