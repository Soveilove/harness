---
description: 走 Sovei 快速通道验证代码变更
---

运行以下命令走快速通道：

```bash
sovei quick "$ARGUMENTS" --paths <变更文件>
```

> 排除路径自动从 .gitignore 读取，无需手动指定 --exclude。

然后：
1. 根据快速通道的 riskLevel 决定是否需要升级到完整工作流
2. 完成代码编辑
3. 运行测试验证
4. 再次运行快速通道验证 git diff 范围
