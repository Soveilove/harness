# Tasks: Monorepo-Aware Project Onboarding

- [x] TASK-001: Add deterministic monorepo package discovery to the scanner

  - Dependencies: none
  - Files: `src/config/scanner.ts`, focused scanner test
  - Contract: expose sorted package evidence, aggregate stack values, qualify package entry points, and include packages in generated code-map knowledge without changing root-only behavior.
  - Acceptance: AC-1, AC-3, AC-6 pass in isolated fixtures; malformed or absent child manifests do not abort scanning.
  - Validation: build and focused scanner tests.

- [x] TASK-002: Integrate package evidence into onboarding output and verify compatibility

  - Dependencies: TASK-001
  - Files: `src/cli/commands/project.ts`, `test/project.test.mjs`, Feature change manifest
  - Contract: print discovered packages, preserve root project identity and candidate lifecycle/idempotency behavior, and prove the repository can scan its own nested core package.
  - Acceptance: AC-2, AC-4, AC-5 and package visibility pass; unrelated redline-scanner work remains intact.
  - Validation: focused project tests, build, type check, full test suite, and read-only self-scan.

## Deferred

- Arbitrary workspace-glob parsing, package dependency graphs, and persisted multi-stack schema changes remain explicitly out of scope.
