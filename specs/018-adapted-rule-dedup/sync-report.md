# 同步报告

> 由 Sovei 阶段生成：sync
> Feature: 018-adapted-rule-dedup

## 同步目标
- 无外部同步目标需要推送（本 Feature 为 `packages/sovei-core` 源码 + 单测改动，不涉及 agent context 文件或外部系统）。

## 同步前差异
- 源码改动：`src/config/project-rule-scanner.ts`（按 id 去重）、`src/rules/repository.ts`（报错增强）、`test/rules.test.mjs`（新增 2 用例）。

## 受保护文件
- 无受保护路径冲突（未触碰 `AGENTS.md` / agent context 文件）。

## 命令结果
- 见 `evidence.md`：构建通过、109 测试通过、`ad-materials-frontend` 复跑成功。

## 跳过目标
- 无。

## 结论
所有授权目标无冲突，工作流可标记 completed。
