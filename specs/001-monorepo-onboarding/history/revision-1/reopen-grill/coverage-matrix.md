# Coverage Matrix: Monorepo-Aware Project Onboarding

| Requirement | Entry | State / I/O | Compatibility / Recovery | Evidence |
| --- | --- | --- | --- | --- |
| AC-1 rootless monorepo | `project onboard` / `ProjectScanner.scan` | Reads `packages/*/package.json` and adjacent config; returns package evidence | No root manifest required | Isolated filesystem fixture and CLI output assertion |
| AC-2 root authority | onboarding config merge | Existing declaration and root manifest retain project identity | Child packages only supplement detection | CLI fixture with root and child manifests |
| AC-3 conflicts | stack aggregation helper | Distinct values merged in stable order | No first-package-wins behavior | Scanner fixture with conflicting package frameworks |
| AC-4 single package | existing root scan | Existing detected stack and knowledge persistence | Current Vue/idempotency path retained | Existing onboarding test plus regression assertion |
| AC-5 candidate lifecycle | `KnowledgeStore` persistence | Generated entries remain candidate; reviewed entries preserved | No auto-promotion or active redline write | Existing idempotency test and persisted fixture inspection |
| AC-6 deterministic boundary | bounded directory scan | Stable path/value ordering; ignored directories excluded | Missing/malformed optional child manifests are skipped | Repeat-scan equality assertion |
| Package visibility | CLI onboarding output and code map | Package path, name, and qualified entry point | Empty list when no packages exist | CLI fixture and read-only self-scan |

## Required Coverage Applicability

| Surface | Status | Reason |
| --- | --- | --- |
| Entry / route | covered | CLI command is the entry |
| UI state | not applicable | No UI |
| Store / service | covered | Scanner and KnowledgeStore path traced |
| Parameters | covered | `--depth` remains the scan boundary |
| API | not applicable | No network API |
| Auth / billing | not applicable | Read-only local discovery |
| Async callback | not applicable | Awaited filesystem operations only |
| Success / failure / cleanup | covered | Best-effort optional reads; command failure on persistence errors; fixture cleanup |
| History / detail / retry | covered | Rerun is idempotent for generated candidates |
| Compatibility entries | covered | Root-only, root-plus-packages, and no-manifest cases |
| Test / docs / runtime | covered | Focused fixtures, full validation, self-scan evidence |

All claims are backed by current source inspection except performance at very large repository scale, which is a candidate concern outside this Feature.
