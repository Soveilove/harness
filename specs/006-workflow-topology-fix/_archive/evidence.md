# 验证证据

> 由 Sovei 阶段生成：verify
> Feature：006-workflow-topology-fix

## 需求符合性验证

### 场景 1：`list-stages` 展示与真实执行一致

- **命令**：`cd packages/sovei-core && pnpm exec tsx src/cli/index.ts workflow list-stages`
- **结果**：spec 阶段显示 `依赖产物：decision-log.md, wayfinder.md`、`生成产物：spec.md, reconciliation.md`。wayfind 显示依赖 `decision-log.md`、生成 `wayfinder.md`。
- **证据位置**：终端输出（spec/grill/wayfind 行）
- **结论**：通过。spec 的 producesArtifacts 不再遗漏 reconciliation.md，requiredArtifacts 已含 wayfinder.md，`list-stages` 展示与实际执行契约一致。

### 场景 2：spec 阶段强制依赖 wayfind 产物

- **命令**：`cd packages/sovei-core && pnpm exec tsc --noEmit`（编译期校验） + `change-control.test.mjs`（运行期校验）
- **结果**：
  - `src/stages/index.ts` 与 `src/engine/workflow-engine.ts` 中 spec 的 requiredArtifacts 均为 `['decision-log.md', 'wayfinder.md']`，两处一致。
  - `change-control.test.mjs` 的 `002-pivot` fixture 补写 wayfinder.md 后，`prepareStage('spec')` 的 checkRequired 通过（6/6 测试通过）。
- **证据位置**：`packages/sovei-core/src/stages/index.ts:163`、`packages/sovei-core/src/engine/workflow-engine.ts:45`
- **结论**：通过。spec 阶段准备时强制校验 wayfinder.md 存在。

### 场景 3：现有功能不回归

- **命令**：`cd packages/sovei-core && node --test test/*.test.mjs`
- **结果**：75 项测试全部通过（pass 75 / fail 0），含 workflow、wayfinder、change-control、context、knowledge 等。
- **证据位置**：`packages/sovei-core/test/`
- **结论**：通过。修改未破坏既有功能。

## 工程质量验证

- **类型检查**：`pnpm exec tsc --noEmit` 通过，无类型错误。
- **lint**：三个修改文件均无 lint 诊断。
- **改动范围**：仅 3 个文件（index.ts、workflow-engine.ts、change-control.test.mjs），符合 plan 声明。

## 限制

- `list-stages` 验证通过 tsx 运行源码完成；全局 `sovei` 命令的 release 单文件（`dist/release/sovei.js`）未重新构建，需在发布流程中重新 build 后方可反映。这是发布时点的事项，非本 Feature 实现缺陷。

## 结论

需求符合性与工程质量均验证通过，无未解决阻塞。可进入 learn 阶段。
