# Plan: 023-quick-agent-adapters

## 模块边界

### M1: adapters/registry.ts — 接口扩展 + 4 适配器补充
- `IDEAdapter` 新增 `quickChannelDirective: string`
- `IDEAdapter` 新增 `slashCommand?: { dir: string; filename: string; content: string }`
- 4 个适配器定义补充这两个字段

### M2: adapters/installer.ts — 新增
- `installAdapters(adapterIds, projectRoot, storage): InstallResult`
- 为每个选中的适配器生成指令文件
- 幂等：检查标记段是否存在再追加

### M3: cli/commands/adapters.ts — 新增
- `registerAdapterCommands(program)` 
- `adapters list` — 表格输出 + `--json`
- `adapters install` — `--adapters <ids>` / `--all` / 无参数交互

### M4: cli/commands/project.ts — 集成
- `project init` 调用 `installAdapters`
- 新增 `--adapters` 参数

## 数据流
```
sovei adapters install --adapters trae,codebuddy
  → 解析 adapterIds
  → 遍历每个 adapter:
    → 获取 adapter.quickChannelDirective
    → 写入/追加到 adapter.contextFile
    → 若有 slashCommand: 写入 slashCommand.dir/slashCommand.filename
  → 返回 InstallResult
```

## 契约
- 新增导出: `installAdapters`, `InstallResult`, `checkAdapterInstalled`
- 新增 CLI: `sovei adapters list`, `sovei adapters install`

## 验证
- tsc --noEmit
- 全部测试通过
- 新增 `test/adapters-install.test.mjs`
