# Phase 1 Stage Contracts

Every invocation executes exactly one stage and then stops. Before stage work, resolve and report the stage's internal, active third-party, candidate, and alternative Skills from `harness/workflows/sovei/skill-map.yaml`. Candidate and alternative Skills are never executed.

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
