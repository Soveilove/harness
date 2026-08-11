# 收敛报告

> 由 Sovei 阶段生成：converge
> Feature：017-node14-compat — 发布产物支持 Node 14 运行

## 审查方式

对工作区未提交变更（`git diff HEAD`）做双轴审查（Standards + Spec），diff 范围：
- `src/engine/workflow-engine.ts`、`src/config/business-map-scanner.ts`、`src/config/version.ts`
- `scripts/build-release.mjs`、`scripts/clean-dist.mjs`、`scripts/verify-package.mjs`
- `package.json`、`test/release.test.mjs`、`README.md`
- 产物：`dist/release/sovei.cjs`（ESM → CJS）

Spec 源：`specs/017-node14-compat/spec.md`（AC1-AC5）。Standards 源：项目 rules + 代码坏味道基线。

## Standards 轴发现

### H1（高严重度，已修复）：`build-release.mjs` externalModules 校验把 Node 内置模块误判为外部依赖 → 构建失败
- **证据**：`pnpm run build` 在 converge 审查时失败（exit 1），报 "bundle 包含未内联的外部依赖"：`url`、`events`、`child_process`、`path`、`fs`、`buffer`、`module`、`fs/promises`、`util`、`crypto`、`os`、`.command()`。
- **根因**（两层）：
  1. **内置模块未被排除**：CJS 模式下 esbuild 剥离 `node:` 前缀，内置模块以 `require("fs")`、`require("url")` 等无前缀形式输出；原 filter 只排除 `./`、`../`、`node:`，未排除内置模块。banner 注入的 `require('url')` 也被捕获。
  2. **正则 `from\s*` 误匹配**：commander 内联错误文案 `"...remove ... from '.command()' ..."` 被 `from '...'` 分支误抓为外部依赖 `.command()`。
- **修复**：
  - 引入 `isBuiltin`（node:module）过滤 Node 内置模块。
  - 收紧正则：只匹配 `require(` 和 `import(`（真正的函数调用），移除 `from` 分支，避免字符串文案误匹配。
- **验证**：`pnpm run build` 通过（exit 0）；107/107 测试通过；`verify:package` 通过；Node 14.21.3 smoke（`--version`/`--help`/`project status`/`workflow status`）全部正常。

### L1（低）：banner 注释与实现意图一致（注入 `__META_URL__` shim），已保留。无额外问题。

### L2 `.at(-1)` 替换语义核对
- `workflow-engine.ts`：`events[events.length - 1]?.revision ?? 0`，空数组返回 undefined → `?? 0`，与原 `.at(-1)?.revision ?? 0` 等价。
- `business-map-scanner.ts`：`segments[segments.length - 1] ?? ''`，空数组 undefined → `?? ''`，语义保持。
- 无重复代码、无神秘命名、无过度抽象。

## Spec 轴发现

- **AC1**（engines.node `>=14.18.0`）：package.json 已改，达成。
- **AC2**（Node 14 可运行）：Node 14.21.3 smoke 实测 `--version`(2.5.4)/`--help`/`project status`/`workflow status` 全部正常，达成。
- **AC3**（不回归）：`tsc --noEmit`、107/107 测试、`verify:package` 全绿，达成。
- **AC4**（README 更新）：环境要求改为 Node `>=14.18`、产物 CJS 单文件，达成。
- **AC5**（构建脚本兼容）：修复 H1 后 `pnpm run build` 成功产出 `sovei.cjs`，达成。
- **Scope creep**：无。未改 CLI 命令契约、未改 governance.ts 动态 import、未引入运行时依赖、未动持久化结构。变更严格落在 spec 声明的构建链路 + 源码 API + package.json + 验证面。
- **与 Scope 对比**：scope.md 列出的 9 文件全部覆盖，无遗漏、无越界。

## 架构健康检查

- **热点加剧**：无。构建脚本是单点产物生成器，改动是必要的产物形态调整，未扩大模块职责。
- **依赖循环**：无新增。
- **候选模块职责**：未向候选模块增加非本次需求的责任。

## 处置

- H1：高严重度，已通过修改 `build-release.mjs` 修复并全量验证闭环。
- 无未关闭的高严重度发现。
- 无实现差距需要返回 tasks。
- 无契约差距需要重新打开更早阶段。

## 结论

双轴审查通过。Standards 轴曾发现 1 个高严重度问题（H1），已修复并验证；Spec 轴全部 AC 达成，无 scope creep。所有高严重度发现已关闭，converge 可完成。
