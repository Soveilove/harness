# Wayfinder: 023-quick-agent-adapters
> IDE 快速通道指令适配（用户交互式选择）| 所有决策已解决 | fog: 空

## 目标
让用户在 `sovei project init` 或 `sovei adapters install` 时交互式选择要安装哪些 IDE 适配器的快速通道指令。

## 实施前沿
1. `adapters/registry.ts` — IDEAdapter 接口扩展（quickChannelDirective + slashCommand）
2. `adapters/installer.ts` — 新增安装器（接收选中的 adapter ID 列表，生成对应指令文件）
3. `cli/commands/adapters.ts` — 新增 `sovei adapters list/install` CLI
4. `cli/commands/project.ts` — project init 集成交互式选择
5. 测试

## 范围外
- 适配器内容的国际化（暂时只中文）
- 适配器版本管理/升级
