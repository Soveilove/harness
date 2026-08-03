import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { FilesystemStorage, MemoryStorage, KnowledgeStore, ChangeControlRepository, buildContextPack, buildSnapshot, saveSnapshot, loadSnapshot, isStale } from '../dist/index.js';

const baseEntry = {
  type: 'rule', title: 'Test', content: 'content',
  lifecycle: 'stable', evidence: [{ feature: 'test', date: '2026-01-01', description: 'e1', verified: true }, { feature: 'test', date: '2026-01-02', description: 'e2', verified: true }, { feature: 'test', date: '2026-01-03', description: 'e3', verified: true }], tags: [], scope: 'project',
  createdAt: '2026-01-01', updatedAt: '2026-01-01', promotedAt: null, deprecatedReason: null,
};

test('context pack puts active redlines in required and candidates in suggested', async () => {
  const storage = new MemoryStorage();
  const knowledgeStore = new KnowledgeStore(storage, 'harness/project/knowledge');
  await knowledgeStore.load();
  knowledgeStore.dispatch({ type: 'ADD', entry: { ...baseEntry, id: 'rule-stable-001', title: 'Stable rule', content: 'Never skip auth' } });
  knowledgeStore.dispatch({ type: 'ADD', entry: { ...baseEntry, id: 'pitfall-c-001', type: 'pitfall', title: 'Candidate pitfall', content: 'Watch out for X', lifecycle: 'candidate' } });

  const repo = new ChangeControlRepository(storage);
  await repo.addRedline({ id: 'AUTH_REQUIRED', title: 'Auth', rule: 'All routes need auth', enforcement: 'absolute' });

  const pack = buildContextPack({
    feature: 'test-feature', stage: 'implement', redlines: await repo.loadRedlines(),
    knowledge: knowledgeStore.selectAll(), artifacts: [], snapshot: null,
  });

  assert.ok(pack.required.some((item) => item.id === 'AUTH_REQUIRED'));
  assert.ok(pack.required.some((item) => item.id === 'rule-stable-001'));
  assert.ok(!pack.suggested.some((item) => item.id === 'AUTH_REQUIRED'));
  assert.ok(pack.suggested.some((item) => item.id === 'pitfall-c-001'));
  assert.ok(!pack.required.some((item) => item.id === 'pitfall-c-001'));
});

test('snapshot detects stale knowledge after content change', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-snap-'));
  try {
    const storage = new FilesystemStorage(root);
    await mkdir(join(root, 'harness', 'project', 'knowledge'), { recursive: true });
    const knowledgeStore = new KnowledgeStore(storage, 'harness/project/knowledge');
    await knowledgeStore.load();
    knowledgeStore.dispatch({ type: 'ADD', entry: { ...baseEntry, id: 'rule-test-001', content: 'Original content' } });
    await knowledgeStore.persist();

    const snapshot = buildSnapshot(knowledgeStore.selectAll(), 'test-project', { engineVersion: 'test', scannerVersion: 'test' });
    await saveSnapshot(storage, snapshot);
    assert.equal(isStale(knowledgeStore.selectAll(), await loadSnapshot(storage)), false);

    knowledgeStore.dispatch({ type: 'UPDATE', id: 'rule-test-001', patch: { content: 'Changed content', updatedAt: '2026-02-01' } });
    await knowledgeStore.persist();
    await knowledgeStore.load();
    assert.equal(isStale(knowledgeStore.selectAll(), await loadSnapshot(storage)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('context status works without a saved snapshot', async () => {
  const storage = new MemoryStorage();
  const knowledgeStore = new KnowledgeStore(storage, 'harness/project/knowledge');
  await knowledgeStore.load();
  assert.equal(isStale(knowledgeStore.selectAll(), null), true);
});
