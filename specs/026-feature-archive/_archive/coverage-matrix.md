# Coverage Matrix: 026-feature-archive

## 验证面

| 维度 | 覆盖项 | 证据类型 |
|---|---|---|
| **功能：归档 completed Feature** | 归档后 `_archive/` 含过程产物，顶层只剩持久文件 | 单元测试 |
| **功能：非 completed Feature 拒绝** | 非 completed 状态报错，不执行文件操作 | 单元测试 |
| **功能：Feature 不存在** | 报错退出，不创建目录 | 单元测试 |
| **功能：幂等性** | 二次运行不报错，已归档文件跳过 | 单元测试 |
| **功能：_archive/ 已有同名文件** | 跳过不覆盖 | 单元测试 |
| **功能：非 .md 文件不动** | .yaml/.jsonl/.json 留在顶层 | 单元测试 |
| **功能：子目录不动** | history/、decision-tickets/ 不动 | 单元测试 |
| **CLI 注册** | `sovei feature archive <id>` 命令可用 | 集成测试 |
| **中文输出** | 终端输出中文 | 人工检查 |

## 测试策略

- 使用 `MemoryStorage`（内存存储后端）进行单元测试
- 测试场景：
  1. completed Feature → 正确归档
  2. in_progress Feature → 报错
  3. 不存在的 Feature → 报错
  4. 二次归档 → 幂等
  5. _archive/ 已有文件 → 跳过
  6. 非 .md 文件 → 不动
  7. 子目录 → 不动
