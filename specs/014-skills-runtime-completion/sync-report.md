# 同步报告

> Feature：014-skills-runtime-completion
> 阶段：sync

## 知识库变更

无需更新 stable 知识库。本 Feature 的学习均为 candidate/pending 观察，需要后续 Feature 验证后才能晋升。

## 产物归档

| 产物 | 位置 |
|---|---|
| decision-log.md | specs/014-skills-runtime-completion/ |
| spec.md | specs/014-skills-runtime-completion/ |
| reconciliation.md | specs/014-skills-runtime-completion/ |
| scope.md | specs/014-skills-runtime-completion/ |
| coverage-matrix.md | specs/014-skills-runtime-completion/ |
| plan.md | specs/014-skills-runtime-completion/ |
| tasks.md | specs/014-skills-runtime-completion/ |
| change-manifest.md | specs/014-skills-runtime-completion/ |
| convergence-report.md | specs/014-skills-runtime-completion/ |
| evidence.md | specs/014-skills-runtime-completion/ |
| learning-report.md | specs/014-skills-runtime-completion/ |
| sync-report.md | specs/014-skills-runtime-completion/ |

## 代码变更

| 文件 | 类型 |
|---|---|
| packages/sovei-core/src/skills/adapter.ts | 新增 |
| packages/sovei-core/src/skills/installer.ts | 新增 |
| packages/sovei-core/src/skills/upgrader.ts | 新增 |
| packages/sovei-core/src/stages/define-stage.ts | 修改 |
| packages/sovei-core/src/engine/workflow-engine.ts | 修改 |
| packages/sovei-core/src/providers/bootstrap.ts | 修改 |
| packages/sovei-core/src/cli/commands/workflow.ts | 修改 |
| packages/sovei-core/src/cli/commands/skills.ts | 修改 |
| packages/sovei-core/src/skills/index.ts | 修改 |
| harness/skills/skill-map.yaml | 修改 |
| harness/skills/skill-lock.yaml | 修改 |
| harness/vendor/mattpocock/skills/ (8 SKILL.md) | 新增 |
| packages/sovei-core/test/skill-adapter.test.mjs | 新增 |
| packages/sovei-core/test/skill-runtime.test.mjs | 新增 |

## 发版准备

- tsc --noEmit：通过
- 89 个测试：全部通过
- 版本递增：patch（v2.5.0 → v2.5.1）
