---
name: "sovei-workflow"
description: "Execute, resume, or reopen one file-backed Sovei Feature stage in Trae. Use only when the user explicitly asks to use sovei-workflow or run a named Sovei stage."
---

# Sovei Workflow Adapter

Read `.agents/skills/sovei-workflow/SKILL.md` completely and treat it as the authoritative workflow contract.

- Execute exactly one requested stage or one `reopen` control action.
- Use Git Bash/POSIX-compatible terminal commands in Trae.
- Resolve stage Skills from `.specify/workflows/sovei/skill-map.yaml` in product projects or `harness/workflows/sovei/skill-map.yaml` in the central repository.
- Report actual, candidate, and alternative third-party Skills separately.
- Stop after reporting the exact next natural-language invocation. Never chain stages.

