# A/B/C 工程同步指引

这是 `E:\memory` 中唯一的工程同步操作指引。

## 1. 固定边界

| 工程 | 路径 |
|---|---|
| A | `E:\project\holopix\pino-front` |
| B | `D:\holopix\pino-front-b` |
| C | `D:\holopix\pino-front-c` |
| 中枢 | `E:\memory\harness` |

同步只允许以下方向：

```text
来源工程中的已验证改进
  -> 人工审查并提炼为稳定内容
  -> E:\memory\harness
  -> A / B / C 的 .specify
```

禁止 A、B、C 互相覆盖，也禁止把任一工程的整套 `.specify/` 直接复制到中枢。

## 2. 分发前检查

在 PowerShell 中查看三个工程状态：

```powershell
& E:\memory\harness\scripts\powershell\sync-harness.ps1 -Mode Status
```

查看单个工程差异：

```powershell
& E:\memory\harness\scripts\powershell\sync-harness.ps1 `
  -Mode Diff `
  -ProjectPath E:\project\holopix\pino-front
```

`Diff` 和 `Status` 只读，不修改工程。

## 3. 分发到单个工程

确认差异后执行：

```powershell
& E:\memory\harness\scripts\powershell\sync-harness.ps1 `
  -Mode Pull `
  -ProjectPath E:\project\holopix\pino-front
```

将 `ProjectPath` 替换为 B 或 C 的路径即可。分发规则：

- 中枢稳定内容写入 `<工程>/.specify/`。
- 已存在的 `.specify/feature.json` 不覆盖。
- `specs/` 不读取、不复制、不删除。
- 已存在的项目根 `AGENTS.md` 和 `CLAUDE.md` 不覆盖。
- CodeBuddy 的中枢加载器和核心约束按脚本清单分发。
- Sovei Codex Skill 只写入 `<工程>/.agents/skills/sovei-workflow/`。
- Sovei Claude Commands 只写入 `<工程>/.claude/commands/sovei/`。
- 其它项目 Skills、Commands 和 IDE 配置不覆盖。
- 分发不会删除工程中的额外文件；发现遗留文件时必须单独审查，不能自动清空目录。

分发后再次运行同一工程的 `Diff`，预期输出：

```text
Difference count: 0
```

## 4. 分发到全部工程

先对 A、B、C 分别执行 `Diff` 并审阅，再逐个执行 `Pull`。当前不提供无确认的批量覆盖命令，避免一个错误的中枢版本同时污染三个工程。

## 5. 工程改进晋级到中枢

工程到中枢没有自动 Push。按以下步骤人工处理：

1. 在来源工程确认改进已经实现并具有验证证据。
2. 判断内容是否跨 A/B/C 通用；分支状态、Feature 产物和项目专属路径不晋级。
3. 只修改 `E:\memory\harness` 中对应的稳定源文件，不复制整套目录。
4. 检查索引、引用和适用范围，避免把候选结论写成稳定规则。
5. 先运行三个工程的 `Status`，确认预期影响面后再按工程分发。

## 6. Bash 兼容入口

需要在 Git Bash 中操作时，可使用：

```bash
/e/memory/harness/scripts/bash/sync-harness.sh status
/e/memory/harness/scripts/bash/sync-harness.sh diff /e/project/holopix/pino-front
/e/memory/harness/scripts/bash/sync-harness.sh pull /e/project/holopix/pino-front
```

PowerShell 脚本是 Windows 环境的首选入口；两套脚本必须遵守相同的保护边界。
