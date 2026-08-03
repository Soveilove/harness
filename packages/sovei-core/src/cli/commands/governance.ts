import type { Command } from 'commander';
import { ChangeControlRepository } from '../../change-control/repository.js';
import { container, TOKENS } from '../../providers/container.js';
import type { StorageBackend } from '../../storage/types.js';

function repository(): ChangeControlRepository {
  return new ChangeControlRepository(container.inject<StorageBackend>(TOKENS.Storage));
}

export function registerGovernanceCommands(program: Command): void {
  const governance = program.command('governance').description('Business redline governance');
  const redline = governance.command('redline').description('Manage project business redlines');

  redline
    .command('add')
    .argument('<id>', 'Stable uppercase ID, e.g. BILLING_NO_RENEWAL')
    .requiredOption('--title <title>', 'Short redline title')
    .requiredOption('--rule <rule>', 'Business rule that changes must preserve')
    .option('--enforcement <level>', 'absolute | approval-required', 'absolute')
    .action(async (id: string, options: { title: string; rule: string; enforcement: 'absolute' | 'approval-required' }) => {
      const entry = await repository().addRedline({
        id: id.toUpperCase(),
        title: options.title,
        rule: options.rule,
        enforcement: options.enforcement,
      });
      console.log(`\n  Added redline ${entry.id} [${entry.enforcement}]\n`);
    });

  redline
    .command('list')
    .option('--all', 'Include inactive redlines')
    .action(async (options: { all?: boolean }) => {
      const entries = await repository().loadRedlines();
      const visible = options.all ? entries : entries.filter((entry) => entry.active);
      if (!visible.length) {
        console.log('\n  No active business redlines.\n');
        return;
      }
      console.log('\n  Business Redlines\n');
      for (const entry of visible) {
        console.log(`  ${entry.id} [${entry.enforcement}] ${entry.title}`);
        console.log(`    ${entry.rule}`);
      }
      console.log('');
    });

  redline
    .command('deactivate')
    .argument('<id>', 'Redline ID')
    .requiredOption('--reason <reason>', 'Why this business redline is no longer active')
    .description('Deactivate a redline while preserving its audit history')
    .action(async (id: string, options: { reason: string }) => {
      const entry = await repository().deactivateRedline(id.toUpperCase(), options.reason);
      console.log(`\n  Deactivated redline ${entry.id}.\n`);
    });
}
