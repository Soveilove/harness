# 决策日志：017-node14-compat

> 由 Sovei 阶段生成：grill
> Feature：017-node14-compat — 让发布产物在 Node 14 上可运行

## 目标

发布到 npm 的 `@soveilove/sovei` CLI 二进制（`dist/release/sovei.js`）必须能在 Node 14 上正常安装和运行。背景：公司电脑主流环境是 Node 14，用户用 `npm install -g @soveilove/sovei` 装好后要能直接跑 `sovei` 命令。

---

## 一、事实核实（已决）

| # | 事实 | 结论 | 依据 |
|---|---|---|---|
| F1 | 发布产物是 esbuild 打成的**单文件**，`dependencies` 为空（零运行时依赖） | 运行时只依赖 Node 内置 API + 降级后的 JS 语法，**不需要** devDeps | package.json dependencies:{}；build-release.mjs |
| F2 | 源码用 `.at(-1)` 3 处 | Node 16.6+ 才有，Node 14 不可用，需替换为 `arr[arr.length-1]` | workflow-engine.ts:380/394、business-map-scanner.ts:192 |
| F3 | scripts 用 `import.meta.dirname` 2 处 | Node 20.11+ 才有，Node 14 不可用。但 scripts 是构建脚本（本机 Node 20+ 跑），需随产物改 CJS 时一并处理 | build-release.mjs:6、clean-dist.mjs:4 |
| F4 | 源码用 `crypto.randomUUID` 多处 | Node **14.17.0** 引入，14.17+ 可用 | wayfinder/repository.ts:1、workflow-engine.ts:33 等 |
| F5 | 测试框架用 `node:test`（所有 test/*.mjs） | Node 18+ 才有。但测试是开发链路，本机 Node 20+ 跑，**不影响 Node 14 运行发布产物** | 测试脚本 node --test |
| F6 | esbuild 构建 target 是 `node20` | 生成的产物语法针对 Node 20，需降到 node14 才能保证 Node 14 运行 | build-release.mjs:29 |
| F7 | 当前发布产物是纯 ESM（package.json "type":"module"） | Node 14 的 ESM 支持有严重缺陷，需改 CJS | package.json type |
| F8 | devDeps engines 大多要求 Node 16-22 | 只影响构建环境（本机 Node 22），**无需降级** | npm view 查询 |

## 二、可推断决策（已决）

| # | 决策 | 理由 | 被拒绝方案 |
|---|---|---|---|
| D1 | 发布产物 ESM → **CommonJS** | Node 14 的 CJS 最稳定；ESM 在 Node 14 上有 import.meta.dirname 不可用、node: 前缀限制、条件 exports 支持差等缺陷 | 保持 ESM（风险高）；双形态 ESM+CJS（复杂度高，当前 bin 单文件无必要） |
| D2 | esbuild `target: 'node20'` → `'node14'`，format 改 cjs | 让产物 JS 语法降到 Node 14 可解析 | 手动降级语法（易漏，不可维护） |
| D3 | `.at(-1)` 替换为 `arr[arr.length-1]` | Node 14 无 `.at()` | 保留 `.at()`（Node 14 直接崩溃） |
| D4 | `import.meta.dirname` 替换 | Node 14 无此 API。构建脚本随产物改 CJS 时一并处理 | 保留（Node 14 不可用） |
| D5 | `engines.node` 从 `>=20` 改为 `>=14.17.0` | 最低可支持到 Node 14.17（crypto.randomUUID 引入版本） | 声明 >=14.0（randomUUID 需额外 polyfill） |
| D6 | 测试框架 `node:test` **保留** | 测试是开发链路，本机 Node 20+ 跑，不影响 Node 14 用户 | 替换 node:test（无必要，工作量巨大） |

## 三、范围性决策（已决，用户确认/授权）

| # | 决策 | 状态 | 说明 |
|---|---|---|---|
| S1 | 目标版本：**严格兼容 Node 14** | 用户确认 | 公司主流环境是 Node 14 |
| S2 | 兼容范围：**仅发布产物（CLI 二进制）需在 Node 14 运行** | 用户确认 | 用户场景：Node 14 机器 install -g 后跑 CLI；开发/构建/测试链路仍用 Node 20+ |
| S3 | 发布产物形态：改为 **CommonJS** | 用户授权"你看着办" | 见 D1 |

## 四、范围性决策（已决，AI 决策，用户全权授权"你看着办"）

| # | 决策 | 理由 |
|---|---|---|
| S4 | 最低 Node 子版本：`>=14.17.0` | crypto.randomUUID 在 14.17 引入，声明 14.17 最稳；如需支持更老版本再用 randomBytes polyfill（本期不做，保持 14.17 门槛） |
| S5 | 验证方式：本机用 nvm-windows 装 Node 14 LTS（14.21.x），对发布产物跑 smoke 测试（--version + 基础命令），并跑项目现有 107 测试兜底 | 确保 Node 14 真能跑，避免"看似兼容实则崩溃" |

## 五、范围边界（本期不做）

- 开发/构建/测试链路不降级（tsc/tsx/esbuild/node:test 保持 Node 20+）
- 不支持 Node 14 ESM 形态（发布产物统一 CJS）
- 不引入 Node 14 专用 polyfill 依赖（保持零运行时依赖）
- 不支持 Node <14（Node 14 已是 EOL 版本，不再向下）

## 未决项

无。决策树已闭环。
