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
      .description(stage.description)
      .action(async (feature: string) => {
        const engine = getEngine();
        const result = await engine.executeStage(feature, stageName);
        console.log('\n  ✓ Stage \'' + stageName + '\' completed.\n');
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
        printNextCommand(state, feature);
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
