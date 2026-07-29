#!/usr/bin/env node

/**
 * Sovei CLI - Main entry point
 * Commander.js-based CLI with three command groups:
 * 1. Workflow stages (load, grill, spec, ..., sync, reopen)
 * 2. Knowledge management (list, add, promote, query)
 * 3. Project management (init, status)
 */

import { Command } from 'commander';
import { bootstrap, container, TOKENS } from '../providers/bootstrap.js';
import { registerWorkflowCommands } from './commands/workflow.js';
import { registerKnowledgeCommands } from './commands/knowledge.js';
import { registerProjectCommands } from './commands/project.js';
import { registerWorkspaceCommands } from './commands/workspace.js';
import { ConsoleLogger } from '../providers/tokens.js';

const program = new Command();

program
  .name('sovei')
  .description('Sovei Workflow Engine - Portable development SOP')
  .version('2.0.0')
  .option('--root <path>', 'Workspace root path', process.cwd());

program.hook('preAction', (cmd) => {
  const rootPath = cmd.opts().root;
  bootstrap(rootPath);
});

// Register command groups
registerWorkflowCommands(program);
registerKnowledgeCommands(program);
registerProjectCommands(program);
registerWorkspaceCommands(program);

// Parse and execute
program.parseAsync(process.argv).catch((err) => {
  console.error(`\n  ✗  ${err.message}\n`);
  process.exitCode = 1;
});
