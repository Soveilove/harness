# Learning Report: Monorepo-Aware Project Onboarding

## Observation L-001

- Source Feature: `001-monorepo-onboarding`
- Scope: project onboarding scanner
- Observation: a root directory tree can prove a monorepo exists while root-only manifest detection still produces empty technology and entry-point knowledge. Package-level evidence is required for a useful first scan.
- Evidence: rootless filesystem fixture and read-only self-scan of `E:\memory`, both verified in `evidence.md`.
- Classification: candidate
- Proposed destination: `harness/project/knowledge/pitfall.json` as a candidate titled `Root-only onboarding misses package manifests`.
- Proposed content: `When onboarding a package-based monorepo, do not rely solely on root package.json or tsconfig.json. Discover bounded package manifests and aggregate evidence deterministically while keeping root project identity authoritative.`
- Promotion status: do not promote. This Feature supplies one verified repository shape, not independent repeated project evidence.

## Observation L-002

- Source Feature: `001-monorepo-onboarding`
- Scope: scan result compatibility
- Observation: aggregating conflicting package stack values into a deterministic representation is safer than retaining the first traversed package value.
- Evidence: repeated React/Vue fixture yielded the same `React, Vue` value.
- Classification: candidate
- Proposed destination: none until multi-framework real-project onboarding requires a shared rule.
- Promotion status: rejected for stable knowledge at this time; the representation is an implementation compatibility choice, not a universal architecture rule.

## Rejected Pattern

- Do not auto-promote package detections, code maps, or candidate redlines based solely on scanner confidence. Automated discovery is evidence collection, not semantic review.

## Architecture Debt

No new debt entry proposed. `scanner.ts` responsibility grew, but no second pressure signal was measured and this Feature added local helpers rather than a new subsystem.
