#!/usr/bin/env node

import { createRequire } from 'node:module';
import { Command } from 'commander';
import { registerArchitectureCommands } from './commands/architecture.js';
import { registerContextCommands } from './commands/context.js';
import { registerAgentCommands } from './commands/agent.js';
import { registerKnowledgeCommands } from './commands/knowledge.js';
import { registerProjectCommands } from './commands/project.js';
import { registerWorkflowCommands } from './commands/workflow.js';
import { registerWorkspaceCommands } from './commands/workspace.js';
import { registerGovernanceCommands } from './commands/governance.js';
import { registerWayfinderCommands } from './commands/wayfinder.js';
import { registerRulesCommands } from './commands/rules.js';
import { registerQuickCommands } from './commands/quick.js';
import { registerSkillsCommands } from './commands/skills.js';
import { registerAdapterCommands } from './commands/adapters.js';
import { registerFeatureCommands } from './commands/feature.js';
import { bootstrap } from '../providers/bootstrap.js';

const pkgRequire = createRequire(import.meta.url);
const packageJson = pkgRequire('../../package.json') as { version: string };
const program = new Command();

program
  .name('sovei')
  .description('Sovei 工作流引擎 - 可移植开发 SOP')
  .version(packageJson.version)
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
registerContextCommands(program);
registerAgentCommands(program);
registerRulesCommands(program);
registerQuickCommands(program);
registerSkillsCommands(program);
registerAdapterCommands(program);
registerFeatureCommands(program);

// commander v12 默认静默忽略多余位置参数(例如 `project onboard ./path` 的 path 被丢弃，
// 命令实际作用于 cwd),这在覆盖式命令上很危险。全局关闭,让多余参数直接报错。
function denyExcessArguments(cmd: Command): void {
  cmd.allowExcessArguments(false);
  for (const child of cmd.commands) denyExcessArguments(child);
}
denyExcessArguments(program);

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n  错误：${message}\n`);
  process.exitCode = 1;
});
