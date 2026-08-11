# Scope: 023-quick-agent-adapters

## 涉及模块

### 1. adapters/registry.ts — 接口扩展
- `IDEAdapter` 新增 `quickChannelDirective: string` 和 `slashCommand?: { dir: string; filename: string; content: string }`
- 4 个已注册适配器补充这两个字段

### 2. adapters/installer.ts — 新增安装器
- `installAdapters(adapterIds: string[], projectRoot: string, storage: StorageBackend): InstallResult`
- 检查文件是否存在，追加/创建指令文件
- 幂等：已存在时不重复追加

### 3. cli/commands/adapters.ts — 新增 CLI 命令组
- `sovei adapters list` — 列出适配器 + 安装状态
- `sovei adapters install [--adapters <ids> | --all]` — 安装

### 4. cli/commands/project.ts — 集成
- `project init` 在写完 AGENTS.md 后调用 `installAdapters`
- 支持 `--adapters` 参数跳过交互

### 5. 测试
- `test/adapters-install.test.mjs`

## 异步生命周期
无异步变更。所有操作是同步文件写入。

## 兼容路径
- `IDEAdapter` 接口扩展是增量式的，不破坏现有消费者
- `project init` 不带 `--adapters` 时行为与之前一致（只多了一步适配器选择提示）
