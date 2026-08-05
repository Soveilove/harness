# 学习报告

> 由 Sovei 阶段生成：learn
> Feature：005-artifact-guard-hardening

## 观察

### 1. 守卫边界应严格对应"命令是否消费该产物"（candidate/pending）

- **来源 Feature**：005-artifact-guard-hardening（也源于 004 的过度阻断）
- **证据**：004 给 `knowledge list`/`status` 加了 onboarding 产物守卫，但这俩命令不消费 business-map/redlines-seed 内容，导致旧产物时被无关阻断。005 修正为只给真实消费的命令（map/redline）保留守卫。
- **适用范围**：所有"版本/健康守卫"类设计——守卫的目标应是"防止把旧数据当作当前真相"，而非"阻断所有读旧数据的命令"；只读查询（如 list/status）若不代表旧产物，不应被卡。
- **建议目标**：candidate（不自动晋级 stable）。此模式值得在后续所有持久化守卫设计中复用，但需多个 Feature 反复触及后再考虑晋级。

### 2. 门禁确认应走 review-pack 正规流程（candidate/pending）

- **来源 Feature**：005-artifact-guard-hardening（004 的流程缺口）
- **证据**：004 用 `workflow confirm --role product` 直接确认，未生成 `tech-review.md`/`product-review.md`，reconciliation Sign-off 留空。005 补齐：`review-pack generate` → 生成两个审阅视图 → `review-pack import` 导入 product → `workflow confirm` 补 tech。
- **适用范围**：Sovei 门禁治理流程本身。`review-pack` 提供面向角色的审阅视图，是门禁的实质内容，不应跳过。
- **建议目标**：candidate。可作为团队流程规范，让"门禁必须走 review-pack"成为可参考做法。

## 结论

无 stable 晋级提案。无未关闭的架构债务条目。两个观察均为可复用工程经验，保留为 candidate 待后续验证。
