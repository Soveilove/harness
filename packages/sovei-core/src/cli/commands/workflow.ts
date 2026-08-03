/**
 * Workflow Commands
 * 12 stage commands + bootstrap + reopen + status + list-stages
 * Each stage executes exactly one step and reports the next command.
 */

import type { Command } from 'commander';
import { container, TOKENS } from '../../providers/container.js';
import { WorkflowEngine } from '../../engine/workflow-engine.js';
import { stageRegistry } from '../../stages/registry.js';

// Import side-effect: registers all stages
import '../../stages/index.js';
import { ChangeDimension, type ChangeDimension as ChangeDimensionType } from '../../change-control/schemas.js';

const STAGE_NAMES = [
  'load', 'grill', 'wayfind', 'spec', 'scope', 'plan',
  'tasks', 'implement', 'converge', 'verify', 'learn', 'sync',
];

function getEngine(): WorkflowEngine {
  return container.inject<WorkflowEngine>(TOKENS.WorkflowEngine);
}

function printState(state: any): void {
  console.log('');
  console.log('  ┌──────────────────────────────────────┐');
  console.log('  │  Sovei Workflow Status                │');
  console.log('  └──────────────────────────────────────┘');
  console.log('  Feature:      ' + state.featureId);
  console.log('  Status:       ' + state.status);
  console.log('  Revision:     ' + state.revision);
  console.log('  Risk Level:   ' + state.riskLevel);
  console.log('  Completed:    [' + state.completedStages.join(', ') + ']');
  console.log('  Current:      ' + (state.currentStage || '—'));
  console.log('  Next:         ' + (state.nextStage || '—'));
  if (state.reopenedStages.length > 0) {
  console.log('  Reopened:     [' + state.reopenedStages.join(', ') + ']');
  }
  if (state.completedTaskIds?.length > 0) {
    console.log('  Tasks done:   [' + state.completedTaskIds.join(', ') + ']');
  }
  if (state.activeChangeId) {
    console.log('  Active change: ' + state.activeChangeId);
  }
  if (state.blockers.length > 0) {
    console.log('  Blockers:     ' + state.blockers.join('; '));
  }
  console.log('  Updated:      ' + state.updatedAt);
  console.log('');
}

function printNextCommand(state: any, feature: string): void {
  if (state.currentStage && state.status !== 'completed') {
    console.log('  Next command:  sovei workflow ' + state.currentStage + ' ' + feature + '\n');
  } else if (state.status === 'completed') {
    console.log('  ✓ Workflow completed.\n');
  }
}

export function registerWorkflowCommands(program: Command): void {
  const workflow = program.command('workflow').description('Workflow stage commands');

  // ── bootstrap ──
  workflow
    .command('bootstrap')
    .argument('<feature>', 'Feature ID to create')
    .description('Create a new feature with initial workflow state')
    .action(async (feature: string) => {
      const engine = getEngine();
      const state = await engine.bootstrap(feature);
      console.log('\n  ✓ Bootstrapped feature: ' + feature + '\n');
      printState(state);
      printNextCommand(state, feature);
    });

  // ── status ──
  workflow
    .command('status')
    .argument('<feature>', 'Feature ID (e.g. 001-my-feature)')
    .action(async (feature: string) => {
      const engine = getEngine();
      const state = await engine.getState(feature);
      printState(state);
      printNextCommand(state, feature);
    });

  // ── All 12 stages ──
  for (const stageName of STAGE_NAMES) {
    const stage = stageRegistry.get(stageName);
    workflow
      .command(stageName)
      .argument('<feature>', 'Feature ID')
      .option('--complete', 'Validate artifacts and complete the stage')
      .option('--task <id>', 'Selected task ID for the implement stage')
      .description(stage.description)
      .action(async (feature: string, opts: { complete?: boolean; task?: string }) => {
        const engine = getEngine();
        if (stageName !== 'implement' && opts.task) {
          throw new Error('--task is only valid for the implement stage');
        }
        if (opts.complete) {
          const state = stageName === 'implement' && opts.task
            ? await engine.completeTask(feature, opts.task)
            : await engine.completeStage(feature, stageName);
          const message = stageName === 'implement' && opts.task
            ? `Task '${opts.task}' completed; implement stage remains active.`
            : `Stage '${stageName}' completed.`;
          console.log('\n  ✓ ' + message + '\n');
          printState(state);
          printNextCommand(state, feature);
          return;
        }
        if (stageName === 'implement' && !opts.task) {
          throw new Error("implement preparation requires --task <id>");
        }
        const result = await engine.prepareStage(feature, stageName);
        console.log('\n  Prepared stage \'' + stageName + '\'. No workflow state was advanced.\n');
        if (opts.task) console.log('  Selected task: ' + opts.task + '\n');
        if (result.artifactsWritten.length > 0) {
          console.log('  Artifacts written:');
          for (const a of result.artifactsWritten) {
            console.log('    · ' + a);
          }
        }
        if (result.prompt) {
          console.log('');
          console.log('  ── Prompt Contract ──');
          console.log(result.prompt);
        }
        const state = await engine.getState(feature);
        printState(state);
        console.log('  Complete with: sovei workflow ' + stageName + ' ' + feature + ' --complete' + (opts.task ? ' --task ' + opts.task : '') + '\n');
      });
  }

  // ── reopen ──
  workflow
    .command('reopen')
    .argument('<feature>', 'Feature ID')
    .requiredOption('--target <stage>', 'Stage to reopen')
    .requiredOption('--reason <reason>', 'Reason for reopening')
    .action(async (feature: string, opts: { target: string; reason: string }) => {
      const engine = getEngine();
      const state = await engine.reopen(feature, opts.target, opts.reason);
      console.log('\n  ↻ Reopened \'' + opts.target + '\' (revision ' + state.revision + ')\n');
      printState(state);
      printNextCommand(state, feature);
    });

  workflow
    .command('change')
    .argument('<feature>', 'Feature ID')
    .requiredOption('--target <stage>', 'Earliest stage invalidated by the material change')
    .requiredOption('--summary <summary>', 'Concise description of the new direction')
    .requiredOption('--reason <reason>', 'Why the previous requirements are no longer valid')
    .requiredOption('--dimensions <dimensions>', 'Comma-separated material change dimensions')
    .description('Create a draft material-change request and redline review matrix')
    .action(async (feature: string, opts: { target: string; summary: string; reason: string; dimensions: string }) => {
      const dimensions = opts.dimensions.split(',').map((value) => ChangeDimension.parse(value.trim())) as ChangeDimensionType[];
      const request = await getEngine().prepareChange(feature, opts.target, opts.summary, opts.reason, dimensions);
      console.log(`\n  Draft change request: ${request.id}`);
      console.log(`  File: specs/${feature}/change-requests/${request.id}.json`);
      console.log('  Fill affectedSurfaces, authorization fields, supersedes, and every redline assessment before applying.');
      console.log(`  Apply: sovei workflow apply-change ${feature} ${request.id}\n`);
    });

  workflow
    .command('apply-change')
    .argument('<feature>', 'Feature ID')
    .argument('<change-id>', 'Reviewed Change Request ID')
    .description('Apply a reviewed change, archive stale artifacts, and reopen its target stage')
    .action(async (feature: string, changeId: string) => {
      const state = await getEngine().applyChange(feature, changeId);
      console.log(`\n  Applied change '${changeId}'. Superseded artifacts were archived.\n`);
      printState(state);
      printNextCommand(state, feature);
    });

  workflow
    .command('cancel-change')
    .argument('<feature>', 'Feature ID')
    .argument('<change-id>', 'Draft Change Request ID')
    .requiredOption('--reason <reason>', 'Why this material change is no longer being pursued')
    .description('Cancel a draft material change and unfreeze the ordinary workflow')
    .action(async (feature: string, changeId: string, options: { reason: string }) => {
      await getEngine().cancelChange(feature, changeId, options.reason);
      console.log(`\n  Cancelled change '${changeId}'. Ordinary workflow commands are available again.\n`);
    });

  // ── list-stages ──
  workflow
    .command('list-stages')
    .description('List all registered workflow stages')
    .action(() => {
      console.log('\n  Sovei Workflow Stages:');
      console.log('  ────────────────────────────────────────────');
      for (const name of STAGE_NAMES) {
        const stage = stageRegistry.get(name);
        const req = stage.contract.requiredArtifacts.length > 0
          ? 'requires: ' + stage.contract.requiredArtifacts.join(', ')
          : 'requires: (none)';
        const prod = stage.contract.producesArtifacts.length > 0
          ? 'produces: ' + stage.contract.producesArtifacts.join(', ')
          : 'produces: (none)';
        console.log('  ' + name.padEnd(12) + ' ' + stage.description);
        console.log('  ' + ' '.repeat(12) + ' ' + req);
        console.log('  ' + ' '.repeat(12) + ' ' + prod);
        console.log('');
      }
    });
}
