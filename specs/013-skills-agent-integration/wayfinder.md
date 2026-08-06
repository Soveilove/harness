# 决策地图

## 目标

skills 渲染进各 Agent 上下文文件（AGENTS.md/CLAUDE.md/.cursorrules/GEMINI.md/.aiderrules 等），Agent 读取后通过 sovei workflow 调用对应阶段 skill，并预留 MCP 协议边界

## 备注

参考 OpenSpec sync 多格式输出；Agent 统一经 sovei workflow 调用；skills 只读产候选由 Sovei 校验；不实现 MCP server

## 已完成决策

- [Agent 接入深度：上下文文件为主 + 预留 MCP 协议](decision-tickets/D-001.json) - 采用上下文文件为主+预留MCP协议。skills 渲染进各 Agent 上下文文件（AGENTS.md/CLAUDE.md/.cursorrules 并扩展 GEMINI.md/.aiderrules/.windsurfrules），Agent 通过 sovei workflow 调用；本次不实现 MCP server

## 尚未明确

（无）

## 范围外

（无）
