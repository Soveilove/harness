# Scope: Monorepo-Aware Project Onboarding

## Entry And Data Flow

1. `project onboard --depth <n>` resolves the configured workspace root and calls `ProjectScanner.scan(maxDepth)`.
2. `ProjectScanner` reads root manifests, scans the bounded directory tree, detects package manifests, stack evidence, repository and package entry points, and structural patterns.
3. The command prints detection results, merges detected stack fields into the existing project declaration, and persists generated candidate knowledge through `KnowledgeStore`.
4. Repeated onboarding updates only generated candidates; reviewed entries are preserved.

There is no UI, API, authentication, billing, network callback, or background async lifecycle in this path. Filesystem read failures are treated as absent evidence; persistence errors remain command failures.

## In Scope

- `packages/sovei-core/src/config/scanner.ts`
  - discover direct packages under `packages/` within the existing depth boundary;
  - parse package manifests and adjacent TypeScript configuration;
  - expose deterministic package evidence in `ScanResult`;
  - merge detected stack values without order-dependent loss;
  - qualify package-declared entry points.
- `packages/sovei-core/src/cli/commands/project.ts`
  - display discovered packages during onboarding while preserving current root identity and persistence behavior.
- Focused automated tests under `packages/sovei-core/test/`.

## Compatibility Paths

- Root-only single-package repositories continue using root manifests.
- Repositories with both root and child manifests retain root project identity and supplement detection from packages.
- Repositories with no manifests still complete with empty package and stack evidence.
- Existing redline candidate scanning remains connected to the same directory map but is not redesigned here.

## Recovery And Failure Behavior

- Malformed child manifests are ignored as unusable evidence and do not abort the entire scan, matching current best-effort root parsing.
- Missing `packages/`, missing package `tsconfig.json`, and unreadable optional files yield no evidence for those files.
- Writes occur only in the existing onboarding persistence phase; scanner discovery itself remains read-only.

## Architecture Pressure

- No saved architecture snapshot is available (`architecture status` reports that a scan is required).
- `scanner.ts` already owns bounded structure discovery, stack detection, entry points, generated knowledge, and the separately added redline scan. This is a responsibility-pressure signal, but there is no second measured signal such as churn, coupling, or complexity evidence. Per governance, this does not justify a refactor requirement.
- The implementation may add small local helpers to keep aggregation testable; no cross-module redesign is in scope.

## Out Of Scope

- General workspace glob parsing and package dependency graphs.
- Changes to workflow stages, state reducers, EventStore, DI, architecture governance, or knowledge lifecycle rules.
- Promotion/import behavior for candidate redlines.
- Rewriting existing generated project knowledge created by the earlier self-scan.

## Verification Surfaces

- Scanner fixture assertions for discovered packages, deterministic stack aggregation, and qualified entry points.
- CLI fixture assertion that onboarding output and persisted code map contain nested package evidence.
- Existing project onboarding idempotency test.
- Build, type check, full test suite, and read-only self-scan of `E:\memory`.
