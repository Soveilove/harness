---
name: "sovei-workflow"
description: "Execute, resume, or reopen one file-backed Sovei Feature stage in CodeBuddy. Use only when the user explicitly selects a SOVEI command or asks to run a named Sovei stage."
---

# Sovei Workflow Adapter

Read `.agents/skills/sovei-workflow/SKILL.md` completely and treat it as the authoritative workflow contract.

- Execute exactly one requested stage or one `reopen` control action.
- Resolve stage Skills from `.specify/workflows/sovei/skill-map.yaml` in product projects or `harness/workflows/sovei/skill-map.yaml` in the central repository.
- Report actual, candidate, and alternative third-party Skills separately.
- Stop after reporting the exact next command. Never chain stages.

