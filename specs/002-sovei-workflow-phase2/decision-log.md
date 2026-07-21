# Decision Log

## D-001 Phase 2 首个交付切片

- Context: 当前工作流只支持到 `plan`；`tasks` 及后续阶段仍为 Future。同时，`plan` 发现 Scope 缺口时，状态机不能安全退回 `scope`，直接实现执行闭环会缺少返工协议。
- Recommended decision: 首个切片采用“基础控制优先”：先实现可审计的阶段 `return/reopen` 协议，再把 `tasks` 升级为 Active；本切片不包含业务代码执行、`implement`、`converge` 或 `verify`。
- Priority after this slice: P1 `implement` 写入与人工确认门禁；P2 `converge + verify` 证据闭环；P3 `wayfind`；P4 `learn/sync`、第三方 Skill 安装器和其它 IDE Adapter。
- Rationale: `return/reopen` 是后续阶段发现缺口时的安全基础，`tasks` 是现有 `plan` 与实现之间最小可用桥梁；两者完成后即可用工作流继续拆解后续开发，又不会把整个执行闭环塞进一次迭代。
- Rejected alternative A: 只实现 `tasks`，暂不处理返工。原因是任务拆解发现 Scope/Plan 缺口时仍需人工改状态，无法形成可靠门禁。
- Rejected alternative B: 一次实现 `tasks/implement/converge/verify`。原因是范围过大、验证面过宽，并违背单阶段和新上下文迭代原则。
- Decision: 用户明确授权一次系统维护例外，先直接完成 12 阶段、返工协议、模板、适配器与验证工具，再使用本 Feature 从 `wayfind` 开始回放调优。
- Status: accepted

## Unresolved Items

- 无。
