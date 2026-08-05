import type { Command } from 'commander';
import { ChangeControlRepository } from '../../change-control/repository.js';
import type { RedlinePatch } from '../../change-control/schemas.js';
import { container, TOKENS } from '../../providers/container.js';
import type { StorageBackend } from '../../storage/types.js';
import { resolve } from 'node:path';

function repository(): ChangeControlRepository {
  return new ChangeControlRepository(container.inject<StorageBackend>(TOKENS.Storage));
}

function collectExample(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

export function registerGovernanceCommands(program: Command): void {
  const governance = program.command('governance').description('业务红线治理');
  const redline = governance.command('redline').description('管理项目业务红线');

  redline
   .command('add')
   .description('添加业务红线')
   .argument('<id>', 'Stable uppercase ID, e.g. BILLING_NO_RENEWAL')
    .requiredOption('--title <title>', 'Short redline title')
    .requiredOption('--rule <rule>', 'Business rule that changes must preserve')
    .option('--enforcement <level>', 'absolute | approval-required', 'absolute')
    .option('--rationale <text>', 'Why this redline exists (business context for human review)')
    .option('--scope <text>', 'Where this redline applies')
    .option('--example <text>', 'Typical violation example (repeatable)', collectExample, [] as string[])
    .option('--owner <name>', 'Person accountable for this redline')
    .action(async (id: string, options: {
      title: string; rule: string; enforcement: 'absolute' | 'approval-required';
      rationale?: string; scope?: string; example: string[]; owner?: string;
    }) => {
      const entry = await repository().addRedline({
        id: id.toUpperCase(),
        title: options.title,
        rule: options.rule,
        enforcement: options.enforcement,
        rationale: options.rationale,
        scope: options.scope,
        examples: options.example.length ? options.example : undefined,
        owner: options.owner,
        origin: 'manual',
      });
      console.log(`\n  Added redline ${entry.id} [${entry.enforcement}]`);
      console.log('  人工审查视图已刷新：harness/project/governance/redlines.md\n');
    });

  redline
   .command('list')
   .description('列出业务红线')
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
      console.log('\n  人工审查视图：harness/project/governance/redlines.md（sovei governance redline render 重新生成）\n');
    });

  redline
    .command('deactivate')
    .argument('<id>', 'Redline ID')
    .requiredOption('--reason <reason>', 'Why this business redline is no longer active')
    .description('停用红线并保留审计历史')
    .action(async (id: string, options: { reason: string }) => {
      const entry = await repository().deactivateRedline(id.toUpperCase(), options.reason);
      console.log(`\n  Deactivated redline ${entry.id}.`);
      console.log('  人工审查视图已刷新：harness/project/governance/redlines.md\n');
    })

  redline
    .command('update')
    .argument('<id>', 'Redline ID')
    .description('更新红线内容或人工审查字段')
    .option('--title <title>', 'Short redline title')
    .option('--rule <rule>', 'Business rule that changes must preserve')
    .option('--enforcement <level>', 'absolute | approval-required')
    .option('--rationale <text>', 'Why this redline exists (business context for human review)')
    .option('--scope <text>', 'Where this redline applies')
    .option('--example <text>', 'Typical violation example (repeatable)', collectExample, [] as string[])
    .option('--owner <name>', 'Person accountable for this redline')
    .option('--reviewer <name>', 'Record a human review by this person')
    .action(async (id: string, options: {
      title?: string; rule?: string; enforcement?: 'absolute' | 'approval-required';
      rationale?: string; scope?: string; example: string[]; owner?: string; reviewer?: string;
    }) => {
      const patch: RedlinePatch = {};
      if (options.title !== undefined) patch.title = options.title;
      if (options.rule !== undefined) patch.rule = options.rule;
      if (options.enforcement !== undefined) patch.enforcement = options.enforcement;
      if (options.rationale !== undefined) patch.rationale = options.rationale;
      if (options.scope !== undefined) patch.scope = options.scope;
      if (options.example.length) patch.examples = options.example;
      if (options.owner !== undefined) patch.owner = options.owner;
      if (options.reviewer !== undefined) {
        patch.reviewedBy = options.reviewer;
        patch.reviewedAt = new Date().toISOString();
      }
      const entry = await repository().updateRedline(id.toUpperCase(), patch);
      console.log(`\n  Updated redline ${entry.id}.`);
      console.log('  人工审查视图已刷新：harness/project/governance/redlines.md\n');
    });

  redline
    .command('render')
    .description('重新生成人工审查视图 harness/project/governance/redlines.md')
    .action(async () => {
      const viewPath = await repository().refreshRedlinesView();
      console.log(`\n  已生成人工审查视图：${viewPath}\n`);
    });

  redline
    .command('import')
    .argument('<file>', 'JSON file with redline definitions')
    .description('从 JSON 文件批量导入红线')
    .action(async (file: string) => {
      const resolvedFile = resolve(file);
      const content = await import('node:fs/promises').then((m) => m.readFile(resolvedFile, 'utf8'));
      let items: Array<{
        id: string; title: string; rule: string; enforcement?: string;
        rationale?: string; scope?: string; examples?: string[]; owner?: string;
      }>;
      let fromSeed = false;
      try {
        const parsed = JSON.parse(content);
        // Support both raw array and versioned seed object { redlines: [...] }
        items = Array.isArray(parsed) ? parsed : (parsed?.redlines ?? []);
        fromSeed = !Array.isArray(parsed);
      } catch {
        throw new Error('Invalid JSON in ' + file);
      }
      if (!Array.isArray(items)) {
        throw new Error('Expected a JSON array or a seed object with a redlines array');
      }
      const repo = repository();
      let added = 0;
      let skipped = 0;
      const failed: string[] = [];
      for (const item of items) {
        try {
          await repo.addRedline({
            id: item.id.toUpperCase(),
            title: item.title,
            rule: item.rule,
            enforcement: (item.enforcement as 'absolute' | 'approval-required') || 'absolute',
            rationale: item.rationale,
            scope: item.scope,
            examples: item.examples,
            owner: item.owner,
            origin: fromSeed ? 'scanner-seed' : 'manual',
          }, { refreshView: false });
          added++;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (/already exists/i.test(message)) {
            skipped++;
          } else {
            failed.push(`${item.id ?? '<无 id>'}: ${message}`);
          }
        }
      }
      await repo.refreshRedlinesView();
      for (const failure of failed) console.error(`  ✗ ${failure}`);
      console.log(`\n  已导入 ${added} 条红线，跳过 ${skipped} 条重复${failed.length ? '，失败 ' + failed.length + ' 条' : ''}。\n`);
      if (failed.length) process.exitCode = 1;
    });
;
}
