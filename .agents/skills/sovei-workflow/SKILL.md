---
name: sovei-workflow
description: Execute, resume, or reopen a repository Sovei Feature workflow with file-backed stage gates from load through sync. Use only when the user explicitly invokes $sovei-workflow or asks to run, inspect, advance, or reopen a Sovei stage. Do not trigger implicitly for ordinary coding tasks.
---

# Sovei Workflow

Run the requested Sovei stage against the current Feature's files. Treat filesystem artifacts as truth and stop on any state conflict.

## Resolve Paths

1. Resolve `<repo-root>` from Git or the current working directory.
2. Resolve `<harness-root>` as `<repo-root>/harness` in the central repository or `<repo-root>/.specify` in a product repository.
3. Resolve the Feature from an explicit `FEATURE=` argument, then a project Feature pointer if present, then a single active `specs/*/workflow-state.yaml` candidate.
4. Never guess when multiple active candidates exist.

## Start Every Invocation

If `workflow-state.yaml` exists, run the validator before reading or writing stage artifacts:

```text
python <skill-root>/scripts/validate_workflow.py --repo-root <repo-root> --feature <feature-path>
```

Use an actual bundled/runtime Python available in the environment; do not assume a Windows Store `python` alias is executable. The validator is read-only. If it fails, report the exact conflict and stop; do not repair state unless the user separately authorizes that repair.

If the state file does not exist, allow bootstrap only when the user explicitly requested `load` and supplied an unambiguous Feature path. Read the Harness and Git baseline first, then create `workflow-state.yaml` from the template with `load` completed and `grill` waiting. Do not create any other Artifact during bootstrap.

Read:

- `<harness-root>/workflows/sovei/workflow.yaml`
- `<harness-root>/workflows/sovei/skill-map.yaml`
- `<feature>/workflow-state.yaml`
- [references/stage-contracts.md](references/stage-contracts.md), only for the requested stage
- Existing prerequisite artifacts named by the stage contract

## Select The Stage

- If the user names a stage, execute only that stage.
- If no stage is named, execute `load` only.
- Supported stages in version 1.1.0: `load`, `grill`, `wayfind`, `spec`, `scope`, `plan`, `tasks`, `implement`, `converge`, `verify`, `learn`, and `sync`.
- Execute exactly one stage per invocation. Never chain stages, even when the user requests multiple stages or asks to finish the whole workflow.
- When multiple stages are requested, execute only the current legal stage and report the next command the user must invoke in a new context.

## Reopen A Stage

Treat `reopen TARGET=<stage> REASON=<reason>` as one control action, not a stage. Run `scripts/reopen_workflow.py` after the initial validator succeeds.

- Require an explicit target and non-empty reason.
- Allow only a stage already present in `completed_stages`.
- Invalidate the target and every completed successor, then set the target as `current_stage` and `next_stage`.
- Preserve the baseline, decisions, and blockers; append the transition to `workflow-history.md`.
- Execute no stage work in the same invocation. Report the reopened target as the next command.

## Resolve Skills

Use `skill-map.yaml` as the source of truth for stage dependencies.

- Load every `required_skills` entry that is available and active.
- `third_party_skills` lists third-party Skills that are actually installed and executed.
- `candidate_third_party_skills` and `alternative_third_party_skills` are inventory only. Never invoke them until their status is promoted to installed and they move into `third_party_skills`.
- Stop with `missing_required_skill` when a required Skill cannot be loaded. Do not silently replace it.
- Report all internal, active third-party, candidate, and alternative Skills for the executed stage so each dependency can be audited or replaced later.

## Enforce Gates

Before executing a non-load stage:

1. Require `current_stage` and `next_stage` to equal the requested stage.
2. Require every prerequisite Artifact from `workflow.yaml` to exist.
3. Require the stage to be marked `active` in `workflow.yaml`.
4. Stop on open blocking decisions or non-empty `blocked_by`.

After stage work:

1. Check the Artifact and stage completion criteria.
2. If work remains within the same stage, keep `current_stage` and `next_stage` unchanged, update the Artifact, and stop with the same next command.
3. When complete, add the stage to `completed_stages` exactly once for the current revision and move to one legal successor.
4. After `sync` completes, set `status: completed`, keep `current_stage: sync`, and set `next_stage: null`.
5. Update `updated_at`; do not alter `baseline_commit` implicitly.
6. Re-run the validator.

Do not mark a stage complete when its Artifact is partial, work remains in that stage, it contains unresolved blocking decisions, or validation failed.

## Output Contract

Always report the Feature path, risk level, knowledge sources, current/completed stages, validation result or blocker, changed Artifact, Skill usage from `skill-map.yaml`, and the exact next command for a new invocation. For an existing state, `load` makes no file changes; bootstrap may create only `workflow-state.yaml`.

## Safety Boundaries

- Treat `specs/`, `workflow-state.yaml`, Feature pointers, and project Baselines as instance-owned.
- Never copy Feature state between A/B/C workspaces.
- Never promote candidate knowledge to stable Harness during a stage invocation.
- Do not invoke `grill` unless the user explicitly requested it; ask one decision question at a time.
- Do not run `sync` Pull operations without an explicit target-project authorization in the same invocation.
- Do not use chat history as evidence that a stage completed.
