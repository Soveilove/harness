# Change Manifest: Monorepo-Aware Project Onboarding

## TASK-001: Scanner package discovery

- Status: completed
- Files:
  - `packages/sovei-core/src/config/scanner.ts`
  - `packages/sovei-core/test/scanner.test.mjs`
- Behavior:
  - adds sorted `packages` evidence to `ScanResult`;
  - discovers valid direct `packages/*/package.json` manifests within scan depth;
  - combines root and package stack evidence deterministically;
  - qualifies package `main`, `module`, `bin`, and conventional source entries;
  - records packages and package entry points in generated candidate code-map knowledge;
  - skips malformed child manifests without aborting valid discovery.
- Validation:
  - `pnpm --dir packages/sovei-core run build`: passed
  - `node --test packages/sovei-core/test/scanner.test.mjs`: 3 passed, 0 failed
- Discovery during validation: `MemoryStorage` does not treat `.` as its root, unlike the production filesystem backend. Tests use isolated `FilesystemStorage` fixtures so this Feature does not expand into unrelated storage behavior.

## Remaining Work

None.

## TASK-002: CLI reporting and compatibility verification

- Status: completed
- Files:
  - `packages/sovei-core/src/cli/commands/project.ts`
  - `packages/sovei-core/test/project.test.mjs`
  - `specs/001-monorepo-onboarding/change-manifest.md`
- Behavior:
  - prints discovered package paths, names, and package-qualified entry points during `project onboard`;
  - retains root manifest identity while nested packages supplement stack and code-map evidence;
  - retains candidate lifecycle behavior for generated knowledge.
- Validation:
  - focused scanner and project tests: 7 passed, 0 failed;
  - `pnpm --dir packages/sovei-core run check`: passed;
  - `pnpm --dir packages/sovei-core test`: 32 passed, 0 failed;
  - read-only self-scan found `packages/sovei-core`, TypeScript, `packages/sovei-core/dist/cli/index.js`, and `packages/sovei-core/src/index.ts`.

## Unrelated Existing Changes Preserved

- Candidate redline scanning and governance command edits already present in the worktree were not reverted or redesigned.
