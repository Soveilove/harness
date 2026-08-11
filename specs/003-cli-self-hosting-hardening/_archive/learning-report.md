# 学习报告

## 来源

- Feature：003-cli-self-hosting-hardening
- 证据：两轮 51/51 测试、真实 CLI、自举安装、架构检查和 tarball 白名单。

## Candidate 观察

### C-001 项目 JSON 应统一解析

- 观察：Windows BOM 与 JSONC 在多个初始化入口出现时，分散的正则会误伤 URL 或产生不一致。
- 适用范围：Sovei 项目声明、包清单、tsconfig、Rules 等项目输入。
- 建议目标：candidate 工程规则；本轮不得自动晋级 stable。

### C-002 本地 file 依赖与构建目录应避免全量删除竞争

- 观察：自举仓库同时作为包生产者和消费者时，递归删除整个 dist 会扩大竞争窗口。
- 适用范围：Sovei 自举开发仓库。
- 建议目标：candidate pitfall；需在更多版本中重复验证后再晋级。

### C-003 CLI 混淆不是加密

- 观察：无 map、bundle 和混淆能提高逆向成本，但客户端执行代码无法获得真实机密性。
- 适用范围：公开 npm CLI 发布。
- 建议目标：项目发布说明，不自动转为业务红线。

## Stable 晋级

无。以上均为单次 Feature 观察，等待人工审查和后续证据。

## 架构债务

无新增 required 债务；架构适应度检查通过。
