# 覆盖矩阵：024-stale-aware-l1

> 由 Sovei 阶段生成：scope
> Feature：过期感知 L1

## 必需覆盖维度追踪

| 覆盖维度 | 证据 | 状态 |
|---|---|---|
| **入口/路由** | `context build`（context.ts L41）、`quick`（quick.ts L55）、`sync complete`（workflow-engine.ts completeStage L281） | ✅ 已定位 |
| **UI/输出状态** | `context build` Markdown 渲染 `renderContextPackMarkdown` / `--json`；`quick` 人类输出块 L117-124 / `--json` L114 | ✅ 已定位 |
| **store/service** | 基线存储：storage 相对路径 `harness/project/governance/sync-baseline.json`；读写在 storage 层 | ✅ 已定位 |
| **参数** | `context build --json`、`quick --json` 决定 stale 输出形式；无新增 CLI 参数 | ✅ 已定位 |
| **API/工具** | `getGitBaseline()`（quick/git-verifier.ts L53）取 HEAD；需新增分支名获取（`rev-parse --abbrev-ref HEAD`） | ⚠️ 需新增导出 |
| **鉴权/计费** | 不涉及 | ✅ N/A |
| **异步回调** | 无异步生命周期；stale 检测是同步读+一次 git 调用 | ✅ N/A |
| **成功/失败/清理** | 基线写入失败（无 git）→ 静默跳过不提示（AC-5）；基线文件已存在 → 覆盖写入 | ✅ 已定义 |
| **历史/详情/重试** | 基线只存最新一次 sync 的 HEAD，无历史；每次命令重算当前 HEAD | ✅ 已定义 |
| **兼容入口** | 无基线文件（从未 sync）→ 不提示；不破坏 `context build` / `quick` 既有输出结构（JSON 新增 `stale` 字段为增量，向后兼容） | ✅ 已定义 |
| **测试/文档/运行时证据** | 新增 `stale-detector.test.mjs`；sync 写入测试；README 命令速查表更新 | ✅ 待实现 |

## 代码表面覆盖

| 代码表面 | 变更意图 | 变更类型 |
|---|---|---|
| `packages/sovei-core/src/stale/stale-detector.ts` | 新增模块：读基线 + 取 HEAD + 判 stale | 新增 |
| `packages/sovei-core/src/quick/git-verifier.ts` | 新增导出 `getGitBranch()`（取当前分支名） | 增强 |
| `packages/sovei-core/src/engine/workflow-engine.ts` | sync 完成时写基线 | 增强 |
| `packages/sovei-core/src/cli/commands/context.ts` | build 输出前插入 stale 提示 + JSON `stale` 字段 | 增强 |
| `packages/sovei-core/src/cli/commands/quick.ts` | 人类输出加警告行 + JSON `stale` 字段 | 增强 |
| `harness/project/governance/sync-baseline.json` | 运行时生成（非提交物，gitignore 或按需） | 数据 |

## 测试覆盖计划

| 测试文件 | 覆盖点 |
|---|---|
| `stale/stale-detector.test.mjs` | stale=true/false 全分支（有基线+变/无基线/读失败/相同）；JSON stale 字段结构 |
| `workflow-engine.test.mjs`（新增 sync 用例） | sync complete 后基线文件写入 branch/head/recordedAt；非 sync 阶段不写 |

## 不覆盖（明确排除）

- 语义级 drift（L3）——不解析提交内容（spec 排除项）
- 自动重新校准 / 自动写基线（除 sync 完成时）
- 跨分支合并判断
- `context status` 展示 stale（本期不强求，可作为增量）
