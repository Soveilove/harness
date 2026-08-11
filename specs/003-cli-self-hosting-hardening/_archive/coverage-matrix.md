# 覆盖矩阵

| 行为 | 入口 | 状态/产物 | 验证 |
|---|---|---|---|
| BOM/JSONC 解析 | onboard、rules load/adapt | 解析结果或明确错误 | 单元测试 |
| Rules 候选适配 | `rules adapt` / onboard | adapted.rules.json candidate | 单元 + CLI |
| Rules 激活 | `rules activate` | active + ACTIVATED 事件 | 单元测试 |
| Rules 废弃 | `rules deprecate` | deprecated + DEPRECATED 事件 | 单元 + CLI |
| Rules 上下文 | `context build` | required/suggested | context test |
| 发布 bundle | build | dist/release/sovei.js | `--version`、`--help` |
| 无 map 发布 | verify:package | tarball 白名单 | 包检查脚本 |
| 自举稳定性 | 根 file 依赖 | `pnpm exec sovei` | 连续两轮完整测试 |

## 不适用项

本 Feature 无 UI、API、鉴权、计费或异步业务回调；这些覆盖项标记为不适用，不伪造证据。
