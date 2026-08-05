# Sovei

Sovei is a portable TypeScript workflow engine for development SOPs, typed project
knowledge, decision maps, material change control, and evolutionary architecture
governance.

## Install

```bash
npm install -g @soveilove/sovei
sovei --version
sovei --help
```

## Quick Start

### New project

```bash
sovei project init ./my-app --framework vue --language typescript
```

This creates the directory structure, seeds knowledge by tech stack, and writes
an `AGENTS.md` so any AI agent (Codex, Claude Code, Cursor, etc.) discovers Sovei
automatically.

### Existing project (onboard)

For a codebase that already has code but no Sovei:

```bash
cd your-existing-project
sovei project init . --force
sovei project onboard --evidence-only
```

The `--evidence-only` flag collects evidence (directory structure, import graph,
regex hits) and prints an **AGENT ONBOARDING GUIDE**. Copy the entire guide
output and paste it to your AI agent. The agent will:

1. Read the evidence files and verify capabilities against real source code
2. Identify business redlines by reading the code
3. Write findings via Sovei CLI commands
4. Generate `harness/project/onboard-report.md` for human review

After the agent finishes and a human reviews the candidates:

```bash
sovei governance redline list
sovei knowledge list --lifecycle candidate
cat harness/project/onboard-report.md
```

Only after review, start feature development:

```bash
sovei workflow bootstrap 001-first-feature
```

### Feature development workflow

Each call executes one stage:

```text
load -> grill -> wayfind -> spec -> scope -> plan -> tasks -> implement
-> converge -> verify -> learn -> sync
```

```bash
# Bootstrap a new feature
sovei workflow bootstrap 001-my-feature

# Get the stage prompt + context pack for your AI agent
sovei context build --stage grill 001-my-feature

# Prepare a stage (creates artifact templates)
sovei workflow grill 001-my-feature

# Complete a stage and advance
sovei workflow grill 001-my-feature --complete
```

### Reconciliation and confirmation

The spec stage produces `reconciliation.md` alongside `spec.md`. This document
aligns PM intent with technical reality by restoring prior feature context.

Render separate review files for tech and product:

```bash
sovei governance review-pack generate 001-my-feature
# Produces specs/001-my-feature/tech-review.md and product-review.md
```

After PM signs the product-review, import the confirmation:

```bash
sovei governance review-pack import 001-my-feature
  --product specs/001-my-feature/product-review.md
  --by "Zhang San" --reference "PRD-001"
```

Tech lead confirms separately:
```bash
sovei workflow confirm 001-my-feature --stage spec --role tech
  --by "Li Si" --reference "JIRA-123"
```

Confirmation gates auto-block after spec (S2/S3 risk) and verify (all risks).
Override with audit trail:
```bash
sovei workflow override-confirm 001-my-feature --stage verify --role product
  --by "Wang Wu" --reason "Emergency hotfix, retroactive review scheduled"
```

### Cross-feature context

When working on a new feature, include other features decision logs so the
agent can understand what prior features did:

```bash
sovei context build --stage spec 002-next-feature --cross-feature
```

## Key Commands

| Command | Purpose |
|---|---|
| `sovei project init <path>` | Initialize new project |
| `sovei project onboard` | Scan existing project and bootstrap knowledge |
| `sovei project onboard --evidence-only` | Collect evidence + print agent guide |
| `sovei project status` | Show project state |
| `sovei project map` | Show business topology |
| `sovei workflow bootstrap <feature>` | Start a new feature |
| `sovei workflow <stage> <feature>` | Prepare a stage |
| `sovei workflow <stage> <feature> --complete` | Complete and advance |
| `sovei workflow confirm <feature> --stage --role --by --reference` | Confirm a gate |
| `sovei workflow override-confirm <feature> --stage --role --by --reason` | Override a gate |
| `sovei context build --stage <stage> <feature>` | Get context pack for agent |
| `sovei context build --stage spec <feature> --cross-feature` | Include other features |
| `sovei governance redline add/list/update/deactivate` | Manage business redlines |
| `sovei governance review-pack generate/import` | Reconciliation review files |
| `sovei knowledge add/list/promote` | Manage project knowledge |
| `sovei rules adapt` | Adapt existing Agent/IDE rules as candidates |
| `sovei architecture scan/status/check` | Evolutionary architecture governance |

## Architecture

- **Shell/material separation**: `packages/sovei-core/` is the shell (persists
  across projects), `harness/project/` is the material (cleared on switch).
- **State machine**: pure reducer + event sourcing. All state changes through
  EventStore append + replay.
- **Knowledge lifecycle**: candidate -> pending -> stable. Single observations
  never bypass to stable.
- **Confirmation gates**: auto-block based on risk level, not a 13th stage.
- **Three-layer agent model**: scripts collect evidence, agents make judgments,
  humans make decisions.

## Version

Current stable: `2.2.0` on npm `latest` tag.

Repository: https://github.com/Soveilove/sovei