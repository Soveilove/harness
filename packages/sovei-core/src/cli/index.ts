#!/usr/bin/env node

import { Command } from 'commander';
import { registerArchitectureCommands } from './commands/architecture.js';
import { registerKnowledgeCommands } from './commands/knowledge.js';
import { registerProjectCommands } from './commands/project.js';
import { registerWorkflowCommands } from './commands/workflow.js';
import { registerWorkspaceCommands } from './commands/workspace.js';
import { registerGovernanceCommands } from './commands/governance.js';
import { registerWayfinderCommands } from './commands/wayfinder.js';
import { bootstrap } from '../providers/bootstrap.js';

const program = new Command();

program
  .name('sovei')
  .description('Sovei Workflow Engine - Portable development SOP')
  .version('2.1.0')
  .option('--root <path>', 'Workspace root path', process.cwd());

program.hook('preAction', (command) => {
  bootstrap(command.optsWithGlobals().root as string);
});

registerWorkflowCommands(program);
registerKnowledgeCommands(program);
registerProjectCommands(program);
registerWorkspaceCommands(program);
registerGovernanceCommands(program);
registerWayfinderCommands(program);
registerArchitectureCommands(program);

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n  Error: ${message}\n`);
  process.exitCode = 1;
});
