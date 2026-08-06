# Project Memory

## Sovei Engine (packages/sovei-core/)

- TypeScript 已升级到 7.0.2（2026-08-04），package.json specifier 从 ^5.5.0 改为 ^7.0.2，tsc --noEmit 通过。
- v2.5.0 已发布到 npm latest（2026-08-06），包含外部 skills 运行时协议和配置校验、外部 skills 渲染进开发 Agent 上下文两项 feat。
- 版本递增策略（2026-08-06）：默认发布仅递增 patch 版本号。minor/major bump 需用户显式声明，脚本需加 `-MajorBump` 参数。规则定义在 `harness/project/rules/project.rules.json`（RELEASE_VERSION_POLICY），脚本强制在 `release-sovei.ps1` 步骤 2/6。
