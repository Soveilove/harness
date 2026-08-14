# Spec：SC-001-scanner-polish-02 package-detection

## 目标

扩大 `ProjectScanner.discoverPackages` 的 monorepo 包发现覆盖，支持标准 workspace 配置、常见包目录和嵌套包。

## 验收标准

- [ ] 发现根 `package.json` workspaces 声明的 `apps/*`、`libs/*` 等包。
- [ ] 发现 `pnpm-workspace.yaml` 与 `lerna.json` 声明的包。
- [ ] 无配置时兜底发现 `packages/apps/libs/modules/services/components` 下的嵌套 `package.json`。
- [ ] 保持包路径、名称、技术栈和入口点输出兼容。

## 排除项

不解析 `rush.json`、`nx.json`，不改变 BusinessMap schema，不做按包名合并。
