# Sovei Harness Repository Guidance

- Start repository work with the `knowledge-loader` Skill and use `harness/` as the stable knowledge source.
- Use `$sovei-workflow` only when the user explicitly asks to run, inspect, resume, or advance the Sovei workflow.
- Execute exactly one Sovei stage per user invocation. Never chain stages, even when the user asks for several; report the exact next command instead.
- Resolve and report every stage dependency from `harness/workflows/sovei/skill-map.yaml`. Never treat candidate third-party Skills as installed.
- Treat `packages/sovei-system/` as the private development package for central tooling. Install Node dependencies there and keep distributable Harness files runtime-independent.
- Phase 1 active stages are `load`, `grill`, `spec`, `scope`, and `plan`. Treat later stages as future until their Skill contracts and verification evidence exist.
- Treat `specs/`, `workflow-state.yaml`, Feature pointers, and Baselines as instance state. Never distribute them to A/B/C.
- Promote project knowledge to `harness/` only after source validation and manual review.
- Do not run ABC `Pull` or modify product workspaces without an explicit user request. Read-only `Diff` and `Status` are allowed for verification.

## Focused Verification

```powershell
pnpm --dir packages\sovei-system run check
& <python> -B .agents\skills\sovei-workflow\scripts\test_validate_workflow.py
& <python> .agents\skills\sovei-workflow\scripts\validate_workflow.py --repo-root E:\memory --feature specs/<feature>
& .\harness\scripts\powershell\sync-harness.ps1 -Mode Status
```
