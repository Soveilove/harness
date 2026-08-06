# 验证证据

> 由 Sovei 阶段生成：verify
> Feature: 018-adapted-rule-dedup

## 验证场景与结果

### AC1/AC3 — 单元测试：同章节重复语句去重
- **命令**：`node --test test/rules.test.mjs`（`packages/sovei-core`）
- **结果**：
  - `ok 10 - adapted candidates deduplicate repeated statements within the same section` ✅
  - `ok 11 - project rules fail closed with a diagnostic message for duplicates within the same file` ✅
- **全量**：`node --test test/*.test.mjs` → **109 pass, 0 fail**。
- **构建**：`pnpm run build`（tsc + build-release）通过。

### AC2 — 同文件重复 id 报错可诊断
- **断言**：`同一文件内存在重复规则 id IN_FILE_DUP（title: Second copy）` ✅（测试 `ok 11` 覆盖）

### AC4 — 端到端复跑（核心验证）
- **命令**：在 `d:\project\xmiles\ad-materials-frontend` 用本地修复后 CLI 运行 `sovei rules adapt`
- **命令路径**：`node d:\project\harness\packages\sovei-core\dist\release\sovei.cjs rules adapt`
- **结果**：
  - 无 `Duplicate project rule id` 报错 ✅
  - 成功写入 `harness/project/rules/adapted.rules.json`，候选 492 条
- **产物校验**：`adapted.rules.json` → total 492, unique 492, **0 重复** ✅

## 证据位置
- `packages/sovei-core/test/rules.test.mjs`（新增 2 用例）
- `d:\project\xmiles\ad-materials-frontend\harness\project\rules\adapted.rules.json`（复跑产物）

## 限制
- 端到端复跑使用的是本地构建产物（`dist/release/sovei.cjs`），非已发布全局包；发布到全局后用户侧即生效。
- 未涉及异步/视觉行为，无需额外运行证据。

## 结论
所有验收标准（AC1–AC4）均已满足，无失败项。可进入 learn。
