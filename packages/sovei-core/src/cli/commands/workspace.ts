/**
 * Workspace Commands
 * register, list, info, sync, promote, unregister
 *
 * Multi-workspace scenario: same project checked out at multiple paths.
 * Hub owns stable knowledge; satellites own local Feature state.
 */

import type { Command } from 'commander';
import { container, TOKENS } from '../../providers/container.js';
import { WorkspaceManager } from '../../config/workspace.js';
import { FilesystemStorage } from '../../storage/filesystem.js';
import type { StorageBackend } from '../../storage/types.js';
import type { Logger } from '../../providers/tokens.js';

function getStorage(): StorageBackend {
  return container.inject<StorageBackend>(TOKENS.Storage);
}
function getLogger(): Logger {
  return container.inject<Logger>(TOKENS.Logger);
}
function getWorkspaceManager(): WorkspaceManager {
  return new WorkspaceManager(getStorage());
}

export function registerWorkspaceCommands(program: Command): void {
  const ws = program.command('workspace').description('Multi-workspace management');

  // ── register ──
  ws
    .command('register')
    .argument('<path>', 'Workspace filesystem path')
    .option('--id <id>', 'Short identifier (e.g. main, exp, ci)')
    .option('--name <name>', 'Human-readable name')
    .option('--branch <branch>', 'Git branch')
    .option('--hub', 'Mark as the hub workspace (owns stable knowledge)')
    .action(async (targetPath: string, opts: { id?: string; name?: string; branch?: string; hub?: boolean }) => {
      const mgr = getWorkspaceManager();
      const id = opts.id || targetPath.split(/[\\/]/).pop() || 'workspace';
      const name = opts.name || id;

      const entry = await mgr.register({
        id,
        name,
        path: targetPath,
        branch: opts.branch,
        role: opts.hub ? 'hub' : 'satellite',
      });

      const logger = getLogger();
      logger.info('Registered workspace: ' + id + ' (' + entry.role + ')');
      console.log('');
      console.log('  ID:           ' + entry.id);
      console.log('  Name:         ' + entry.name);
      console.log('  Path:         ' + entry.path);
      console.log('  Branch:       ' + (entry.branch || '—'));
      console.log('  Role:         ' + entry.role);
      console.log('  Registered:   ' + entry.registeredAt);
      if (entry.role === 'hub') {
        console.log('');
        console.log('  This workspace owns stable knowledge.');
        console.log('  Other workspaces will sync FROM here.');
      } else {
        console.log('');
        console.log('  Use "sovei workspace sync ' + id + '" to pull stable knowledge from hub.');
      }
      console.log('');
    });

  // ── list ──
  ws
    .command('list')
    .description('List all registered workspaces')
    .action(async () => {
      const mgr = getWorkspaceManager();
      const workspaces = await mgr.list();
      if (workspaces.length === 0) {
        console.log('\n  No workspaces registered. Use "sovei workspace register <path>" to add one.\n');
        return;
      }
      console.log('\n  Registered Workspaces:');
      console.log('  ────────────────────────────────────────────');
      for (const w of workspaces) {
        const roleIcon = w.role === 'hub' ? '★' : '○';
        console.log('  ' + roleIcon + ' ' + w.id.padEnd(12) + ' ' + w.name);
        console.log('    path: ' + w.path);
        console.log('    branch: ' + (w.branch || '—') + '  |  synced: ' + (w.lastSyncedAt || 'never'));
        console.log('');
      }
    });

  // ── sync ──
  ws
    .command('sync')
    .argument('<id>', 'Satellite workspace ID')
    .description('Sync stable knowledge from hub to satellite')
    .action(async (id: string) => {
      const mgr = getWorkspaceManager();
      const workspaces = await mgr.list();
      const satellite = workspaces.find((w) => w.id === id);
      if (!satellite) {
        console.error('\n  ✗ Workspace not found: ' + id + '\n');
        process.exitCode = 1;
        return;
      }

      // Create storage for satellite
      const satStorage = new FilesystemStorage(satellite.path);
      const result = await mgr.syncToSatellite(id, satStorage);

      console.log('\n  ✓ Synced to ' + id + ':');
      console.log('    Stable knowledge synced: ' + result.synced);
      console.log('    Non-stable skipped:      ' + result.skipped);
      console.log('');
      console.log('  Satellite now has hub stable knowledge + its own local candidates.\n');
    });

  // ── promote ──
  ws
    .command('promote')
    .argument('<id>', 'Satellite workspace ID')
    .description('Push candidate knowledge from satellite to hub for review')
    .action(async (id: string) => {
      const mgr = getWorkspaceManager();
      const workspaces = await mgr.list();
      const satellite = workspaces.find((w) => w.id === id);
      if (!satellite) {
        console.error('\n  ✗ Workspace not found: ' + id + '\n');
        process.exitCode = 1;
        return;
      }

      const satStorage = new FilesystemStorage(satellite.path);
      const result = await mgr.promoteToHub(id, satStorage);

      console.log('\n  ✓ Promoted to hub from ' + id + ':');
      console.log('    Candidate entries pushed: ' + result.promoted);
      console.log('');
      console.log('  Review in hub with: sovei knowledge list --lifecycle candidate');
      console.log('  Promote to pending:  sovei knowledge promote <id>\n');
    });

  // ── unregister ──
  ws
    .command('unregister')
    .argument('<id>', 'Workspace ID')
    .description('Unregister a satellite workspace')
    .action(async (id: string) => {
      const mgr = getWorkspaceManager();
      await mgr.unregister(id);
      console.log('\n  ✓ Unregistered: ' + id + '\n');
    });
}
