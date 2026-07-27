<!--
Sync Impact Report:
- Version change: N/A → 1.0.0 (initial constitution)
- New constitution created from template
- Principles derived from CLAUDE.md and project conventions
- Templates requiring updates: ✅ All templates reviewed, aligned with principles
- Follow-up TODOs: None
-->

# Pino Front Constitution

## Core Principles

### I. Explicit Over Implicit

Code MUST be self-explanatory without requiring mental execution of branches to understand behavior. Naming and structure MUST communicate intent directly.

**Rationale**: Readability and maintainability suffer when developers must trace multiple conditionals to understand a single code path. Explicit code reduces onboarding time and bug surface area.

**How to apply**: Avoid cryptic abbreviations, avoid deeply nested conditionals, prefer named constants over magic values, make business rules visible in code rather than hidden in framework magic.

### II. Extensibility via Modules

When adding behavior that varies by type/module/scenario, use registry or strategy patterns. Do NOT extend conditional chains in existing code.

**Rationale**: Conditionals grow entropy over time. Module registration keeps each variant isolated, testable, and independently evolvable.

**How to apply**: Create a new module file and register it. The calling code resolves the implementation via a registry lookup. New capabilities are added by registration, not by modifying dispatch logic.

### III. Clear Architectural Boundaries

UI components MUST only handle display and interaction orchestration. Business logic MUST live in composables or services. Side effects (requests, storage, events) MUST be encapsulated in service layers.

**Rationale**: Mixing concerns creates tight coupling, making components hard to test, reuse, and reason about. Clear boundaries enable independent evolution of UI and business logic.

**How to apply**: Components receive props and emit events. Composables orchestrate state and reactive logic. Services handle I/O, API calls, and external integrations.

### IV. Stable API Surface

External exports MUST be accessed through stable entry points (`index.ts`, `service.ts`). Internal implementations may evolve freely.

**Rationale**: Stable public APIs protect consumers from breaking changes while allowing internal refactoring. This enables continuous improvement without coordinated upgrades.

**How to apply**: Re-export public interfaces from barrel files. Mark internal helpers as private or place in `_internal` paths. Version breaking changes to public APIs explicitly.

### V. Type Safety at Boundaries

TypeScript types MUST be defined for all inputs and outputs. Untrusted data MUST be validated at system boundaries (API responses, user input, storage). `any` is prohibited except when interfacing with untyped third-party code.

**Rationale**: Type safety catches errors at compile time. Boundary validation prevents invalid data from propagating into the application core where it causes subtle bugs.

**How to apply**: Define types in `types.ts`. Validate external data in service layers before it reaches components. Use Zod or similar for runtime validation when needed.


<!-- PROJECT-SPECIFIC: 以下 Vue 开发标准为 pino-front 专属，换项目时替换为对应框架标准。见 project.yaml -->
## Vue Development Standards

### VI. Composition API with TypeScript

All Vue components MUST use `<script setup lang="ts">`. Options API is prohibited unless explicitly required for legacy integration.

**Rationale**: Composition API provides better TypeScript integration, more flexible code organization, and improved code reuse through composables.

**How to apply**: Use `ref`, `computed`, `watch` from Vue. Extract reusable logic into composables. Keep components thin—state management belongs in Pinia stores or composables.

### VII. Predictable Async States

All asynchronous operations MUST explicitly handle loading, error, and empty states. UI MUST reflect these states clearly.

**Rationale**: Unhandled async states lead to confusing UX—stale data, frozen interfaces, silent failures. Explicit state handling makes the application predictable and debuggable.

**How to apply**: Use `AsyncState` patterns or explicit `isLoading`/`isError` refs. Show loading indicators during fetches. Display meaningful error messages. Handle empty data with appropriate UI.

## Code Quality

### VIII. Document Non-Obvious Decisions

Comments MUST explain "why" when the reasoning is not self-evident. Do NOT write comments that merely translate code into prose.

**Rationale**: Code should be self-documenting through clear naming. Comments add value only when they capture constraints, business rules, or trade-offs not visible in code.

**How to apply**: Comment on: business rules tied to product requirements, performance workarounds, browser compatibility hacks, resource lifecycle management (subscription cleanup), coordinate systems and units.

## Governance

This constitution supersedes informal practices and serves as the authoritative source for architectural decisions in Pino Front.

**Amendment Procedure**:
1. Propose changes via pull request to `.specify/memory/constitution.md`
2. Document rationale and impact on existing code
3. Obtain approval from at least one senior developer
4. Update dependent templates and documentation

**Compliance Review**: All code reviews MUST verify compliance with constitutional principles. Complexity that violates principles MUST be justified in writing with simpler alternatives considered and rejected.

**Runtime Guidance**: For day-to-day development patterns and examples, refer to `CLAUDE.md` which expands on these principles with concrete guidance.

**Version**: 1.0.0 | **Ratified**: 2026-05-12 | **Last Amended**: 2026-05-12
