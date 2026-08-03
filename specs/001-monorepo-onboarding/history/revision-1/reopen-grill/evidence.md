# Verification Evidence: Monorepo-Aware Project Onboarding

## Requirement Compliance

### Focused filesystem and CLI fixtures

- Command: `pnpm --dir packages/sovei-core run build; node --test packages/sovei-core/test/scanner.test.mjs packages/sovei-core/test/project.test.mjs`
- Result: passed, 7 tests, 0 failures.
- Evidence location: `packages/sovei-core/test/scanner.test.mjs`, `packages/sovei-core/test/project.test.mjs`.
- Covers: AC-1 through AC-6, including real temporary filesystem layout, CLI subprocess behavior, root identity, deterministic conflicts, malformed manifests, candidate lifecycle, and idempotency.

### Real self-scan journey

- Command: instantiate built `ProjectScanner` with `FilesystemStorage(process.cwd())` and call `scan(4)` without invoking persistence.
- Result: passed.
- Observed package: `packages/sovei-core` named `@soveilove/sovei`.
- Observed stack: `language: TypeScript`.
- Observed entries: `packages/sovei-core/dist/cli/index.js`, `packages/sovei-core/src/index.ts`.
- Write behavior: none; the read-only scanner was used instead of `project onboard` so current project knowledge was not rewritten.

## Engineering Quality

- Command: `pnpm --dir packages/sovei-core run check`
- Result: passed (`tsc --noEmit`).
- Command: `pnpm --dir packages/sovei-core test`
- Result: passed, 32 tests, 0 failures; command included a clean TypeScript build.
- Determinism: repeated scan fixture returns equal package and stack evidence.
- Compatibility: pre-existing project initialization, onboarding idempotency, workflow, knowledge, architecture, governance, Wayfinder, and workspace tests all pass.

## Limitations

- Implicit discovery is intentionally limited to direct `packages/*` manifests visible at the configured depth.
- The current single-value `DetectedStack` schema represents multiple distinct values as a stable comma-separated string.
- No performance benchmark was run for very large monorepos; that was outside the Feature contract.
- Existing uncommitted redline-scanner and governance edits participated in build/tests but are not claimed as work delivered by this Feature.

## Verdict

PASS. Requirement compliance and engineering quality both meet the accepted Feature contract.
