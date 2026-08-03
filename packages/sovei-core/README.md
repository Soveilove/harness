# Sovei

Sovei 是一个便携式 TypeScript 工作流引擎，提供开发 SOP、类型化项目知识、决策地图、重大变更控制和演进式架构治理。

当前通过 npm `next` 通道发布 Sovei 2.1 开发版，用于实地试用，尚未进入稳定发行。

## 安装

```bash
pnpm add --global @soveilove/sovei@next
sovei --version
sovei --help
```

## 工作流

每次调用只执行一个阶段：

```text
load -> grill -> wayfind -> spec -> scope -> plan -> tasks -> implement
-> converge -> verify -> learn -> sync
```

项目数据保存在 `harness/project/`，Feature 产物保存在 `specs/`。安装或升级 CLI 只替换工具壳，不会静默重写项目数据。

源码与开发文档：
https://github.com/Soveilove/harness