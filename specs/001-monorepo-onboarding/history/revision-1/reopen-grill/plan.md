# Implementation Plan: Monorepo-Aware Project Onboarding

## Design

Extend the existing scanner result instead of introducing a second onboarding path.

### Scanner contract

Add a structured `packages` collection to `ScanResult`. Each item contains:

- repository-relative package directory;
- optional package name;
- detected stack evidence;
- repository-relative, package-qualified entry points.

The collection is sorted by path. The existing top-level `techStack` and `entryPoints` remain available for current consumers and are augmented from all discovered packages.

### Discovery boundary

Use the already bounded `directoryMap` as the discovery index and accept manifests matching direct `packages/<name>/package.json`. This respects `--depth` and the scanner's ignored-directory rules. Parse each manifest and its adjacent `tsconfig.json` with the scanner's best-effort JSON behavior.

### Stack aggregation

Run the existing `detectTechStack` for root and each package. For each known stack field:

1. discard empty values;
2. de-duplicate exact values;
3. sort deterministically;
4. expose one value unchanged or multiple values joined by `, `.

This preserves the current `DetectedStack` shape while avoiding order-dependent loss.

### Entry points

Retain current root `main`, `module`, and conventional source entries. Add declared executable `bin` values and package declarations, qualified by package directory. De-duplicate and sort the aggregate output.

### CLI and generated knowledge

Print a `Discovered Packages` section before entry points. The existing code-map generator includes package paths and their entry points. Project name and description continue to come from the current declaration/root manifest logic; child packages do not replace them.

## Migration Strategy

- Additive in-memory result fields only; no persisted configuration migration.
- Existing single-package behavior remains the compatibility baseline.
- Existing generated candidate entries refresh under their deterministic IDs.
- No rewrite of reviewed knowledge and no automatic redline activation.

## Implementation Sequence

1. Add isolated scanner/CLI fixtures that reproduce the rootless monorepo failure and stack conflict behavior.
2. Implement package discovery, package entry-point extraction, deterministic stack aggregation, and code-map output.
3. Add CLI package reporting without changing persistence authority.
4. Run focused tests, build, type check, full tests, and read-only self-scan.

## Validation

- Assert rootless `packages/tool` produces TypeScript evidence and qualified `bin`/`main` entries.
- Assert conflicting package frameworks produce a stable multi-value representation independent of directory enumeration.
- Assert code-map output includes a `Packages` section.
- Retain the existing idempotency test for stable reviewed knowledge.
- Run all repository-prescribed commands.

## Rollback

Because the result contract is additive and there is no persisted schema migration, rollback is limited to removing package aggregation and CLI display. Existing project declarations and reviewed knowledge remain valid.
