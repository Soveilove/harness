# 学习报告

> 由 Sovei 阶段生成：learn
> Feature：004-artifact-version-guard

## 观察

### 1. onboarding 产物版本感知模式（candidate/pending）

- **来源 Feature**：004-artifact-version-guard
- **证据**：grill 阶段事实核实确认 `business-map.json`/`redlines-seed.json` 的 `scannerVersion` 长期"只写不读"；本 Feature 引入 `artifact-version-guard.ts` 作为读侧/写侧版本守卫，并以 `rescan` 作为重扫一等公民入口。
- **适用范围**：Sovei 所有持久化产物（业务地图、红线 seed、知识索引 snapshot）。`context/snapshot.ts` 已有类似的 snapshot 版本追踪，但 onboarding 产物此前缺失。
- **建议目标**：candidate（不自动晋级 stable）。此模式可能推广到其他 `scannerVersion`/`engineVersion` 字段的产物，需多个 Feature 反复触及后再考虑晋级。
- **处置**：作为 candidate 观察记录，不直接晋级 stable（符合"单次观察不得直接晋级"）。

### 2. 拒绝模式：升级后依赖人工记忆重扫

- **来源 Feature**：004-artifact-version-guard
- **证据**：升级后旧产物无任何自动提示，靠人肉重跑 onboard。本 Feature 将其转为显式守卫 + 可发现的重扫入口。
- **建议目标**：已由本 Feature 修复；作为拒绝模式记录，避免回归到静默无提示状态。

## 结论

无 stable 晋级提案。无未关闭的架构债务条目。`project.ts` 体积热点通过提取 `runOnboardScan` 共享 handler 得到缓解，未加剧。
