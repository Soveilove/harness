<!--
Sync Impact Report
- Version change: 1.1.0 → 1.2.0
- Modified principles: none
- Added sections: Documentation Language and Artifact Conventions
- Removed sections: none
- Follow-up TODOs: Existing English artifacts are not retroactively translated by this amendment; future Spec-Kit outputs must follow the language rule.
-->

# Harness Project Constitution

## Core Principles

### I. Specify and Clarify First
Every requirement MUST first pass `/speckit.specify` and `/speckit.clarify` before
planning or implementation. The resulting specification MUST define the user-facing
outcome, scope, non-goals, acceptance criteria, and compatibility boundaries. The
unfinished Sovei Workflow v3 self-iteration engine MUST NOT be required or invoked as
the development orchestrator. This keeps the source of truth reviewable while that
engine remains incomplete.

### II. Independent, Verifiable User Stories
Each requirement MUST be decomposed into independent user stories that describe a
valuable user outcome and have separately verifiable acceptance criteria. A development
cycle MUST address one clearly bounded requirement and MUST state what is out of scope.
Unrelated cleanup, redesign, migration, or Workflow v3 work MUST be deferred to a
separate requirement. This prevents scope expansion and makes progress measurable.

### III. Test-First and Evidence-Based
Implementation MUST follow a red-green-refactor sequence: write a focused failing test,
implement the smallest change that makes it pass, then refactor and run regression
verification. Completion claims MUST be supported by evidence from the relevant
acceptance tests, TypeScript checks, targeted tests, and the complete test suite. Tests
MUST cover changed contracts and integration boundaries where behavior crosses package,
CLI, persistence, or process boundaries.

### IV. Explicit State, Compatibility, and Migration Boundaries
Workflow state MUST have one explicit source of truth, with reads and writes governed by
an identified contract. Legacy Sovei `EventStore` and YAML data MUST remain read-only
unless a separate, explicit, clarified requirement authorizes migration. Migration MUST
specify its source, target, transformation, rollback or recovery behavior, and
verification evidence; it MUST NOT occur as an implicit compatibility change.

### V. Safe, Reviewable, Single-Scope Changes
Changes MUST preserve existing user modifications. Development MUST NOT execute
`reset`, `clean`, `commit`, automatic merge, or equivalent destructive or repository-
rewriting operations unless the user explicitly requests them. Work MUST remain
reviewable and uncommitted unless otherwise requested. A change MUST NOT introduce
unrelated refactoring or expand its scope merely because adjacent improvements are
visible; those improvements MUST be recorded as separate follow-up requirements.

## User Story Decomposition

Every specification MUST contain one or more user stories, each with a distinct actor,
user-visible outcome, and independently testable acceptance criteria. Stories MUST be
small enough to implement and verify without depending on uncommitted work from another
story. Dependencies, sequencing, and explicit exclusions MUST be recorded in the
Spec-Kit artifacts rather than inferred during implementation.

## Quality Gates and Tooling

- The project is a Node.js/TypeScript CommonJS CLI tool managed with pnpm.
- Supported runtime is Node.js >= 14.18; build and test commands MUST be validated on
  Node.js 18 or newer.
- CodeBuddy development MUST use the Spec-Kit slash commands under
  `.codebuddy/commands/`, including `/speckit.specify`, `/speckit.clarify`,
  `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`, and
  `/speckit.converge` as applicable.
- Before a change is considered complete, the workflow MUST run a TypeScript check,
  tests targeted to the changed behavior, and the complete test suite. Failures MUST be
  fixed or reported explicitly; they MUST NOT be hidden by weakening checks.
- The standard workflow is: specify, clarify, plan, tasks, implement, then converge.
  Each stage MUST use the current requirement's artifacts and MUST NOT silently advance
  an unrelated requirement.
- Existing Sovei workflows MAY provide project context, but unfinished Workflow v3
  behavior MUST NOT be assumed, auto-called, or used to bypass Spec-Kit gates.

## Documentation Language and Artifact Conventions

All Spec-Kit-generated project artifacts MUST use Simplified Chinese by default, including
specifications, clarification records, implementation plans, research, data models,
contracts, quickstarts, task lists, checklists, and convergence reports. User-facing
explanations in those artifacts MUST be understandable to Chinese-speaking stakeholders.

Code identifiers, file paths, shell commands, CLI command names, serialized field names,
protocol tokens, test names, and established technical terms MAY remain in their original
English form when changing them would reduce accuracy or break a contract. Such terms
MUST be explained in Chinese when their meaning is not obvious. Existing artifacts are
not retroactively translated by this rule; any newly created or materially updated
Spec-Kit artifact MUST follow it.

## Governance

This constitution governs Spec-Kit development in this repository and supersedes
informal workflow assumptions. Every pull request or equivalent review MUST verify
compliance with the applicable principles and quality gates. Exceptions MUST be
recorded in the relevant specification with their rationale, affected safeguards, and
an explicit recovery or follow-up plan.

Amendments MUST update this file before work that depends on the changed rule begins.
An amendment MUST include a Sync Impact Report, preserve applicable existing
constraints, and update the version and last-amended date. Versioning follows semantic
versioning: MAJOR for backward-incompatible governance or principle removal/redefinition,
MINOR for a new principle/section or materially expanded guidance, and PATCH for
clarifications, wording, or non-semantic corrections. The ratification date remains the
original adoption date; the last-amended date changes whenever governance content
changes.

Compliance MUST be reviewed at specification, implementation, and convergence points.
The reviewer MUST confirm that the work used specify and clarify, remains within the
single stated scope, has test-first evidence, passes all required quality gates, and
does not perform an implicit EventStore/YAML migration.

**Version**: 1.2.0 | **Ratified**: 2026-08-17 | **Last Amended**: 2026-08-18
