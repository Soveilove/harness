import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { FilesystemStorage, MemoryStorage } from '../dist/index.js';
import { WorkspaceManager } from '../dist/config/workspace.js';

async function makeProject(root, name, entries = [], redlines = []) {
  await mkdir(join(root, 'harness', 'project', 'knowledge'), { recursive: true });
  await mkdir(join(root, 'harness', 'project', 'governance'), { recursive: true });
  await writeFile(join(root, 'harness', 'project', 'project.config.json'), JSON.stringify({ project: { name } }), 'utf8');
  await writeFile(join(root, 'harness', 'project', 'knowledge', 'rule.json'), JSON.stringify(entries), 'utf8');
  await writeFile(join(root, 'harness', 'project', 'governance', 'redlines.json'), JSON.stringify(redlines), 'utf8');
}

function knowledge(overrides) {
  const now = new Date().toISOString();
  const lifecycle = overrides.lifecycle ?? 'candidate';
  const evidenceCount = lifecycle === 'stable' ? 3 : lifecycle === 'pending' ? 2 : 1;
  return {
    id: 'rule-example',
    type: 'rule',
    title: 'Example',
    content: 'example',
    lifecycle,
    evidence: Array.from({ length: evidenceCount }, (_, index) => ({
      feature: `feature-${index + 1}`,
      date: now,
      description: 'Observed',
      verified: false,
    })),
    tags: [],
    scope: 'project',
    createdAt: now,
    updatedAt: now,
    promotedAt: lifecycle === 'candidate' ? null : now,
    deprecatedReason: null,
    ...overrides,
  };
}

test('workspace registry rejects identity collisions and reads knowledge from registered hub path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-workspace-'));
  try {
    const hub = join(root, 'hub');
    const satellite = join(root, 'satellite');
    const other = join(root, 'other');
    const stable = knowledge({ id: 'rule-stable', title: 'Stable', content: 'hub truth', lifecycle: 'stable' });
    const now = new Date().toISOString();
    const redline = { id: 'AUTH_REQUIRED', title: 'Authentication', rule: 'Authentication is required', enforcement: 'absolute', active: true, createdAt: now, updatedAt: now };
    await makeProject(hub, 'same-project', [stable], [redline]);
    await makeProject(satellite, 'same-project');
    await makeProject(other, 'other-project');

    const registryStorage = new MemoryStorage();
    const manager = new WorkspaceManager(registryStorage);
    await manager.register({ id: 'main', name: 'Main', path: hub, role: 'hub' });
    await manager.register({ id: 'work', name: 'Work', path: satellite, role: 'satellite' });
    await assert.rejects(
      manager.register({ id: 'work', name: 'Duplicate', path: other, role: 'satellite' }),
      /expected 'same-project'|ID already registered/,
    );
    await assert.rejects(
      manager.register({ id: 'other', name: 'Other', path: other, role: 'satellite' }),
      /expected 'same-project'/,
    );

    const result = await manager.syncToSatellite('work', new FilesystemStorage(satellite));
    assert.equal(result.synced, 1);
    const synced = JSON.parse(await readFile(join(satellite, 'harness', 'project', 'knowledge', 'rule.json'), 'utf8'));
    assert.equal(synced[0].content, 'hub truth');
    const syncedRedlines = JSON.parse(await readFile(join(satellite, 'harness', 'project', 'governance', 'redlines.json'), 'utf8'));
    assert.equal(syncedRedlines[0].id, 'AUTH_REQUIRED');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('workspace sync stops before writing when a local candidate collides with hub stable knowledge', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-workspace-conflict-'));
  try {
    const hub = join(root, 'hub');
    const satellite = join(root, 'satellite');
    await makeProject(hub, 'same-project', [knowledge({ id: 'same-id', lifecycle: 'stable', content: 'hub' })]);
    await makeProject(satellite, 'same-project', [knowledge({ id: 'same-id', lifecycle: 'candidate', content: 'local' })]);
    const manager = new WorkspaceManager(new MemoryStorage());
    await manager.register({ id: 'main', name: 'Main', path: hub, role: 'hub' });
    await manager.register({ id: 'work', name: 'Work', path: satellite, role: 'satellite' });
    await assert.rejects(manager.syncToSatellite('work', new FilesystemStorage(satellite)), /Knowledge conflict/);
    const unchanged = JSON.parse(await readFile(join(satellite, 'harness', 'project', 'knowledge', 'rule.json'), 'utf8'));
    assert.equal(unchanged[0].content, 'local');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
