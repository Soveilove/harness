# Sovei 1.1 Stage Contracts

Every invocation executes exactly one stage and then stops. Before stage work, resolve and report the stage's internal, active third-party, candidate, and alternative Skills from `workflows/sovei/skill-map.yaml` (relative to harness root: `harness/` in central, `.specify/` in project). Candidate and alternative Skills are never executed.

## load

- Input: Harness index, Memory index, workflow definition, Feature state, actual Artifact list.
- Action: Validate state against files and load only task-relevant knowledge.
- Output: Sources used, risk level, current/completed stages, blockers, next legal stage.
- Bootstrap: When the user explicitly supplies a Feature with no state, create only `workflow-state.yaml`; record `load` completed and `grill` waiting.
- Stop: Ambiguous Feature, version mismatch, Artifact conflict, or missing state without explicit bootstrap scope.
- Writes: none for existing state; state file only for bootstrap.

## grill

- Input: Valid load result and current request.
- Action: Resolve facts from files first; ask one decision question at a time only for choices that materially change scope.
- Output: `decision-log.md` with decision, rationale, alternatives rejected, status, and unresolved items.
- Stop: Continue asking until scope-changing decisions are resolved; never implement.

## spec

- Input: Accepted decisions and relevant Business/Memory/Baseline evidence.
- Action: Define problem, user-visible behavior, boundaries, acceptance scenarios, and explicit exclusions.
- Output: `spec.md` without volatile implementation paths.
- Stop: Any unresolved decision that changes user behavior or contract.

## scope

- Input: Valid Spec and current source tree.
- Action: Trace real entry, state, parameters, I/O, async lifecycle, consumers, recovery paths, compatibility paths, and verification surfaces.
- Output: `scope.md` and `coverage-matrix.md`; mark unsupported claims `candidate`.
- Stop: Missing evidence for a required behavior or an unbounded impact surface.

## plan

- Input: Valid Spec, Scope, Coverage Matrix, architecture rules, and decisions.
- Action: Define module boundaries, state/data flow, contracts, migration strategy, and validation.
- Output: `plan.md` with no implementation edits.
- Stop: Return to scope when required coverage is missing; do not plan around unknowns.

## tasks

- Input: Valid Plan, Scope, Coverage Matrix, decisions, and current code baseline.
- Action: Split work into independently verifiable vertical tasks small enough for one fresh context. Declare dependencies, file/contract surface, acceptance criteria, and validation for each task.
- Output: `tasks.md`; do not modify implementation files.
- Stop: Reopen `plan` or `scope` when a task depends on an unresolved contract or unknown impact surface.

## implement

- Input: One ready task, Spec, Scope, Plan, rules, and the current baseline.
- Action: Implement only the selected ready task, preserve unrelated changes, and run focused validation proportional to risk.
- Output: Product/tooling changes plus `change-manifest.md` recording task, files, behavior, tests, and remaining work.
- Completion: Stay in `implement` while ready tasks remain. Add `implement` to completed stages only after every required task is done or explicitly deferred with authorization.
- Stop: Reopen the earliest invalid stage when implementation reveals a new decision, scope, or design constraint. Never silently expand the task.

## converge

- Input: Spec, Scope, Plan, Tasks, Coverage Matrix, Change Manifest, baseline, and current implementation.
- Action: Classify each gap as `missing`, `partial`, `contradicts`, or `unrequested`; append corrective tasks instead of rewriting history.
- Output: `convergence-report.md` with evidence and disposition for every finding.
- Stop: Return to `tasks` for implementation gaps or reopen an earlier stage for contract gaps. Do not claim completion with open high-severity findings.

## verify

- Input: Acceptance scenarios, Coverage Matrix, implementation, convergence result, and environment capabilities.
- Action: Verify requirement compliance and engineering quality separately using focused tests plus real journey, request/log, or visual evidence when applicable.
- Output: `evidence.md` with command, result, evidence location, limitations, and verdict.
- Stop: Return to `tasks` or `converge` on failure. Async or visual behavior cannot pass on unit tests alone.

## learn

- Input: Decisions, implementation deviations, convergence findings, verification evidence, and current Harness knowledge.
- Action: Classify observations as project-only, candidate/pending, stable promotion proposal, or rejected pattern. Never promote a single observation directly to stable.
- Output: `learning-report.md` with source Feature, evidence, scope, and proposed destination.
- Stop: Require manual review before changing stable Harness knowledge.

## sync

- Input: Verified Feature, reviewed learning promotions, explicit target project authorization, and current `SYNC.md` rules.
- Action: Run target `Status` and `Diff`, review protected paths, then Pull only explicitly authorized projects and re-run Diff.
- Output: `sync-report.md` with targets, before/after differences, protected files, command results, and skipped targets.
- Completion: After all authorized targets pass post-sync checks, mark the workflow `completed` with `next_stage: null`.
- Stop: No authorization, dirty/ambiguous target, protected-path conflict, or failed post-sync Diff. Never batch Pull by implication.

## reopen

- Input: Valid state, completed target stage, and explicit reason.
- Action: Run the deterministic reopen script, invalidate the target and completed successors, increment revision, and append `workflow-history.md`.
- Output: Updated `workflow-state.yaml` and `workflow-history.md` only.
- Stop: Unknown/uncompleted target, empty reason, invalid state, or failed post-transition validation.
