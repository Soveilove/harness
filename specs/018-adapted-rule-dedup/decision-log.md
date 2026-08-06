# 决策日志

> 由 Sovei 阶段生成：grill
> Feature: 018-adapted-rule-dedup

## 背景

用户在 `xmiles/ad-materials-frontend` 项目中运行 harness 时，报错：
`Duplicate project rule id ADAPTED_doc_6607F3997D in harness/project/rules/adapted.rules.json and harness/project/rules/adapted.rules.json`。

经排查确认：这是 Sovei CLI（本仓库 `packages/sovei-core`，当前全局 2.5.5 与源码同版）的 bug，导致 `adapted.rules.json` 内写入重复 id。

---

## 事实核实（已查证，无需用户确认）

### F1 — 重复 id 确实存在且内容完全相同的两条规则
- 位置：`xmiles/ad-materials-frontend/harness/project/rules/adapted.rules.json`
- 重复 id：`ADAPTED_doc_6607F3997D`（来自 `docs/方案文档/ComfyUI节点数据结构说明.md` 章节「九、schemaJson 完整示例」，语句 `"required": true,`）
- 重复 id：`ADAPTED_doc_B13EF3AD53`（来自 `docs/workflow/base/AI创作系统需求文档（V1.2）.md` 章节「1.1 页面地图」，语句 `└── 工作流使用页`）
- 证据：用 node 脚本扫描得到 494 条规则、492 个唯一 id、2 个重复 id；两份源文档中对应语句各出现 2 次。
- 状态：已决

### F2 — 报错抛出的位置
- `repository.ts:50`：`if (previous) throw new Error(\`Duplicate project rule id ${rule.id} in ${previous} and ${source}\`)`
- 该 `load()` 会把同一 `rules/*.rules.json` 文件内的所有规则遍历并登记 id，遇重复即抛错。因重复发生在**同一文件内**，故 `${previous}` 与 `${source}` 打印出相同路径，造成"同一个路径出现两次"的错觉。
- 状态：已决

### F3 — 根因
- `adaptation.ts` 的 `scanProjectRuleCandidates()`：对每个源文档按章节切片后，**对章节内每一行语句直接生成候选规则**，未对「同一章节内重复出现的相同语句」去重。
- `idFor()` 的 hash 仅依赖 `kind + source路径 + 章节 + 语句`：当同一章节内出现两行完全相同语句时，生成完全相同的 id。
- 状态：已决

---

## 可推断决策（证据明确，自行决策并记录）

### D1 — 在 `scanProjectRuleCandidates` 生成候选后按 id 去重（治本）
- 决策内容：在 `scanProjectRuleCandidates` 组装候选后、返回前，对候选列表按 `id` 去重（保留首个出现）。
- 理由：从源头杜绝「同一章节重复语句 → 重复 id → 写入 adapted.rules.json 违反唯一性」的整条链路。即使源文档结构有噪声，也不会再产出重复规则 id。
- 被拒绝方案：
  - R-A：仅修 `idFor` 增加唯一后缀 → 虽消除 id 冲突，但会产出两条内容重复的规则（同一章节同一语句被重复提取），语义冗余，且后续仍需人工清理。不优。
  - R-B：在 `adaptProjectRules` 写入前去重 → 属于事后补救，扫描器仍会临时产生重复，且与 load 校验逻辑分离，防御面不足。
  - R-C：只修 `repository.load()` 容忍同文件重复 → 掩盖上游 bug，且唯一性是规则集的基本约束，不应放宽。
- 状态：已决

### D2 — 增强 `repository.ts` 重复 id 报错信息
- 决策内容：当重复 id 的 `previous` 与 `source` 相同时，明确指出「同一文件内存在重复规则 id」；否则提示「跨文件冲突」。报错补充规则 title，便于定位。
- 理由：当前报错在「同文件重复」场景下打印两个相同路径，易误导（本次用户正是因此困惑）。增强后诊断信息可读性大幅提升。
- 被拒绝方案：
  - R-A：仅改文案不加 title → 能区分同/跨文件，但缺少规则内容线索，仍需打开 JSON 查找。不优。
- 状态：已决

### D3 — 补充单元测试覆盖「同一章节重复语句只生成一条候选规则」
- 决策内容：在 `packages/sovei-core/test/rules.test.mjs` 新增测试：构造含「同一章节内两行相同规范语句」的 markdown fixture，断言 `scanProjectRuleCandidates` 返回中该 id 只出现一次。
- 理由：锁定本次修复行为，防止未来重构回退。测试框架为 `node:test`（`pnpm test`）。
- 被拒绝方案：
  - R-A：不加测试 → 回归风险高，不符合本项目自我迭代纪律。不优。
- 状态：已决

---

## 范围性决策（需用户确认）

### Q1 — 修复后是否发布新版本到全局 sovei
- 推荐答案：是。修复后按 `RELEASE_VERSION_POLICY` 递增 patch（2.5.5 → 2.5.6），走 `pnpm publish` 发布，用户更新全局包后问题根治。
- 理由：用户已明确「走完流程重新发布一下」，且本地全局安装的就是本源码的 2.5.5，只有发版才能让 `ad-materials-frontend` 等下游项目受益。
- 状态：用户已确认（会话中明确要求发布）

### Q2 — 是否需要在发布前用本地链路在 `ad-materials-frontend` 复跑验证
- 决策内容：是。发布前用本地构建/链路在 `xmiles/ad-materials-frontend` 重新 `adapt` 一次，确认不再产生重复 id，作为发布前 smoke 验证。
- 理由：该 bug 正是用户在该项目复跑时发现的（用户提到是在 Node 14 上测试 CLI 时发现的），在真实场景复跑是说服力最强的端到端验证，能确认用户遇到的情况彻底解决。
- 状态：已决（用户授权由我决定，采用复跑验证）

---

## 未决项清单
（无）
