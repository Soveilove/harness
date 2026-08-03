# Decision Log: Monorepo Onboarding Scan

## D-001: Support package-based monorepos during existing-project onboarding

- Status: accepted
- Decision: `sovei project onboard` must inspect package manifests below the repository root when the root itself has no usable manifest. The first target is the established `packages/*` layout used by this repository.
- Rationale: the current self-scan sees the `packages/` directory but reports an empty tech stack and no entry points because detection only reads root-level `package.json` and `tsconfig.json`.
- Alternatives rejected:
  - Require every monorepo to add a synthetic root manifest. This changes the target project to satisfy the scanner.
  - Configure package paths manually before the first scan. Initial onboarding must work before project-specific configuration exists.

## D-002: Preserve root metadata and aggregate workspace evidence conservatively

- Status: accepted
- Decision: root manifest metadata remains authoritative for the project name and description when present. Workspace manifests supplement stack, entry-point, and package evidence; conflicting framework or tool values are represented without silently choosing an arbitrary package.
- Rationale: a monorepo may contain several applications or packages. A single child package must not masquerade as the whole repository.
- Alternatives rejected:
  - Treat the first discovered package as the project root. Filesystem ordering is not business authority.
  - Replace the existing single-value stack model in this Feature. That would expand the configuration contract and migration surface unnecessarily.

## D-003: Keep onboarding knowledge provisional and rerunnable

- Status: accepted
- Decision: generated code-map, architecture, and stack-derived knowledge remain `candidate`; rerunning onboarding refreshes generated candidates but preserves reviewed entries. Scanning never promotes knowledge to `stable` and never activates candidate governance redlines.
- Rationale: this is required by repository governance and existing idempotency behavior.
- Alternatives rejected:
  - Auto-promote high-confidence detections. Confidence is not equivalent to reviewed project truth.

## D-004: Verify through isolated monorepo fixtures and self-scan evidence

- Status: accepted
- Decision: add automated coverage for a root without a manifest and a nested TypeScript package, plus regression coverage for ordinary single-package onboarding. Run build, type-check, and tests; then perform a non-destructive scanner check against this repository.
- Rationale: the failure is specifically about repository shape, so unit assertions alone are insufficient without a representative filesystem fixture.

## Unresolved Items

None that materially change this Feature. Broader workspace discovery (`apps/*`, package-manager workspace globs, nested workspaces) may be added when evidence requires it; the implementation should avoid blocking that extension.
