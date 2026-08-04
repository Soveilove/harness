/**
 * Knowledge Commands
 * list, add, promote, deprecate, query, stats
 */

import { type Command, Option } from 'commander';
import { createHash } from 'node:crypto';
import { container, TOKENS } from '../../providers/container.js';
import type { StorageBackend } from '../../storage/types.js';
import type { KnowledgeStore } from '../../knowledge/store.js';
import { KnowledgeType, Lifecycle, type KnowledgeEntry } from '../../knowledge/schemas.js';
import { getStats, searchEntries, groupByType } from '../../knowledge/selectors.js';
import { validatePromotion, nextLifecycle } from '../../knowledge/lifecycle.js';

function getStore(): KnowledgeStore {
  return container.inject<KnowledgeStore>(TOKENS.KnowledgeStore);
}

function generateId(type: string, title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const hash = createHash('sha1').update(`${type}\0${title}`).digest('hex').slice(0, 8);
  return `${type}-${slug}-${hash}`;
}

export function registerKnowledgeCommands(program: Command): void {
  const knowledge = program.command('knowledge').description('Knowledge management commands');

  // ── list ──
  knowledge
    .command('list')
    .option('--type <type>', 'Filter by knowledge type')
    .option('--lifecycle <lifecycle>', 'Filter by lifecycle status')
    .option('--tags <tags>', 'Filter by tags (comma-separated)')
    .action(async (opts: { type?: string; lifecycle?: string; tags?: string }) => {
      const store = getStore();
      await store.load();
      let entries = store.selectAll();

      if (opts.type) {
        entries = entries.filter((e) => e.type === opts.type);
      }
      if (opts.lifecycle) {
        entries = entries.filter((e) => e.lifecycle === opts.lifecycle);
      }
      if (opts.tags) {
        const tags = opts.tags.split(',').map((t) => t.trim());
        entries = entries.filter((e) => e.tags.some((t) => tags.includes(t)));
      }

      if (entries.length === 0) {
        console.log('\n  No knowledge entries found.\n');
        return;
      }

      console.log(`\n  Knowledge entries (${entries.length}):\n`);
      for (const entry of entries) {
        const lifecycleIcon = {
          candidate: '?',
          pending: '~',
          stable: '✓',
          deprecated: '✗',
        }[entry.lifecycle];
        console.log(`  ${lifecycleIcon} [${entry.type}] ${entry.title}`);
        console.log(`    id: ${entry.id}  |  evidence: ${entry.evidence.length}  |  tags: ${entry.tags.join(', ')}`);
        console.log('');
      }
    });

  // ── add ──
  knowledge
    .command('add')
    .addOption(new Option('--type <type>', 'Knowledge type').choices(KnowledgeType.options).makeOptionMandatory())
    .requiredOption('--title <title>', 'Entry title')
    .requiredOption('--content <content>', 'Entry content (markdown)')
    .option('--tags <tags>', 'Tags (comma-separated)')
    .requiredOption('--feature <feature>', 'Source feature ID or observation source')
    .action(async (opts: { type: string; title: string; content: string; tags?: string; feature?: string }) => {
      const store = getStore();
      const storage = container.inject<StorageBackend>(TOKENS.Storage);
      await storage.withLock('harness/project/knowledge', async () => {
        await store.load();

        const type = KnowledgeType.parse(opts.type);
        const id = generateId(type, opts.title);
        const now = new Date().toISOString();
        const entry: KnowledgeEntry = {
          id,
          type,
          title: opts.title,
          content: opts.content,
          lifecycle: 'candidate',
          evidence: [{ feature: opts.feature!, date: now, description: 'Initial observation', verified: false }],
          tags: opts.tags ? opts.tags.split(',').map((t) => t.trim()) : [],
          scope: 'project',
          createdAt: now,
          updatedAt: now,
          promotedAt: null,
          deprecatedReason: null,
        };

        store.dispatch({ type: 'ADD', entry });
        await store.persist();
        console.log(`\n  ✓ Added knowledge entry: ${id}\n`);
      });
    });

  // ── promote ──
  knowledge
    .command('promote')
    .argument('<id>', 'Entry ID')
    .addOption(new Option('--to <lifecycle>', 'Target lifecycle (pending/stable)').choices(Lifecycle.options))
    .option('--feature <feature>', 'Evidence source feature')
    .option('--description <description>', 'Evidence description')
    .action(async (id: string, opts: { to?: string; feature?: string; description?: string }) => {
      const store = getStore();
      const storage = container.inject<StorageBackend>(TOKENS.Storage);
      await storage.withLock('harness/project/knowledge', async () => {
        await store.load();
        const entry = store.selectById(id);
        if (!entry) {
          console.error(`\n  ✗ Entry not found: ${id}\n`);
          process.exitCode = 1;
          return;
        }

        const target = opts.to ? Lifecycle.parse(opts.to) : nextLifecycle(entry);
        if (!target) {
          console.error(`\n  ✗ Entry is already at max lifecycle: ${entry.lifecycle}\n`);
          process.exitCode = 1;
          return;
        }

        // Dry-run validation
        const validation = validatePromotion(
          entry,
          target,
          !!(opts.feature && opts.description),
        );
        if (!validation.valid) {
          console.error(`\n  ✗ Promotion blocked: ${validation.reason}\n`);
          process.exitCode = 1;
          return;
        }

        store.dispatch({
          type: 'PROMOTE',
          id,
          to: target,
          evidence: opts.feature && opts.description
            ? { feature: opts.feature, description: opts.description }
            : undefined,
        });
        await store.persist();
        console.log(`\n  ✓ Promoted '${entry.title}' to ${target}\n`);
      });
    });

  // ── deprecate ──
  knowledge
    .command('deprecate')
    .argument('<id>', 'Entry ID')
    .requiredOption('--reason <reason>', 'Deprecation reason')
    .action(async (id: string, opts: { reason: string }) => {
      const store = getStore();
      const storage = container.inject<StorageBackend>(TOKENS.Storage);
      await storage.withLock('harness/project/knowledge', async () => {
        await store.load();
        store.dispatch({ type: 'DEPRECATE', id, reason: opts.reason });
        await store.persist();
        console.log(`\n  ✗ Deprecated: ${id}\n`);
      });
    });

  // ── query ──
  knowledge
    .command('query')
    .argument('<query>', 'Search query')
    .action(async (query: string) => {
      const store = getStore();
      await store.load();
      const results = searchEntries(store.selectAll(), query);
      if (results.length === 0) {
        console.log(`\n  No results for '${query}'.\n`);
        return;
      }
      console.log(`\n  Search results for '${query}' (${results.length}):\n`);
      for (const entry of results) {
        console.log(`  · [${entry.type}] ${entry.title} (${entry.lifecycle})`);
        console.log(`    id: ${entry.id}`);
        console.log('');
      }
    });

  // ── stats ──
  knowledge
    .command('stats')
    .action(async () => {
      const store = getStore();
      await store.load();
      const stats = getStats(store.selectAll());
      console.log('\n  Knowledge Statistics:');
      console.log('  ────────────────────────');
      console.log(`  Total entries: ${stats.total}`);
      console.log('');
      console.log('  By type:');
      for (const [type, count] of Object.entries(stats.byType)) {
        console.log(`    ${type.padEnd(16)} ${count}`);
      }
      console.log('');
      console.log('  By lifecycle:');
      for (const [lifecycle, count] of Object.entries(stats.byLifecycle)) {
        console.log(`    ${lifecycle.padEnd(16)} ${count}`);
      }
      console.log('');
    });
}
