# 覆盖矩阵：017-node14-compat

> Feature：017-node14-compat — 发布产物支持 Node 14 运行

覆盖矩阵按 scope 必需维度追踪本 Feature 每个改动点的证据覆盖情况。状态：`已覆盖` = 有明确测试/证据；`待验证` = 需在 verify 阶段补充；`候选` = 缺少证据的判断。

## 一、构建/发布链路

| 维度 | 覆盖点 | 现状 | 验证方式 | 状态 |
|---|---|---|---|---|
| 入口/路由 | `build-release.mjs` 产出 CJS 单文件 | 当前 ESM | 构建后检查产物为 CJS（无 import/export 顶层语句，有 require） | 待验证 |
| 入口/路由 | `target: node14` 语法降级 | 当前 node20 | 构建成功 + Node 14 smoke | 待验证 |
| 参数 | esbuild format/target 配置 | 当前 esm/node20 | 代码审查 | 已覆盖 |
| API | banner 的 createRequire 注入 | 当前注入 ESM 用 | CJS 下确认是否仍需，或移除 | 候选 |
| 成功/失败/清理 | clean-dist.mjs 清理 dist | `import.meta.dirname` | Node 20+ 构建跑通 | 待验证 |
| 测试/文档 | verify-package.mjs | 校验 shebang/自包含/--version | 发布前 run | 已覆盖 |
| 兼容入口 | package.json `type`/`engines` | type=module, engines>=20 | engines>=14.18；type 需确认 | 待验证 |

## 二、源码 ESM 特有 API

| 维度 | 覆盖点 | 现状 | 验证方式 | 状态 |
|---|---|---|---|---|
| 参数/状态 | `version.ts:12` createRequire 读 version | ESM | `--version` 输出与 package.json 一致 | 待验证 |
| 入口/路由 | `cli/index.ts:18` createRequire 读 version | ESM | `--version`/`--help` 正常 | 待验证 |
| API | `governance.ts:149` 动态 import node:fs/promises | 动态 import | CJS 产物下命令可用 | 待验证 |
| 异步回调 | `governance.ts:213/237` 动态 import review/index.js | 动态 import | `governance review-pack generate/import` 在 Node 14 不崩 | 待验证 |
| 兼容入口 | `import.meta.url` 在 CJS 产物下行为 | 用 createRequire | esbuild CJS shim 或改 require | 候选 |

## 三、运行时语法

| 维度 | 覆盖点 | 现状 | 验证方式 | 状态 |
|---|---|---|---|---|
| 状态 | `workflow-engine.ts:380/394` `.at(-1)` | 乐观锁读末位 revision | 乐观锁回归测试 + 相关测试 | 已覆盖 |
| 参数 | `business-map-scanner.ts:192` `.at(-1)` | 路径末段 | scanner 相关测试 | 已覆盖 |

## 四、验证面

| 维度 | 覆盖点 | 验证方式 | 状态 |
|---|---|---|---|
| 测试 | 107 个 node:test | Node 20+ `node --test` | 已覆盖 |
| 类型 | tsc --noEmit | Node 20+ | 已覆盖 |
| 运行时证据 | Node 14 smoke：`--version`/`--help`/`project status` | Node 14.18+ 实跑 | 待验证 |
| 文档 | README 环境要求 + engines | 代码审查 | 待验证 |

## 待验证/候选项汇总（verify 阶段必须闭环）

1. **Node 14 smoke**（核心）：`sovei --version`、`sovei --help`、`sovei project status` 在 Node 14.18+ 上全部正常。
2. **CJS 产物正确性**：产物无顶层 ESM 语法，esbuild `format:'cjs'` 生效。
3. **动态 import 转换**：`governance review-pack` 系列命令在 CJS 产物下不崩。
4. **`type`/`engines`**：package.json 声明与产物形态一致，Node 14 能按 CJS 解析。
5. **README**：环境要求更新为 Node >=14.18，产物形态说明同步。
