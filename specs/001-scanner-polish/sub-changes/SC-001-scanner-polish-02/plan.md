# 实施计划：SC-001-scanner-polish-02

## 方案

在 `ProjectScanner.discoverPackages` 中收集根 `package.json` workspaces、`pnpm-workspace.yaml`、`lerna.json` 的 glob，转换为 `package.json` manifest 匹配模式；同时保留标准目录兜底和嵌套包支持。

## 步骤

1. 读取并容错解析三类 workspace 配置。
2. 归一化 glob 并与 directoryMap 中 manifest 路径匹配。
3. 保持 manifest JSONC/BOM、tsconfig、entryPoints 逻辑不变。
4. 运行 M1 与既有包发现测试。
