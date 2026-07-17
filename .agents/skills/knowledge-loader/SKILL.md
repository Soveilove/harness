---
name: "knowledge-loader"
description: "Loads project Memory, Code Map, and multi-workspace sync guidance. Invoke when starting tasks, switching work folders, or user says Memory/Code Map."
---

# Knowledge Loader

Use this skill to load the project's shared knowledge before working on requirements, bugs, architecture discussions, or cross-folder tasks.

## When To Invoke

Invoke this skill when:

- Starting a task in this repository.
- User says "按 Memory + Code Map", "读取 Memory", "读取 Code Map", "不走 Speckit", or "小需求".
- User switches to another independent work folder.
- User says Code Map was copied from another folder.
- Task involves current feature, homepage refactor, free canvas, board detail, local edit, or cross-branch work.
- You need to update Memory, Code Map, rules, or skills.

## Load Order

1. Read `.specify/memory/MEMORY.md`.
2. Read `.specify/memory/constitution.md` for non-negotiable project principles.
3. Read task-specific Memory:
   - Development task: `.specify/memory/user-preferences.md`
   - Architecture discussion: `.specify/memory/project-architecture.md`
   - Bug fix: `.specify/memory/vue-pitfalls.md`
   - Technical decision: `.specify/memory/design-decisions.md`
4. Read `.specify/feature.json` to identify the active Speckit feature, if any.
5. If the task involves current feature, homepage refactor, free canvas, board, local edit, or cross-folder sync, read `.codegraph/recent-work-code-map.md`.
6. If the task involves multiple independent work folders, IDE rules, skills, or sync policy, read `requirements-analysis/MULTI_WORKSPACE_KNOWLEDGE_SYNC.md`.

## Non-Speckit Tasks

For small tasks that do not use Speckit:

- Do not rely only on `.specify/feature.json`.
- Use task keywords and user wording to choose Memory and Code Map sections.
- If the user says "按 Memory + Code Map", always read both Memory index and Code Map first.

## Multi-Workspace Rules

- `.specify/memory/` is the shared stable knowledge source.
- `.codegraph/recent-work-code-map.md` is the shared recent navigation map.
- Use the Code Map version at the top of the current work folder's file as the local truth.
- Do not copy `.codegraph/*.db`, `.db-wal`, `.db-shm`, `cache/`, logs, pid files, or socket files.
- When sync rules change, update `requirements-analysis/MULTI_WORKSPACE_KNOWLEDGE_SYNC.md` and the relevant IDE rules/skills.

## Knowledge Update Targets

| Knowledge type | File |
|---|---|
| User preference | `.specify/memory/user-preferences.md` |
| Pitfall or fix lesson | `.specify/memory/vue-pitfalls.md` |
| Project structure or module context | `.specify/memory/project-architecture.md` |
| Technical decision | `.specify/memory/design-decisions.md` |
| Current task entrypoints or data flow | `.codegraph/recent-work-code-map.md` |
| Multi-folder / multi-IDE sync flow | `requirements-analysis/MULTI_WORKSPACE_KNOWLEDGE_SYNC.md` |

## Output Behavior

After loading knowledge, briefly mention which knowledge sources were used and continue with the user's task. Do not produce a long summary unless the user asks for one.
