# Sovei 快速通道

在编辑代码前，必须先走快速通道：

使用 execute_command 工具运行：
```bash
sovei quick "$ARGUMENTS" --paths <变更文件> --exclude dist/**
```

检查返回的 riskLevel：
- fast-track: 可直接编辑
- escalated: 需人工确认范围

编辑完成后运行测试，快速通道会记录 usage 并验证 git diff 范围。