# 功能规格：017-node14-compat 发布产物支持 Node 14 运行

## 背景

`@soveilove/sovei` CLI 当前要求 Node >=20，但公司主流环境是 Node 14。用户需要在 Node 14 的电脑上 `npm install -g @soveilove/sovei` 后正常运行 `sovei` 命令。

## 需求范围

**做什么**：
- 让发布到 npm 的 `@soveilove/sovei` CLI 二进制在 **Node 14（>=14.18.0）** 上可安装、可运行。
- 发布产物从 ESM 改为 CommonJS。
- 同步更新 `engines.node` 和 README 的环境要求说明。

**不做什么**：
- 不降级开发/构建/测试链路（tsc、tsx、esbuild、node:test 仍要求 Node 20+）。
- 不支持 Node 14 的 ESM 形态。
- 不引入 Node 14 专用 polyfill 运行时依赖（保持零运行时依赖）。
- 不支持 Node <14。
- 不改任何 CLI 命令名、签名、选项、退出码（遵守 CLI_CONTRACT_STABILITY 红线）。

## 验收标准

### AC1：Node 14 可安装
- `npm install -g @soveilove/sovei@<新版本>` 在 Node 14.18.0+ 上成功，无 engine 警告。

### AC2：Node 14 可运行
- 在 Node 14.18.0+ 上执行 `sovei --version` 输出与 package.json version 一致。
- 在 Node 14.18.0+ 上执行 `sovei --help` 正常输出命令帮助。
- 在 Node 14.18.0+ 上执行至少一个真实子命令（如 `sovei project status`）在已有项目上正常输出，无崩溃。

### AC3：现有功能不回归
- 项目现有 107 个测试（node:test，Node 20+ 环境）全部通过。
- `tsc --noEmit` 类型检查通过。
- 发布包白名单检查（verify:package）通过。
- 发布产物仍为自包含单文件（shebang 正确、无未内联外部依赖）。

### AC4：版本声明正确
- `package.json engines.node` 为 `>=14.18.0`。
- README "版本与发布" 节同步更新环境要求与产物形态说明。

### AC5：构建脚本兼容
- `build-release.mjs`、`clean-dist.mjs` 在构建机（Node 20+）上正常运行，产出 CJS 单文件。

## 排除项（明确不做）

- 不在 Node 14 上跑测试套件（node:test 不支持 Node 14）。
- 不提供 ESM 形态的发布产物。
- 不改变 CLI 对外契约。
- 不处理 Node <14。

## 风险

- **中**：改产物形态（ESM→CJS）可能引入运行时差异（动态 import、import.meta 处理）。缓解：在 Node 14 上做 AC2 的真实命令 smoke 验证。
- **低**：esbuild target 降级后语法兼容。缓解：AC2 验证覆盖。
