/**
 * Sovei Workflow 2.0 - Stage Definitions
 * All 12 stages with typed contracts and lifecycle hooks.
 * Prompt contracts derived from the original stage-contracts.md.
 */

import { defineStage } from './define-stage.js';
import { stageRegistry } from './registry.js';

// ──────────────────────────────────────────────
// load - Initialize or resume a feature
// ──────────────────────────────────────────────
export const loadStage = defineStage({
  name: 'load',
  description: 'Validate state against files and load task-relevant knowledge',
  contract: {
    requiredArtifacts: [],
    producesArtifacts: [],
  },
  async preExecute(ctx) {
    await ctx.knowledge.loadByTaskType('general');
  },
  async execute(ctx) {
    return {
      stage: 'load',
      artifactsWritten: [],
      nextStage: 'grill',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# Stage: load

## Input
- Harness index, Memory index, workflow definition, Feature state, actual Artifact list.

## Action
Validate state against files and load only task-relevant knowledge.

## Output
Sources used, risk level, current/completed stages, blockers, next legal stage.

## Bootstrap
When the user explicitly supplies a Feature with no state, create only workflow-state.yaml;
record load completed and grill waiting.

## Stop
Ambiguous Feature, version mismatch, Artifact conflict, or missing state without explicit bootstrap scope.

## Writes
None for existing state; state file only for bootstrap.
`,
    };
  },
});

// ──────────────────────────────────────────────
// grill - Resolve business decisions one at a time
// ──────────────────────────────────────────────
export const grillStage = defineStage({
  name: 'grill',
  description: 'Resolve business decisions one question at a time',
  contract: {
    requiredArtifacts: [],
    producesArtifacts: ['decision-log.md'],
  },
  async preExecute(ctx) {
    if (!ctx.workflowState.completedStages.includes('load')) {
      return { block: true, reason: 'load stage not completed' };
    }
    await ctx.knowledge.loadByTaskType('decision-making');
  },
  async execute(ctx) {
    return {
      stage: 'grill',
      artifactsWritten: ['decision-log.md'],
      nextStage: 'spec',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# Stage: grill

## Input
Valid load result and current request.

## Action
Resolve facts from files first; ask one decision question at a time only for
choices that materially change scope.

## Output
decision-log.md with decision, rationale, alternatives rejected, status,
and unresolved items.

## Stop
Continue asking until scope-changing decisions are resolved; never implement.
`,
    };
  },
  async postExecute(ctx, result) {
    const artifact = await ctx.artifacts.read('decision-log.md');
    if (!artifact) throw new Error('decision-log.md not generated');
  },
});

// ──────────────────────────────────────────────
// wayfind - Map unknown decisions for large features
// ──────────────────────────────────────────────
export const wayfindStage = defineStage({
  name: 'wayfind',
  description: 'Map unknown decisions for large or high-uncertainty features',
  contract: {
    requiredArtifacts: ['decision-log.md'],
    producesArtifacts: ['wayfinder.md'],
  },
  async preExecute(ctx) {
    if (!ctx.workflowState.completedStages.includes('grill')) {
      return { block: true, reason: 'grill stage not completed' };
    }
  },
  async execute(ctx) {
    return {
      stage: 'wayfind',
      artifactsWritten: ['wayfinder.md'],
      nextStage: 'spec',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# Stage: wayfind

## Input
Accepted decisions and current Feature scope.

## Action
Determine Destination, then build a decision map.
Distinguish: current decision tickets, blocking relations, frontier,
unknown zone, and out of scope.
One session resolves one decision ticket; independent research can parallelize.

## Output
wayfinder.md with decision map.

## Stop
Goal is to eliminate pre-planning unknown decisions, not to implement.
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('wayfinder.md');
    if (!artifact) throw new Error('wayfinder.md not generated');
  },
});

// ──────────────────────────────────────────────
// spec - Define requirements and acceptance criteria
// ──────────────────────────────────────────────
export const specStage = defineStage({
  name: 'spec',
  description: 'Define problem, user-visible behavior, boundaries, acceptance scenarios',
  contract: {
    requiredArtifacts: ['decision-log.md'],
    producesArtifacts: ['spec.md'],
  },
  async preExecute(ctx) {
    await ctx.knowledge.loadByTaskType('specification');
  },
  async execute(ctx) {
    return {
      stage: 'spec',
      artifactsWritten: ['spec.md'],
      nextStage: 'scope',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# Stage: spec

## Input
Accepted decisions and relevant Business/Memory/Baseline evidence.

## Action
Define problem, user-visible behavior, boundaries, acceptance scenarios,
and explicit exclusions.

## Output
spec.md without volatile implementation paths.

## Stop
Any unresolved decision that changes user behavior or contract.
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('spec.md');
    if (!artifact) throw new Error('spec.md not generated');
  },
});

// ──────────────────────────────────────────────
// scope - Trace real impact surface
// ──────────────────────────────────────────────
export const scopeStage = defineStage({
  name: 'scope',
  description: 'Trace real entry, state, parameters, I/O, async lifecycle, consumers',
  contract: {
    requiredArtifacts: ['spec.md'],
    producesArtifacts: ['scope.md', 'coverage-matrix.md'],
  },
  async preExecute(ctx) {
    await ctx.knowledge.loadByTaskType('impact-analysis');
  },
  async execute(ctx) {
    return {
      stage: 'scope',
      artifactsWritten: ['scope.md', 'coverage-matrix.md'],
      nextStage: 'plan',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# Stage: scope

## Input
Valid Spec and current source tree.

## Action
Trace real entry, state, parameters, I/O, async lifecycle, consumers,
recovery paths, compatibility paths, and verification surfaces.

## Output
scope.md and coverage-matrix.md; mark unsupported claims as 'candidate'.

## Stop
Missing evidence for a required behavior or an unbounded impact surface.

## Required Coverage
Entry/route → UI state → store/service → params → API → auth/billing →
async callback → success/failure/cleanup → history/detail/retry →
compat entries → test/docs/runtime evidence.
`,
    };
  },
  async postExecute(ctx) {
    const scope = await ctx.artifacts.read('scope.md');
    const matrix = await ctx.artifacts.read('coverage-matrix.md');
    if (!scope) throw new Error('scope.md not generated');
    if (!matrix) throw new Error('coverage-matrix.md not generated');
  },
});

// ──────────────────────────────────────────────
// plan - Technical design
// ──────────────────────────────────────────────
export const planStage = defineStage({
  name: 'plan',
  description: 'Define module boundaries, state/data flow, contracts, migration strategy',
  contract: {
    requiredArtifacts: ['spec.md', 'scope.md', 'coverage-matrix.md'],
    producesArtifacts: ['plan.md'],
  },
  async preExecute(ctx) {
    await ctx.knowledge.loadByTaskType('planning');
  },
  async execute(ctx) {
    return {
      stage: 'plan',
      artifactsWritten: ['plan.md'],
      nextStage: 'tasks',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# Stage: plan

## Input
Valid Spec, Scope, Coverage Matrix, architecture rules, and decisions.

## Action
Define module boundaries, state/data flow, contracts, migration strategy,
and validation approach.

## Output
plan.md with no implementation edits.

## Stop
Return to scope when required coverage is missing; do not plan around unknowns.
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('plan.md');
    if (!artifact) throw new Error('plan.md not generated');
  },
});

// ──────────────────────────────────────────────
// tasks - Split into independently verifiable tasks
// ──────────────────────────────────────────────
export const tasksStage = defineStage({
  name: 'tasks',
  description: 'Split work into independently verifiable vertical tasks',
  contract: {
    requiredArtifacts: ['plan.md'],
    producesArtifacts: ['tasks.md'],
  },
  async execute(ctx) {
    return {
      stage: 'tasks',
      artifactsWritten: ['tasks.md'],
      nextStage: 'implement',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# Stage: tasks

## Input
Valid Plan, Scope, Coverage Matrix, decisions, and current code baseline.

## Action
Split work into independently verifiable vertical tasks small enough for
one fresh context. Declare dependencies, file/contract surface, acceptance
criteria, and validation for each task.

## Output
tasks.md; do not modify implementation files.

## Stop
Reopen plan or scope when a task depends on an unresolved contract or
unknown impact surface.
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('tasks.md');
    if (!artifact) throw new Error('tasks.md not generated');
  },
});

// ──────────────────────────────────────────────
// implement - Execute one ready task
// ──────────────────────────────────────────────
export const implementStage = defineStage({
  name: 'implement',
  description: 'Implement only the selected ready task, preserve unrelated changes',
  contract: {
    requiredArtifacts: ['tasks.md'],
    producesArtifacts: ['change-manifest.md'],
  },
  async preExecute(ctx) {
    await ctx.knowledge.loadByTaskType('implementation');
  },
  async execute(ctx) {
    return {
      stage: 'implement',
      artifactsWritten: ['change-manifest.md'],
      nextStage: 'converge',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# Stage: implement

## Input
One ready task, Spec, Scope, Plan, rules, and the current baseline.

## Action
Implement only the selected ready task, preserve unrelated changes,
and run focused validation proportional to risk.

## Output
Product/tooling changes plus change-manifest.md recording task, files,
behavior, tests, and remaining work.

## Completion
Stay in implement while ready tasks remain. Add implement to completed
stages only after every required task is done or explicitly deferred.

## Stop
Reopen the earliest invalid stage when implementation reveals a new decision,
scope, or design constraint. Never silently expand the task.
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('change-manifest.md');
    if (!artifact) throw new Error('change-manifest.md not generated');
  },
});

// ──────────────────────────────────────────────
// converge - Check implementation against contracts
// ──────────────────────────────────────────────
export const convergeStage = defineStage({
  name: 'converge',
  description: 'Classify gaps as missing, partial, contradicts, or unrequested',
  contract: {
    requiredArtifacts: ['change-manifest.md'],
    producesArtifacts: ['convergence-report.md'],
  },
  async execute(ctx) {
    return {
      stage: 'converge',
      artifactsWritten: ['convergence-report.md'],
      nextStage: 'verify',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# Stage: converge

## Input
Spec, Scope, Plan, Tasks, Coverage Matrix, Change Manifest, baseline,
and current implementation.

## Action
Classify each gap as 'missing', 'partial', 'contradicts', or 'unrequested'.
Append corrective tasks instead of rewriting history.

## Output
convergence-report.md with evidence and disposition for every finding.

## Stop
Return to tasks for implementation gaps or reopen an earlier stage for
contract gaps. Do not claim completion with open high-severity findings.
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('convergence-report.md');
    if (!artifact) throw new Error('convergence-report.md not generated');
  },
});

// ──────────────────────────────────────────────
// verify - Acceptance verification
// ──────────────────────────────────────────────
export const verifyStage = defineStage({
  name: 'verify',
  description: 'Verify requirement compliance and engineering quality separately',
  contract: {
    requiredArtifacts: ['convergence-report.md'],
    producesArtifacts: ['evidence.md'],
  },
  async execute(ctx) {
    return {
      stage: 'verify',
      artifactsWritten: ['evidence.md'],
      nextStage: 'learn',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# Stage: verify

## Input
Acceptance scenarios, Coverage Matrix, implementation, convergence result,
and environment capabilities.

## Action
Verify requirement compliance and engineering quality separately using
focused tests plus real journey, request/log, or visual evidence when applicable.

## Output
evidence.md with command, result, evidence location, limitations, and verdict.

## Stop
Return to tasks or converge on failure. Async or visual behavior cannot pass
on unit tests alone.
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('evidence.md');
    if (!artifact) throw new Error('evidence.md not generated');
  },
});

// ──────────────────────────────────────────────
// learn - Classify and distill observations
// ──────────────────────────────────────────────
export const learnStage = defineStage({
  name: 'learn',
  description: 'Classify observations, never auto-promote to stable',
  contract: {
    requiredArtifacts: ['evidence.md'],
    producesArtifacts: ['learning-report.md'],
  },
  async execute(ctx) {
    return {
      stage: 'learn',
      artifactsWritten: ['learning-report.md'],
      nextStage: 'sync',
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# Stage: learn

## Input
Decisions, implementation deviations, convergence findings, verification
evidence, and current Harness knowledge.

## Action
Classify observations as project-only, candidate/pending, stable promotion
proposal, or rejected pattern. Never promote a single observation directly to stable.

## Output
learning-report.md with source Feature, evidence, scope, and proposed destination.

## Stop
Require manual review before changing stable Harness knowledge.
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('learning-report.md');
    if (!artifact) throw new Error('learning-report.md not generated');
  },
});

// ──────────────────────────────────────────────
// sync - Final sync and completion
// ──────────────────────────────────────────────
export const syncStage = defineStage({
  name: 'sync',
  description: 'Sync reviewed learning promotions and mark workflow completed',
  contract: {
    requiredArtifacts: ['learning-report.md'],
    producesArtifacts: ['sync-report.md'],
  },
  async execute(ctx) {
    return {
      stage: 'sync',
      artifactsWritten: ['sync-report.md'],
      nextStage: null,
      blockers: [],
      knowledgeSourcesUsed: ctx.knowledge.getLoadedSources(),
      prompt: `# Stage: sync

## Input
Verified Feature, reviewed learning promotions, and current sync rules.

## Action
Run target Status and Diff, review protected paths, then sync only explicitly
authorized targets and re-run Diff.

## Output
sync-report.md with targets, before/after differences, protected files,
command results, and skipped targets.

## Completion
After all authorized targets pass post-sync checks, mark the workflow
'completed' with next_stage: null.

## Stop
No authorization, dirty/ambiguous target, protected-path conflict, or
failed post-sync Diff. Never batch sync by implication.
`,
    };
  },
  async postExecute(ctx) {
    const artifact = await ctx.artifacts.read('sync-report.md');
    if (!artifact) throw new Error('sync-report.md not generated');
  },
});

// ──────────────────────────────────────────────
// Register all stages
// ──────────────────────────────────────────────
const allStages = [
  loadStage, grillStage, wayfindStage, specStage, scopeStage, planStage,
  tasksStage, implementStage, convergeStage, verifyStage, learnStage, syncStage,
];

for (const stage of allStages) {
  stageRegistry.register(stage);
}

export { stageRegistry };
