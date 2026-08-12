import assert from 'node:assert/strict';
import test from 'node:test';
import { KnowledgeStore, MemoryStorage } from '../dist/index.js';

function candidate(overrides = {}) {
  return {
    id: 'rule-example-12345678',
    type: 'rule',
    title: 'Example',
    content: 'A concrete project rule.',
    lifecycle: 'candidate',
    evidence: [{ feature: '001-test', date: new Date().toISOString(), description: 'Observed', verified: false }],
    tags: [],
    scope: 'project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    promotedAt: null,
    deprecatedReason: null,
    ...overrides,
  };
}

test('knowledge dispatch enforces schema, evidence, and unique IDs', () => {
  const store = new KnowledgeStore(new MemoryStorage());
  assert.throws(() => store.dispatch({ type: 'ADD', entry: candidate({ type: 'unknown' }) }), /Invalid enum value/);
  assert.throws(() => store.dispatch({ type: 'ADD', entry: candidate({ evidence: [] }) }), /requires at least 1 evidence/);
  store.dispatch({ type: 'ADD', entry: candidate() });
  assert.throws(() => store.dispatch({ type: 'ADD', entry: candidate() }), /already exists/);
});

test('knowledge load reports invalid persisted data instead of silently skipping it', async () => {
  const storage = new MemoryStorage();
  await storage.write('sovei-flow/project/knowledge/rule.json', '[{"id":"broken"}]');
  const store = new KnowledgeStore(storage);
  await assert.rejects(store.load(), /Invalid knowledge file/);
});
