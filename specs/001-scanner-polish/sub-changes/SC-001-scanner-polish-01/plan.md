# 实施计划：SC-001-scanner-polish-01

## 目标

让代码面红线按 pattern 聚合，消除候选 ID 随文件数膨胀和文件名变化 churn。

## 模块边界

只改 `RedlineScanner.scanCodeSurfaces` 的代码面 pattern 扫描；不改候选 schema、结构性红线、人工红线和业务地图消费逻辑。

## 数据流

`surfaceFiles` → 读取最多 60 个文件 → `patternHits` 按 CODE_PATTERNS 索引聚合 → 每个 pattern 生成一条候选 → `add()` 以 category+固定 title 生成稳定 ID → business map 关联候选 ID。

## 实施步骤

1. 按 pattern 索引收集命中文件路径。
2. 使用固定 `pattern.title` 生成候选标题，不再包含文件名。
3. 将命中文件以逗号分隔写入 `source`。
4. 保持结构性红线和其他扫描源不变。
5. 运行 M2 回归及全量测试。

## 兼容与恢复

`CandidateRedline` 字段不变；旧 seed 通过下一次 onboard/rescan 重建。失败时不激活候选，不影响 `redlines.json`。

## 验证

- 多文件同 pattern → 单候选。
- source 包含全部路径。
- 文件改名 → ID 不变。
- 全量测试通过。
