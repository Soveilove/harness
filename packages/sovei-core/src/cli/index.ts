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
import { checkVersionUpdate } from './version-check.js';
import { bootstrap } from '../providers/bootstrap.js';

const pkgRequire = createRequire(import.meta.url);
const packageJson = pkgRequire('../../package.json') as { version: string };
const program = new Command();

program
  .name('sovei')
  .description('Sovei 工作流引擎 - 可移植开发 SOP')
  .version(packageJson.version)
  .option('--root <path>', 'Workspace root path', process.cwd());

// N6: 版本更新提示——在 preAction 启动检查（非阻塞），在 postAction 等待并输出到 stderr。
// 跳过条件：--version / --help / 环境变量 SOVEI_NO_UPDATE_CHECK=1。
let versionCheckPromise: Promise<void> | null = null;

function shouldSkipVersionCheck(): boolean {
  if (process.env.SOVEI_NO_UPDATE_CHECK === '1') return true;
  const args = process.argv.slice(2);
  return args.includes('--version') || args.includes('-V') ||
    args.includes('--help') || args.includes('-h');
}

program.hook('preAction', (command) => {
  bootstrap(command.optsWithGlobals().root as string);
  if (!shouldSkipVersionCheck()) {
    versionCheckPromise = checkVersionUpdate(packageJson.version)
      .then((notification) => {
        if (notification) {
          process.stderr.write(notification.message);
        }
      })
      .catch(() => {
        // 版本检查失败静默跳过，绝不阻断命令
      });
  }
});

program.hook('postAction', async () => {
  // 等待版本检查完成（通常已被命令执行期间完成，await 瞬时返回）
  if (versionCheckPromise) {
    await versionCheckPromise;
  }
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
