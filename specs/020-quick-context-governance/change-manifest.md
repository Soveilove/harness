# 变更清单

> Feature: 020-quick-context-governance
> 阶段: implement / verification evidence

## Implemented

- Added QuickRun contracts for six ordered phases, terminal states, interruption, and explicit risk/unverified fields.
- Added append-only usage events with unknown token semantics and interrupted-run detection.
- Added read-only Git baseline/diff verification with scope and out-of-scope reporting.
- Added Context Policy full/scoped/index+on-demand shadow variants while preserving full actual context behavior.
- Preserved global absolute redlines in scoped shadow context.
- Added `sovei quick` CLI and exported Quick/usage/Git contracts.
- Added `.claude/commands/sovei-quick.md` as a thin wrapper; the CLI remains authoritative.
- Changed Quick verification so no observed implementation diff cannot be reported as completed.
- Made project initialization read the current `DEFAULT_WORKFLOW.version` instead of hard-coding an old version.
- Added usage initialization and `.gitignore` compatibility behavior without overwriting existing history.

## Verification evidence

- `pnpm --dir packages/sovei-core check` passed.
- `pnpm --dir packages/sovei-core test` passed: 121 tests, 0 failures.
- Temporary Git scenarios cover in-scope completion, no-diff stop, out-of-scope escalation, unreadable baseline, and non-repository status.
- Quick usage events are append-only and do not write ordinary Feature workflow events.
- Context Policy regression covers global absolute redlines and preserved full actual context.

## Cross-context behavior

Quick persists structured facts in `harness/project/usage.jsonl`. A `run-start` without a matching `run-end` is identifiable as interrupted in a later conversation. The log intentionally excludes the original prompt, source, and absolute paths, so a new conversation must restate and reconfirm the target before editing; it does not automatically resume a partially completed natural-language request.

## Deferred by specification

- Standard workflow usage observation is not switched to scoped delivery; actual context remains full until controlled evaluation.
- No usage export, billing, pricing, external telemetry, or automatic rollback is added.
- Controlled experiment release gates remain a later evaluation concern.
