# 验证证据

> 由 Sovei 阶段生成：verify
> Feature：017-node14-compat — 发布产物支持 Node 14 运行

## 验收场景与验证结果

| 验收项 | 命令/方式 | 结果 | 证据 |
|---|---|---|---|
| 类型检查 | `npx tsc --noEmit` | ✅ EXIT=0 | 本机 Node 22.12 |
| 构建（CJS 产物） | `pnpm run build`（clean + tsc + esbuild cjs + 混淆） | ✅ EXIT=0 | 产出 `dist/release/sovei.cjs` |
| 单元测试 | `node --test test/*.test.mjs` | ✅ **107 pass / 0 fail / 0 skip** | 本机 Node 22.12 |
| 发布包校验 | `node scripts/verify-package.mjs` | ✅ EXIT=0 | shebang、自包含、files/bin、`--version` |
| **Node 14 smoke** | Node 14.21.3 实跑 | ✅ 全部通过 | 见下 |

## Node 14 smoke 详细证据（Node v14.21.3）

在 `node-v14.21.3-win-x64` 上直接运行发布产物 `dist/release/sovei.cjs`：

| 命令 | 结果 |
|---|---|
| `node sovei.cjs --version` | `2.5.4`（与 package.json 一致）✅ |
| `node sovei.cjs --help` | 完整命令列表，HELP_EXIT=0 ✅ |
| `node sovei.cjs project status` | 正常输出项目状态（知识/红线/工作流）✅ |
| `node sovei.cjs workflow status 017-node14-compat` | 正常输出，WORKFLOW_EXIT=0（触发 `.at()` 改造路径）✅ |

## 证据位置

- 发布产物：`packages/sovei-core/dist/release/sovei.cjs`
- 测试套件：`packages/sovei-core/test/*.test.mjs`
- 验证脚本：`packages/sovei-core/scripts/verify-package.mjs`

## 限制

- Node 14 smoke 通过手动下载 Node 14.21.3 二进制验证（本机 nvm 无 Node 14；nvm install 时 npm zip 下载失败，改用直接解压二进制验证 Node 本体）。验证覆盖 `--version`/`--help`/`project status`/`workflow status` 4 个真实命令路径，未覆盖全部子命令（governance review-pack 等动态 import 路径未逐一实跑，但 esbuild 实验证实其 CJS 转换正确）。
- 开发/构建/测试链路（tsc/tsx/esbuild/node:test）仍在 Node 20+ 运行，按 spec 范围不降级。

## 与 Coverage Matrix 对照

| 覆盖矩阵待验证项 | 状态 |
|---|---|
| Node 14 smoke（--version/--help/project status） | ✅ 通过 |
| CJS 产物正确性（无顶层 ESM 语法） | ✅ 构建成功 + verify 通过 |
| 动态 import 转换（governance review-pack） | ✅ esbuild 实验证实转换正确，未逐一实跑 |
| `type`/`engines` 声明与产物一致 | ✅ engines>=14.18.0，产物 .cjs |
| README 环境要求 | ✅ 已更新 |

## 结论

全部验收项通过：Node 20+ 全量回归（tsc、build、107 测试、verify）全绿；Node 14.21.3 smoke 4 个真实命令路径全部正常。spec 的 AC1-AC5 均达成，无未通过项。verify 阶段可完成。
