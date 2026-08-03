# Feature Specification: Monorepo-Aware Project Onboarding

## Problem

When Sovei onboards an existing repository, it currently derives technology and entry-point information only from root-level manifests. A repository such as Sovei itself can keep its executable package under `packages/` and have no root `package.json`; onboarding then generates an empty technology section and no package entry points even though the scan can see the package files.

## User-Visible Behavior

Running `sovei project onboard` on a package-based monorepo must:

1. discover package manifests within the scanned package layout;
2. report the detected packages separately from repository-level entry points;
3. derive useful technology evidence from those packages when root evidence is absent;
4. generate a code map that identifies package paths and package entry points;
5. retain root project identity when a root manifest or existing project declaration supplies it;
6. keep every generated knowledge item at candidate lifecycle until reviewed.

Running the same command on an ordinary single-package repository must preserve existing behavior.

## Acceptance Scenarios

### AC-1: Rootless package monorepo

Given a repository with no root `package.json`, and `packages/tool/package.json` plus `packages/tool/tsconfig.json`, when onboarding runs, then:

- the scan reports `packages/tool` as a discovered package;
- TypeScript and package dependencies contribute to the detected stack;
- entry points declared by the package are qualified with their package path;
- generated code-map knowledge contains the discovered package and qualified entry point.

### AC-2: Root manifest remains authoritative

Given a repository with a root package manifest and one or more package manifests, when onboarding runs, then root name and description remain the repository identity while child packages supplement scan evidence.

### AC-3: Conflicting package technologies are not silently misrepresented

Given packages that produce different values for the same stack field, when onboarding runs, then the output preserves all distinct detected values in a deterministic representation rather than selecting whichever package was scanned first.

### AC-4: Single-package regression

Given an existing single-package Vue repository, when onboarding runs, then Vue detection, generated candidate knowledge, and idempotent refresh behavior remain intact.

### AC-5: Knowledge governance

Given generated stack, code-map, architecture, or redline findings, when onboarding persists them, then they are candidates only. Existing reviewed knowledge is preserved and no governance redline becomes active without explicit review/import.

### AC-6: Determinism and scan boundary

Given the same repository state and scan depth, repeated scans return discovered packages, stack values, and entry points in stable order. Ignored directories such as `node_modules`, build output, and VCS metadata do not contribute evidence.

## Boundaries

- The initial supported implicit monorepo convention is a `packages/*` directory visible within the configured scan depth.
- Existing root-level configuration and knowledge schemas remain compatible.
- Package discovery is read-only; onboarding does not modify package manifests.

## Explicit Exclusions

- Resolving arbitrary package-manager workspace glob syntax.
- Building a dependency graph between packages.
- Changing the 12-stage workflow or adding a new onboarding stage.
- Automatically promoting detected knowledge or activating business redlines.
- Refactoring the separate governance redline scanner work already present in the worktree.

## Success Evidence

- Focused automated fixtures cover rootless monorepo, conflicting stack values, and single-package regression.
- `pnpm --dir packages/sovei-core run build`, `check`, and `test` pass.
- A self-scan of this repository reports the `packages/sovei-core` package, TypeScript, and its CLI entry without writing to project knowledge.
