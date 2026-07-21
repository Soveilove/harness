# Learning Report

## Stable Improvements

1. Codex 仓库共享工作流使用 `.agents/skills`，不使用已弃用且仅用户本机生效的 custom prompts。
2. 用户入口 Skill 通过 `policy.allow_implicit_invocation: false` 保证显式调用。
3. `load` 对已有状态只读；只有显式 Feature bootstrap 可以创建状态文件。
4. 同步枚举必须排除 `.pyc`、`__pycache__` 等运行时产物。
5. 核心协议保持单一来源，Claude Commands 只做调用转换。

## Pending

- Phase 2 的写入授权、任务粒度、converge 和 verify 契约需要产品 Feature 回放后再稳定。
- Baseline 中枢备份、其它 IDE 适配和历史回放指标仍待后续 Feature 决策。

## Scope

这些结论适用于 Sovei Harness 工作流本身；未改写 Pino Front 的业务规则或代码地图。
