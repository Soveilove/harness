# 任务清单

- [x] TASK-001: 统一 BOM/JSON/JSONC 解析
  - 依赖：无
  - 范围：config 解析器、ProjectScanner、Rules scanner/repository/adaptation
  - 验收：BOM + URL、注释、尾逗号测试通过；非法输入明确失败

- [x] TASK-002: 补齐 Rules 废弃生命周期
  - 依赖：TASK-001
  - 范围：Rules Repository、CLI、事件日志、测试
  - 验收：candidate/active 可废弃，重复废弃失败，resolve/context 不返回废弃规则

- [x] TASK-003: 收敛发布构建和自举验证
  - 依赖：TASK-001、TASK-002
  - 范围：build scripts、package 白名单、release smoke test、根 file 依赖
  - 验收：无 map；tarball 三文件；完整测试连续两轮通过；本轮不 publish
