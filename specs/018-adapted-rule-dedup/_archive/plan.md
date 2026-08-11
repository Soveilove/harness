# 实现计划

> 由 Sovei 阶段生成：plan
> Feature: 018-adapted-rule-dedup

## 模块边界

1. **`src/rules/adaptation.ts` — `scanProjectRuleCandidates`（核心修复）**
   - 职责：收集所有候选规则，返回前按 `id` 去重，保留首个出现。
   - 变更：在函数末尾 `return candidates.sort(...)` 之前插入去重逻辑。
   - 契约：返回 `ProjectRule[]`，无重复 id。

2. **`src/rules/repository.ts` — `load()`（报错增强）**
   - 职责：加载 `*.rules.json` 时登记 id，遇重复抛错。
   - 变更：当 `previous === source` 时，报错改为「同一文件内存在重复规则 id <id>（title: <title>）」，否则保留「文件 A 与 文件 B」提示。
   - 契约：重复 id 仍抛错（fail-closed），仅错误信息更可诊断。

3. **`test/rules.test.mjs`（回归）**
   - 新增用例：构造「同一章节两行相同语句」的 markdown fixture，断言 `scanProjectRuleCandidates` 返回中该 id 唯一。
   - 调整：现有 `rules.test.mjs:27` 的重复断言可补充同文件场景断言。

## 数据流

```
docs/*.md ──提取→ scanProjectRuleCandidates() ──按id去重──→ candidates[]
                                                              │ 写盘
                                             adapted.rules.json
                                                              │ 加载
                                    repository.load() ──同/跨文件报错增强──→ 规则集
```

## 契约
- 不新增/删除/改名任何 CLI 命令。
- `adapted.rules.json` schemaVersion 保持 1。
- 唯一性约束（id 唯一）不放松。

## 验证方式
- `pnpm run check`（tsc --noEmit）：类型检查。
- `pnpm test`（node --test）：单测，含新增去重用例。
- 发布前 smoke：在 `xmiles/ad-materials-frontend` 复跑 adapt 确认无重复 id 报错。

## 迁移策略
- 无自动迁移。已污染的历史文件（本次 `ad-materials-frontend` 的 `adapted.rules.json`）已人工去重。
