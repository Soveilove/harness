# harness

## Sovei Workflow

This project uses [Sovei](https://github.com/sovei) for structured development workflows.

### Key Commands
- `sovei context build --stage <stage> --feature <feature>`: Get stage prompt + context pack
- `sovei context build --stage spec --feature <feature> --cross-feature`: Include other features decision logs
- `sovei workflow <stage> <feature>`: Prepare a workflow stage
- `sovei workflow <stage> <feature> --complete`: Complete a stage and advance
- `sovei workflow confirm <feature> --stage <stage> --role <role> --by <name> --reference <ref>`: Confirm a gate
- `sovei workflow bootstrap <feature>`: Start a new feature
- `sovei project onboard --evidence-only`: Collect evidence for agent analysis (existing projects)
- `/sovei-quick`: Claude Code thin wrapper that forwards to the same local `sovei quick` contract; confirm scope before editing, then rerun verification after the change
- `sovei governance review-pack generate <feature>`: Render tech-review.md + product-review.md from reconciliation.md
- `sovei governance review-pack import <feature> --product <file> --by <name> --reference <ref>`: Import PM confirmation
- `sovei skills status`: Show connected external skills (local + global)
- `sovei skills use --global <dir>`: Connect a global skill into the local lock
- `sovei skills bind --stage <stage> --skill <id> --enable`: Bind a skill to a stage
- `sovei skills sync`: Render connected skills into agent context files (AGENTS.md/CLAUDE.md/.cursorrules/GEMINI.md/.aiderrules/.windsurfrules)
- `sovei skills clean`: Remove the sovei skills section from agent context files
- `sovei context cross-feature-index <feature> --paths <paths>`: Output JSON index of other features' decision-logs with relevance scores, wrapped in a `_subagentContract` envelope
- `sovei context expand <feature-id> <artifact-name>`: On-demand expand a single feature artifact (truncated to 4000 chars)
- `sovei context build --budget <chars> --cross-feature-limit <n>`: Build context pack with character budget and Top-N cross-feature filtering

### Sub-Agent Contract (IDE Integration)

When `sovei context cross-feature-index` outputs a `_subagentContract` envelope, the host AI (CodeBuddy, Claude Code, Codex) **should** dispatch sub-agents to parallelize the reading:

1. Run `sovei context cross-feature-index <feature> --paths <paths>` to get the scored index
2. Take the top N items by `relevanceScore` (e.g., 5)
3. **Dispatch one sub-agent per item** — each sub-agent runs `sovei context expand <featureId> decision-log.md` and returns the full output
4. Main agent collects all sub-agent results and uses them as cross-feature context

This avoids serial I/O when 50+ features exist. The `_subagentContract` field tells the host AI:
- `hint`: How to consume the items
- `expandCommand`: The command each sub-agent should run
- `parallelizable`: Always `true` for this contract
- `hostAgents`: Which host AI agents support this pattern

### Quick Channel (Every Code Change)

**Every code change must go through the quick channel** (`sovei quick`) — even small post-completion fixes:

1. Run `sovei quick "<description>" --paths <file>` **before** editing (exclusions auto-loaded from .gitignore)
2. Make the change
3. Run tests
4. The quick channel records usage and verifies git diff scope

### Workflow Stages

```
load → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync
```

### Confirmation Gates

- After **spec** (S2/S3 risk): product + tech confirmation required before scope
- After **verify** (always): product + tech confirmation required before learn
- Override: `sovei workflow override-confirm <feature> --stage <stage> --role <role> --by <name> --reason <reason>`

### Reconciliation

The spec stage produces `reconciliation.md` — a structured alignment document that:
1. Translates PM requirements into technical understanding
2. Restores current state (why code is the way it is, referencing prior feature decisions)
3. Lists solutions and their costs
4. Extracts questions for product and tech confirmation

Run `sovei governance review-pack generate <feature>` to render tech-review.md and product-review.md from it.

<!-- sovei-adapter-installed -->

### Quick Channel (CodeBuddy)

**每次代码变更必须走快速通道**——CodeBuddy Agent 必须在编辑代码前先执行：

1. 使用 execute_command 工具运行 `sovei quick "<变更描述>" --paths <文件> --exclude dist/**`
2. 检查返回的 riskLevel——若 escalated 需人工确认
3. 完成代码编辑
4. 运行测试验证
5. 快速通道记录 usage 并验证 git diff 范围
