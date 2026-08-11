# 决策地图

## 目标

修复 quick 通道过度防御缺陷，让 expanded 降级为警告

## 备注

4 项决策已在 grill 全部解决，详见 decision-log.md

## 已完成决策

- [expanded 不阻塞流程](decision-tickets/D-001.json) - status='expanded' 不应阻塞流程，应降级为警告。已记录在 decision-log.md D1。
- [declaredPaths 放宽](decision-tickets/D-002.json) - declaredPaths.length !== 1 改为 length === 0。0 paths 时 escalation，2+ paths 正常工作。已记录在 decision-log.md D2。
- [冷启动引导](decision-tickets/D-003.json) - escalated 且 baselineRevision 为 null 时在 report 中添加冷启动引导信息。已记录在 decision-log.md D3。
- [expanded 上下文警告](decision-tickets/D-004.json) - expanded 状态时在 report 中添加 contextWarning 说明上下文相关性不确定。已记录在 decision-log.md D4。

## 尚未明确

（无）

## 范围外

（无）
