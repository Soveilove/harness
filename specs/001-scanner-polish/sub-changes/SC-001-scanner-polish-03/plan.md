# 实施计划：SC-001-scanner-polish-03

## 方案

`rescan` 默认调用 `verifyGitChanges` 获取 git diff 文件，筛选源码路径并传入 `ProjectScanner.scan`；RedlineScanner 和 BusinessMapScanner 在存在 changedFiles 时过滤内容读取；`--full` 或不可用 diff 使用全量扫描。

## 步骤

1. 保持 rescan 与 onboard 命令参数兼容，增加 `--full`。
2. 传递 changedFiles 到两个内容扫描器。
3. 维持目录遍历、包发现和产物写入流程。
4. 验证 changedFiles 过滤、无 git 回退、全量开关和全量回归。
