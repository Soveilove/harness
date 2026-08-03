# Sovei

Sovei is a portable TypeScript workflow engine for development SOPs, typed
project knowledge, decision mapping, material change control, and evolutionary
architecture governance.

This package is currently published on the `next` channel for Sovei 2.1 field
testing. It is not yet a stable release.

## Install

```bash
pnpm add --global @soveilove/sovei@next
sovei --version
sovei --help
```

## Workflow

Each invocation executes one stage:

```text
load -> grill -> wayfind -> spec -> scope -> plan -> tasks -> implement
-> converge -> verify -> learn -> sync
```

Project data stays in `harness/project/` and Feature artifacts stay in
`specs/`. Installing or upgrading the CLI must not silently rewrite either.

Source and development documentation:
https://github.com/Soveilove/harness
